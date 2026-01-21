// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// DEPLOY ORDER: 4 of 7
// Constructor Parameters:
//   _base: TNSBaseRegistrar address (from step 2)
//   _prices: TNSPriceOracle address (from step 3)
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
            if (b < 0x80) {
                i += 1;
            } else if (b < 0xE0) {
                i += 2;
            } else if (b < 0xF0) {
                i += 3;
            } else if (b < 0xF8) {
                i += 4;
            } else if (b < 0xFC) {
                i += 5;
            } else {
                i += 6;
            }
        }
        return len;
    }
}

// ========== ABSTRACT CONTRACTS ==========

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

abstract contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

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

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

// ========== INTERFACES ==========

interface ITNSPriceOracle {
    struct Price {
        uint256 base;
        uint256 premium;
    }
    function price(string calldata name, uint256 expires, uint256 duration) external view returns (Price memory);
}

interface ITNSBaseRegistrar {
    function nameExpires(uint256 id) external view returns (uint256);
    function available(uint256 id) external view returns (bool);
    function register(uint256 id, address owner, uint256 duration) external returns (uint256);
    function renew(uint256 id, uint256 duration) external returns (uint256);
}

// ========== ERRORS ==========

error CommitmentTooNew(bytes32 commitment);
error CommitmentTooOld(bytes32 commitment);
error NameNotAvailable(string name);
error DurationTooShort(uint256 duration);
error UnexpiredCommitmentExists(bytes32 commitment);
error InsufficientPayment();
error RefundFailed();

// ========== TNSController ==========

contract TNSController is Ownable, ReentrancyGuard {
    using StringUtils for *;

    uint256 public constant MIN_REGISTRATION_DURATION = 365 days;
    uint256 public constant MIN_COMMITMENT_AGE = 60;
    uint256 public constant MAX_COMMITMENT_AGE = 24 hours;

    ITNSBaseRegistrar public immutable base;
    ITNSPriceOracle public immutable prices;
    address public treasury;

    mapping(bytes32 => uint256) public commitments;

    event NameRegistered(
        string name,
        bytes32 indexed label,
        address indexed owner,
        uint256 cost,
        uint256 expires
    );

    event NameRenewed(
        string name,
        bytes32 indexed label,
        uint256 cost,
        uint256 expires
    );

    event CommitmentMade(bytes32 indexed commitment, address indexed owner);

    constructor(
        ITNSBaseRegistrar _base,
        ITNSPriceOracle _prices,
        address _treasury
    ) {
        base = _base;
        prices = _prices;
        treasury = _treasury;
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function rentPrice(string memory name, uint256 duration) public view returns (ITNSPriceOracle.Price memory) {
        bytes32 label = keccak256(bytes(name));
        return prices.price(name, base.nameExpires(uint256(label)), duration);
    }

    function valid(string memory name) public pure returns (bool) {
        uint256 len = name.strlen();
        return len >= 3;
    }

    function available(string memory name) public view returns (bool) {
        bytes32 label = keccak256(bytes(name));
        return valid(name) && base.available(uint256(label));
    }

    function makeCommitment(
        string memory name,
        address registrant,
        bytes32 secret
    ) public pure returns (bytes32) {
        bytes32 label = keccak256(bytes(name));
        return keccak256(abi.encode(label, registrant, secret));
    }

    function commit(bytes32 commitment) public {
        if (commitments[commitment] + MAX_COMMITMENT_AGE >= block.timestamp) {
            revert UnexpiredCommitmentExists(commitment);
        }
        commitments[commitment] = block.timestamp;
        emit CommitmentMade(commitment, msg.sender);
    }

    function register(
        string calldata name,
        address registrant,
        uint256 duration,
        bytes32 secret
    ) public payable nonReentrant {
        ITNSPriceOracle.Price memory priceInfo = rentPrice(name, duration);
        uint256 cost = priceInfo.base + priceInfo.premium;

        _consumeCommitment(name, duration, makeCommitment(name, registrant, secret));

        if (msg.value < cost) {
            revert InsufficientPayment();
        }

        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);
        uint256 expires = base.register(tokenId, registrant, duration);

        (bool sent, ) = treasury.call{value: cost}("");
        require(sent, "Treasury payment failed");

        if (msg.value > cost) {
            (bool refunded, ) = msg.sender.call{value: msg.value - cost}("");
            if (!refunded) {
                revert RefundFailed();
            }
        }

        emit NameRegistered(name, label, registrant, cost, expires);
    }

    function renew(string calldata name, uint256 duration) external payable nonReentrant {
        ITNSPriceOracle.Price memory priceInfo = rentPrice(name, duration);
        uint256 cost = priceInfo.base;

        if (msg.value < cost) {
            revert InsufficientPayment();
        }

        bytes32 labelhash = keccak256(bytes(name));
        uint256 tokenId = uint256(labelhash);
        uint256 expires = base.renew(tokenId, duration);

        (bool sent, ) = treasury.call{value: cost}("");
        require(sent, "Treasury payment failed");

        if (msg.value > cost) {
            (bool refunded, ) = msg.sender.call{value: msg.value - cost}("");
            if (!refunded) {
                revert RefundFailed();
            }
        }

        emit NameRenewed(name, labelhash, cost, expires);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool sent, ) = treasury.call{value: balance}("");
            require(sent, "Withdraw failed");
        }
    }

    function _consumeCommitment(
        string memory name,
        uint256 duration,
        bytes32 commitment
    ) internal {
        if (commitments[commitment] + MIN_COMMITMENT_AGE > block.timestamp) {
            revert CommitmentTooNew(commitment);
        }

        if (commitments[commitment] + MAX_COMMITMENT_AGE <= block.timestamp) {
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

    function getCommitmentAge(bytes32 commitment) external view returns (uint256) {
        if (commitments[commitment] == 0) return 0;
        return block.timestamp - commitments[commitment];
    }

    function isCommitmentReady(bytes32 commitment) external view returns (bool) {
        if (commitments[commitment] == 0) return false;
        uint256 age = block.timestamp - commitments[commitment];
        return age >= MIN_COMMITMENT_AGE && age < MAX_COMMITMENT_AGE;
    }

    receive() external payable {}
}
