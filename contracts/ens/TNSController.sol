// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./TNSBaseRegistrar.sol";
import "./ITNSPriceOracle.sol";
import "./StringUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error CommitmentTooNew(bytes32 commitment);
error CommitmentTooOld(bytes32 commitment);
error NameNotAvailable(string name);
error DurationTooShort(uint256 duration);
error UnexpiredCommitmentExists(bytes32 commitment);
error InsufficientPayment();
error RefundFailed();

contract TNSController is Ownable, ReentrancyGuard {
    using StringUtils for *;

    uint256 public constant MIN_REGISTRATION_DURATION = 365 days;
    uint256 public constant MIN_COMMITMENT_AGE = 60;
    uint256 public constant MAX_COMMITMENT_AGE = 24 hours;

    TNSBaseRegistrar public immutable base;
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
        TNSBaseRegistrar _base,
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
        address owner,
        bytes32 secret
    ) public pure returns (bytes32) {
        bytes32 label = keccak256(bytes(name));
        return keccak256(abi.encode(label, owner, secret));
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
        address owner,
        uint256 duration,
        bytes32 secret
    ) public payable nonReentrant {
        ITNSPriceOracle.Price memory priceInfo = rentPrice(name, duration);
        uint256 cost = priceInfo.base + priceInfo.premium;

        _consumeCommitment(name, duration, makeCommitment(name, owner, secret));

        if (msg.value < cost) {
            revert InsufficientPayment();
        }

        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);
        uint256 expires = base.register(tokenId, owner, duration);

        // Send payment to treasury
        (bool sent, ) = treasury.call{value: cost}("");
        require(sent, "Treasury payment failed");

        // Refund excess payment
        if (msg.value > cost) {
            (bool refunded, ) = msg.sender.call{value: msg.value - cost}("");
            if (!refunded) {
                revert RefundFailed();
            }
        }

        emit NameRegistered(name, label, owner, cost, expires);
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

        // Send payment to treasury
        (bool sent, ) = treasury.call{value: cost}("");
        require(sent, "Treasury payment failed");

        // Refund excess payment
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

    // Allow contract to receive native TRUST
    receive() external payable {}
}
