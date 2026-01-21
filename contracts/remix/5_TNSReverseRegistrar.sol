// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// DEPLOY ORDER: 5 of 7
// Constructor Parameters:
//   _tns: TNSRegistry address (from step 1)
//
// IMPORTANT: Select "TNSReverseRegistrar" from the dropdown
// ============================================

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

// ========== INTERFACES ==========

interface ITNS {
    function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

abstract contract NameResolver {
    function setName(bytes32 node, string memory name) public virtual;
}

// ========== CONSTANTS ==========

bytes32 constant ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;
bytes32 constant lookup = 0x3031323334353637383961626364656600000000000000000000000000000000;

// ========== TNSReverseRegistrar ==========

contract TNSReverseRegistrar is Ownable {
    ITNS public immutable tns;
    NameResolver public defaultResolver;
    mapping(address => bool) public controllers;

    event ReverseClaimed(address indexed addr, bytes32 indexed node);
    event DefaultResolverChanged(NameResolver indexed resolver);
    event ControllerChanged(address indexed controller, bool enabled);

    constructor(ITNS _tns) {
        tns = _tns;
    }

    modifier authorised(address addr) {
        require(
            addr == msg.sender ||
            controllers[msg.sender] ||
            tns.isApprovedForAll(addr, msg.sender) ||
            ownsContract(addr),
            "Not authorised"
        );
        _;
    }

    function setController(address controller, bool enabled) external onlyOwner {
        controllers[controller] = enabled;
        emit ControllerChanged(controller, enabled);
    }

    function setDefaultResolver(address resolver) external onlyOwner {
        require(resolver != address(0), "Resolver cannot be zero");
        defaultResolver = NameResolver(resolver);
        emit DefaultResolverChanged(NameResolver(resolver));
    }

    function claim(address claimant) public returns (bytes32) {
        return claimForAddr(msg.sender, claimant, address(defaultResolver));
    }

    function claimForAddr(
        address addr,
        address claimant,
        address resolver
    ) public authorised(addr) returns (bytes32) {
        bytes32 labelHash = sha3HexAddress(addr);
        bytes32 reverseNode = keccak256(abi.encodePacked(ADDR_REVERSE_NODE, labelHash));
        emit ReverseClaimed(addr, reverseNode);
        tns.setSubnodeRecord(ADDR_REVERSE_NODE, labelHash, claimant, resolver, 0);
        return reverseNode;
    }

    function claimWithResolver(address claimant, address resolver) public returns (bytes32) {
        return claimForAddr(msg.sender, claimant, resolver);
    }

    function setName(string memory name) public returns (bytes32) {
        return setNameForAddr(msg.sender, msg.sender, address(defaultResolver), name);
    }

    function setNameForAddr(
        address addr,
        address claimant,
        address resolver,
        string memory name
    ) public returns (bytes32) {
        bytes32 node = claimForAddr(addr, claimant, resolver);
        NameResolver(resolver).setName(node, name);
        return node;
    }

    function node(address addr) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(ADDR_REVERSE_NODE, sha3HexAddress(addr)));
    }

    function sha3HexAddress(address addr) private pure returns (bytes32 ret) {
        assembly {
            for { let i := 40 } gt(i, 0) { } {
                i := sub(i, 1)
                mstore8(i, byte(and(addr, 0xf), lookup))
                addr := div(addr, 0x10)
                i := sub(i, 1)
                mstore8(i, byte(and(addr, 0xf), lookup))
                addr := div(addr, 0x10)
            }
            ret := keccak256(0, 40)
        }
    }

    function ownsContract(address addr) internal view returns (bool) {
        try Ownable(addr).owner() returns (address contractOwner) {
            return contractOwner == msg.sender;
        } catch {
            return false;
        }
    }
}
