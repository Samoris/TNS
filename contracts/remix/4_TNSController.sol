// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// ENS ETHRegistrarController - Exact ENS Architecture
// Adapted for native TRUST token payments
// 
// DEPLOY ORDER: 4 of 7
// Constructor Parameters:
//   _base: TNSBaseRegistrar address
//   _prices: TNSPriceOracle address
//   _minCommitmentAge: 60 (seconds)
//   _maxCommitmentAge: 86400 (24 hours in seconds)
//   _reverseRegistrar: TNSReverseRegistrar address (or zero address initially)
//   _nameWrapper: Zero address (0x0000000000000000000000000000000000000000)
//   _treasury: 0x629A5386F73283F80847154d16E359192a891f86
//
// IMPORTANT: Select "TNSController" from the dropdown
// ============================================

// ========== LIBRARIES ==========

library StringUtils {
    function strlen(string memory s) internal pure returns (uint256) {
        uint256 len;
        uint256 i = 0;
        uint256 bytelength = bytes(s).length;
        for (len = 0; i < bytelength; len++) {
            bytes1 b = bytes(s)[i];
            if (b < 0x80) { i += 1; }
            else if (b < 0xE0) { i += 2; }
            else if (b < 0xF0) { i += 3; }
            else if (b < 0xF8) { i += 4; }
            else if (b < 0xFC) { i += 5; }
            else { i += 6; }
        }
        return len;
    }
}

// ========== ABSTRACT CONTRACTS ==========

abstract contract Context {
    function _msgSender() internal view virtual returns (address) { return msg.sender; }
}

abstract contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() { _transferOwnership(_msgSender()); }

    modifier onlyOwner() { require(owner() == _msgSender(), "Ownable: caller is not the owner"); _; }

    function owner() public view virtual returns (address) { return _owner; }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() { _status = _NOT_ENTERED; }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

// ========== INTERFACES ==========

interface IPriceOracle {
    struct Price {
        uint256 base;
        uint256 premium;
    }
    function price(string calldata name, uint256 expires, uint256 duration) external view returns (Price memory);
}

interface IBaseRegistrar {
    function nameExpires(uint256 id) external view returns (uint256);
    function available(uint256 id) external view returns (bool);
    function register(uint256 id, address owner, uint256 duration) external returns (uint256);
    function renew(uint256 id, uint256 duration) external returns (uint256);
    function reclaim(uint256 id, address owner) external;
}

interface IReverseRegistrar {
    function setNameForAddr(address addr, address owner, address resolver, string memory name) external returns (bytes32);
}

interface INameWrapper {
    function registerAndWrapETH2LD(string calldata label, address wrappedOwner, uint256 duration, address resolver, uint16 ownerControlledFuses) external returns (uint256 registrarExpiry);
    function renew(uint256 tokenId, uint256 duration) external returns (uint256 expires);
}

// ========== ERRORS - Exact ENS Errors ==========

error CommitmentTooNew(bytes32 commitment);
error CommitmentTooOld(bytes32 commitment);
error NameNotAvailable(string name);
error DurationTooShort(uint256 duration);
error ResolverRequiredWhenDataSupplied();
error UnexpiredCommitmentExists(bytes32 commitment);
error InsufficientValue();
error Unauthorised(bytes32 node);
error MaxCommitmentAgeTooLow();
error MaxCommitmentAgeTooHigh();

// ========== TNSController - ENS ETHRegistrarController Equivalent ==========

