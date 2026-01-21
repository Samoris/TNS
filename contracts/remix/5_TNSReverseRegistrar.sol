// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// ENS ReverseRegistrar - Exact ENS Architecture
// DEPLOY ORDER: 5 of 7
// Constructor Parameters:
//   _tns: TNSRegistry address
//
// IMPORTANT: Select "TNSReverseRegistrar" from the dropdown
// ============================================

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

// ========== INTERFACES ==========

interface ITNS {
    function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external returns (bytes32);
    function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl) external;
    function setOwner(bytes32 node, address owner) external;
    function setResolver(bytes32 node, address resolver) external;
    function owner(bytes32 node) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface INameResolver {
    function setName(bytes32 node, string memory name) external;
}

// ========== CONSTANTS ==========

// namehash('addr.reverse')
bytes32 constant ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

// ========== TNSReverseRegistrar - Exact ENS ReverseRegistrar ==========

/**
 * @dev Reverse Registrar for TNS - exact ENS architecture
 */
contract TNSReverseRegistrar is Ownable {
    ITNS public immutable tns;
    INameResolver public defaultResolver;

    mapping(address => bool) public controllers;

    event ReverseClaimed(address indexed addr, bytes32 indexed node);
    event DefaultResolverChanged(INameResolver indexed resolver);
    event ControllerChanged(address indexed controller, bool enabled);

    /**
     * @dev Constructor
     * @param _tns The address of the TNS registry.
     */
    constructor(ITNS _tns) {
        tns = _tns;
    }

    modifier authorised(address addr) {
        require(
            addr == msg.sender ||
            controllers[msg.sender] ||
            tns.isApprovedForAll(addr, msg.sender) ||
            ownsContract(addr),
            "ReverseRegistrar: Caller is not a controller or authorised by address or the address itself"
        );
        _;
    }

    // ========== Controller Management ==========

    function setController(address controller, bool enabled) public onlyOwner {
        controllers[controller] = enabled;
        emit ControllerChanged(controller, enabled);
    }

    // ========== Default Resolver ==========

    function setDefaultResolver(address resolver) public onlyOwner {
        require(address(resolver) != address(0), "ReverseRegistrar: Resolver address must not be 0");
        defaultResolver = INameResolver(resolver);
        emit DefaultResolverChanged(INameResolver(resolver));
    }

    // ========== Claim Functions ==========

    /**
     * @dev Transfers ownership of the reverse TNS record associated with the
     *      calling account.
     * @param owner The address to set as the owner of the reverse record in TNS.
     * @return The TNS node hash of the reverse record.
     */
    function claim(address owner) public returns (bytes32) {
        return claimForAddr(msg.sender, owner, address(defaultResolver));
    }

    /**
     * @dev Transfers ownership of the reverse TNS record associated with the
     *      calling account.
     * @param addr The reverse record to set
     * @param owner The address to set as the owner of the reverse record in TNS.
     * @param resolver The resolver of the reverse node
     * @return The TNS node hash of the reverse record.
     */
    function claimForAddr(
        address addr,
        address owner,
        address resolver
    ) public authorised(addr) returns (bytes32) {
        bytes32 labelHash = sha3HexAddress(addr);
        bytes32 reverseNode = keccak256(abi.encodePacked(ADDR_REVERSE_NODE, labelHash));
        emit ReverseClaimed(addr, reverseNode);
        tns.setSubnodeRecord(ADDR_REVERSE_NODE, labelHash, owner, resolver, 0);
        return reverseNode;
    }

    /**
     * @dev Transfers ownership of the reverse TNS record associated with the
     *      calling account.
     * @param owner The address to set as the owner of the reverse record in TNS.
     * @param resolver The address of the resolver to set; 0 to leave unchanged.
     * @return The TNS node hash of the reverse record.
     */
    function claimWithResolver(address owner, address resolver) public returns (bytes32) {
        return claimForAddr(msg.sender, owner, resolver);
    }

    // ========== Set Name Functions ==========

    /**
     * @dev Sets the `name()` record for the reverse TNS record associated with
     * the calling account.
     * @param name The name to set for this address.
     * @return The TNS node hash of the reverse record.
     */
    function setName(string memory name) public returns (bytes32) {
        return setNameForAddr(msg.sender, msg.sender, address(defaultResolver), name);
    }

    /**
     * @dev Sets the `name()` record for the reverse TNS record associated with
     * the account provided.
     * @param addr The reverse record to set
     * @param owner The owner of the reverse node
     * @param resolver The resolver of the reverse node
     * @param name The name to set for this address.
     * @return The TNS node hash of the reverse record.
     */
    function setNameForAddr(
        address addr,
        address owner,
        address resolver,
        string memory name
    ) public returns (bytes32) {
        bytes32 node = claimForAddr(addr, owner, resolver);
        INameResolver(resolver).setName(node, name);
        return node;
    }

    // ========== View Functions ==========

    /**
     * @dev Returns the node hash for a given account's reverse records.
     * @param addr The address to hash
     * @return The TNS node hash.
     */
    function node(address addr) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(ADDR_REVERSE_NODE, sha3HexAddress(addr)));
    }

    // ========== Internal Functions ==========

    /**
     * @dev An optimised function to compute the sha3 of the lower-case
     *      hexadecimal representation of an Ethereum address.
     * @param addr The address to hash
     * @return ret The SHA3 hash of the lower-case hexadecimal encoding of the
     *         input address.
     */
    function sha3HexAddress(address addr) private pure returns (bytes32 ret) {
        bytes32 lookup = 0x3031323334353637383961626364656600000000000000000000000000000000;

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
        try Ownable(addr).owner() returns (address owner) {
            return owner == msg.sender;
        } catch {
            return false;
        }
    }
}
