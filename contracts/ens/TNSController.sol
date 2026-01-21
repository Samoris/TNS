// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./TNSBaseRegistrar.sol";
import "./ITNSPriceOracle.sol";
import "./StringUtils.sol";
import "./IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error CommitmentTooNew(bytes32 commitment);
error CommitmentTooOld(bytes32 commitment);
error NameNotAvailable(string name);
error DurationTooShort(uint256 duration);
error UnexpiredCommitmentExists(bytes32 commitment);
error InsufficientPayment();
error InsufficientAllowance();
error TransferFailed();

contract TNSController is Ownable, ReentrancyGuard {
    using StringUtils for *;

    uint256 public constant MIN_REGISTRATION_DURATION = 365 days;
    uint256 public constant MIN_COMMITMENT_AGE = 60;
    uint256 public constant MAX_COMMITMENT_AGE = 24 hours;

    TNSBaseRegistrar public immutable base;
    ITNSPriceOracle public immutable prices;
    IERC20 public immutable trustToken;
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
        IERC20 _trustToken,
        address _treasury
    ) {
        base = _base;
        prices = _prices;
        trustToken = _trustToken;
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
    ) public nonReentrant {
        ITNSPriceOracle.Price memory priceInfo = rentPrice(name, duration);
        uint256 cost = priceInfo.base + priceInfo.premium;

        _consumeCommitment(name, duration, makeCommitment(name, owner, secret));

        if (trustToken.allowance(msg.sender, address(this)) < cost) {
            revert InsufficientAllowance();
        }

        if (trustToken.balanceOf(msg.sender) < cost) {
            revert InsufficientPayment();
        }

        bool success = trustToken.transferFrom(msg.sender, treasury, cost);
        if (!success) {
            revert TransferFailed();
        }

        bytes32 label = keccak256(bytes(name));
        uint256 tokenId = uint256(label);
        uint256 expires = base.register(tokenId, owner, duration);

        emit NameRegistered(name, label, owner, cost, expires);
    }

    function renew(string calldata name, uint256 duration) external nonReentrant {
        ITNSPriceOracle.Price memory priceInfo = rentPrice(name, duration);
        uint256 cost = priceInfo.base;

        if (trustToken.allowance(msg.sender, address(this)) < cost) {
            revert InsufficientAllowance();
        }

        if (trustToken.balanceOf(msg.sender) < cost) {
            revert InsufficientPayment();
        }

        bool success = trustToken.transferFrom(msg.sender, treasury, cost);
        if (!success) {
            revert TransferFailed();
        }

        bytes32 labelhash = keccak256(bytes(name));
        uint256 tokenId = uint256(labelhash);
        uint256 expires = base.renew(tokenId, duration);

        emit NameRenewed(name, labelhash, cost, expires);
    }

    function withdraw() external onlyOwner {
        uint256 balance = trustToken.balanceOf(address(this));
        if (balance > 0) {
            trustToken.transfer(treasury, balance);
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
}