contract TNSController is Ownable, ReentrancyGuard {
    using StringUtils for string;

    uint256 public constant MIN_REGISTRATION_DURATION = 28 days;
    bytes32 private constant TRUST_NODE = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint64 private constant MAX_EXPIRY = type(uint64).max;

    IBaseRegistrar public immutable base;
    IPriceOracle public prices;
    uint256 public immutable minCommitmentAge;
    uint256 public immutable maxCommitmentAge;
    IReverseRegistrar public reverseRegistrar;
    INameWrapper public nameWrapper;
    address public treasury;

    mapping(bytes32 => uint256) public commitments;

    event NameRegistered(
        string name,
        bytes32 indexed label,
        address indexed owner,
        uint256 baseCost,
        uint256 premium,
        uint256 expires
    );
    event NameRenewed(
        string name,
        bytes32 indexed label,
        uint256 cost,
        uint256 expires
    );

    constructor(
        IBaseRegistrar _base,
        IPriceOracle _prices,
        uint256 _minCommitmentAge,
        uint256 _maxCommitmentAge,
        IReverseRegistrar _reverseRegistrar,
        INameWrapper _nameWrapper,
        address _treasury
    ) {
        if (_maxCommitmentAge <= _minCommitmentAge) {
            revert MaxCommitmentAgeTooLow();
        }
        if (_maxCommitmentAge > block.timestamp) {
            revert MaxCommitmentAgeTooHigh();
        }

        base = _base;
        prices = _prices;
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
        reverseRegistrar = _reverseRegistrar;
        nameWrapper = _nameWrapper;
        treasury = _treasury;
    }

    // ========== View Functions ==========

    function rentPrice(string memory name, uint256 duration) public view returns (IPriceOracle.Price memory priceData) {
        bytes32 label = keccak256(bytes(name));
        priceData = prices.price(name, base.nameExpires(uint256(label)), duration);
    }

    function valid(string memory name) public pure returns (bool) {
        return name.strlen() >= 3;
    }

    function available(string memory name) public view returns (bool) {
        bytes32 label = keccak256(bytes(name));
        return valid(name) && base.available(uint256(label));
    }

    function makeCommitment(
        string memory name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    ) public pure returns (bytes32) {
        bytes32 label = keccak256(bytes(name));
        if (data.length > 0 && resolver == address(0)) {
            revert ResolverRequiredWhenDataSupplied();
        }
        return keccak256(
            abi.encode(
                label,
                owner,
                duration,
                secret,
                resolver,
                data,
                reverseRecord,
                ownerControlledFuses
            )
        );
    }

    // ========== Mutating Functions ==========

    function commit(bytes32 commitment) public {
        if (commitments[commitment] + maxCommitmentAge >= block.timestamp) {
            revert UnexpiredCommitmentExists(commitment);
        }
        commitments[commitment] = block.timestamp;
    }

    function register(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    ) public payable nonReentrant {
        IPriceOracle.Price memory priceData = rentPrice(name, duration);
        if (msg.value < priceData.base + priceData.premium) {
            revert InsufficientValue();
        }

        _consumeCommitment(
            name,
            duration,
            makeCommitment(
                name,
                owner,
                duration,
                secret,
                resolver,
                data,
                reverseRecord,
                ownerControlledFuses
            )
        );

        uint256 expires = _register(name, owner, duration, resolver, data, reverseRecord);

        emit NameRegistered(
            name,
            keccak256(bytes(name)),
            owner,
            priceData.base,
            priceData.premium,
            expires
        );

        // Send payment to treasury
        if (priceData.base + priceData.premium > 0) {
            (bool sent, ) = treasury.call{value: priceData.base + priceData.premium}("");
            require(sent, "Treasury payment failed");
        }

        // Refund excess payment
        if (msg.value > priceData.base + priceData.premium) {
            payable(msg.sender).transfer(msg.value - priceData.base - priceData.premium);
        }
    }

    function _register(
        string calldata name,
        address owner,
        uint256 duration,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord
    ) internal returns (uint256 expires) {
        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);

        expires = base.register(tokenId, owner, duration);

        if (resolver != address(0)) {
            // Set resolver data if provided
            bytes32 nodehash = keccak256(abi.encodePacked(base, label));
            for (uint256 i = 0; i < data.length; i++) {
                (bool success, ) = resolver.call(data[i]);
                require(success, "Resolver data call failed");
            }
        }

        if (reverseRecord && address(reverseRegistrar) != address(0)) {
            reverseRegistrar.setNameForAddr(
                msg.sender,
                owner,
                resolver,
                string.concat(name, ".trust")
            );
        }
    }

    function renew(string calldata name, uint256 duration) external payable nonReentrant {
        bytes32 labelhash = keccak256(bytes(name));
        uint256 tokenId = uint256(labelhash);
        IPriceOracle.Price memory priceData = rentPrice(name, duration);

        if (msg.value < priceData.base) {
            revert InsufficientValue();
        }

        uint256 expires = base.renew(tokenId, duration);

        emit NameRenewed(name, labelhash, priceData.base, expires);

        // Send payment to treasury
        if (priceData.base > 0) {
            (bool sent, ) = treasury.call{value: priceData.base}("");
            require(sent, "Treasury payment failed");
        }

        // Refund excess payment
        if (msg.value > priceData.base) {
            payable(msg.sender).transfer(msg.value - priceData.base);
        }
    }

    function _consumeCommitment(
        string memory name,
        uint256 duration,
        bytes32 commitment
    ) internal {
        // Require an old enough commitment.
        if (commitments[commitment] + minCommitmentAge > block.timestamp) {
            revert CommitmentTooNew(commitment);
        }

        // If the commitment is too old, or the name is registered, stop.
        if (commitments[commitment] + maxCommitmentAge <= block.timestamp) {
            revert CommitmentTooOld(commitment);
        }

        if (!available(name)) {
            revert NameNotAvailable(name);
        }

        delete commitments[commitment];

        if (duration < MIN_REGISTRATION_DURATION) {
            revert DurationTooShort(duration);
        }
    }

    // ========== Admin Functions ==========

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function setPriceOracle(IPriceOracle _prices) external onlyOwner {
        prices = _prices;
    }

    function setReverseRegistrar(IReverseRegistrar _reverseRegistrar) external onlyOwner {
        reverseRegistrar = _reverseRegistrar;
    }

    function withdraw() external onlyOwner {
        (bool sent, ) = treasury.call{value: address(this).balance}("");
        require(sent, "Withdrawal failed");
    }

    // ========== Helper Functions ==========

    function getCommitmentAge(bytes32 commitment) external view returns (uint256) {
        if (commitments[commitment] == 0) return 0;
        return block.timestamp - commitments[commitment];
    }

    function isCommitmentReady(bytes32 commitment) external view returns (bool) {
        if (commitments[commitment] == 0) return false;
        uint256 age = block.timestamp - commitments[commitment];
        return age >= minCommitmentAge && age < maxCommitmentAge;
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == type(IBaseRegistrar).interfaceId;
    }

    receive() external payable {}
}
