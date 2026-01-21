// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// ENS PublicResolver - Exact ENS Architecture
// DEPLOY ORDER: 6 of 7
// Constructor Parameters:
//   _tns: TNSRegistry address
//   _trustedController: TNSController address
//   _trustedReverseRegistrar: TNSReverseRegistrar address
//
// IMPORTANT: Select "TNSResolver" from the dropdown
// ============================================

// ========== ABSTRACT CONTRACTS ==========

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

interface ITNS {
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
}

// ========== INTERFACE IDs for ERC-165 ==========
// These match ENS resolver interface IDs

// Interface IDs
bytes4 constant INTERFACE_META_ID = 0x01ffc9a7; // ERC-165
bytes4 constant ADDR_INTERFACE_ID = 0x3b3b57de; // addr(bytes32)
bytes4 constant ADDR_ID = 0xf1cb7e06; // addr(bytes32,uint256)
bytes4 constant NAME_INTERFACE_ID = 0x691f3431; // name(bytes32)
bytes4 constant TEXT_INTERFACE_ID = 0x59d1d43c; // text(bytes32,string)
bytes4 constant CONTENTHASH_INTERFACE_ID = 0xbc1c58d1; // contenthash(bytes32)

// ========== TNSResolver - ENS PublicResolver Equivalent ==========

/**
 * A simple resolver anyone can use; only allows the owner of a node to set its address.
 * This follows the exact ENS PublicResolver architecture.
 */
contract TNSResolver is ReentrancyGuard {
    ITNS immutable tns;
    address public trustedController;
    address public trustedReverseRegistrar;
    address public owner;

    // Mappings for different record types (ENS-style)
    mapping(bytes32 => mapping(uint256 => bytes)) versionable_addresses;
    mapping(bytes32 => uint64) public recordVersions;
    mapping(bytes32 => mapping(string => string)) versionable_texts;
    mapping(bytes32 => bytes) versionable_contenthashes;
    mapping(bytes32 => string) versionable_names;
    
    // Operator approvals
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(address => mapping(bytes32 => mapping(address => bool))) private _tokenApprovals;

    // ========== Events - Exact ENS Events ==========

    event AddrChanged(bytes32 indexed node, address a);
    event AddressChanged(bytes32 indexed node, uint256 coinType, bytes newAddress);
    event NameChanged(bytes32 indexed node, string name);
    event ContenthashChanged(bytes32 indexed node, bytes hash);
    event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Approved(address owner, bytes32 indexed node, address indexed delegate, bool indexed approved);
    event VersionChanged(bytes32 indexed node, uint64 newVersion);

    // ========== Constructor ==========

    constructor(
        ITNS _tns,
        address _trustedController,
        address _trustedReverseRegistrar
    ) {
        tns = _tns;
        trustedController = _trustedController;
        trustedReverseRegistrar = _trustedReverseRegistrar;
        owner = msg.sender;
    }

    // ========== Authorization ==========

    modifier authorised(bytes32 node) {
        require(isAuthorised(node), "Not authorised");
        _;
    }

    function isAuthorised(bytes32 node) internal view returns (bool) {
        // Trusted contracts can always write
        if (msg.sender == trustedController || msg.sender == trustedReverseRegistrar) {
            return true;
        }
        address nodeOwner = tns.owner(node);
        return nodeOwner == msg.sender ||
               isApprovedForAll(nodeOwner, msg.sender) ||
               isApprovedFor(nodeOwner, node, msg.sender);
    }

    // ========== Approval Functions ==========

    function setApprovalForAll(address operator, bool approved) external {
        require(msg.sender != operator, "ERC1155: setting approval status for self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function approve(bytes32 node, address delegate, bool approved) external {
        require(msg.sender != delegate, "Setting delegate status for self");
        _tokenApprovals[msg.sender][node][delegate] = approved;
        emit Approved(msg.sender, node, delegate, approved);
    }

    function isApprovedFor(address nodeOwner, bytes32 node, address delegate) public view returns (bool) {
        return _tokenApprovals[nodeOwner][node][delegate];
    }

    // ========== Record Version Management ==========

    /**
     * Increments the record version associated with a node.
     * May only be called by the owner of that node in the TNS registry.
     * @param node The node to update.
     */
    function clearRecords(bytes32 node) public authorised(node) {
        recordVersions[node]++;
        emit VersionChanged(node, recordVersions[node]);
    }

    // ========== Address Resolution (Coin Type 60 = ETH) ==========

    /**
     * Sets the address associated with a TNS node.
     * May only be called by the owner of that node in the TNS registry.
     * @param node The node to update.
     * @param a The address to set.
     */
    function setAddr(bytes32 node, address a) external authorised(node) {
        setAddr(node, 60, addressToBytes(a)); // 60 = ETH coin type
    }

    /**
     * Sets the address associated with a TNS node for a specific coin type.
     * @param node The node to update.
     * @param coinType The coin type (60 for ETH, etc.)
     * @param a The address in bytes format.
     */
    function setAddr(bytes32 node, uint256 coinType, bytes memory a) public authorised(node) {
        emit AddressChanged(node, coinType, a);
        if (coinType == 60) {
            emit AddrChanged(node, bytesToAddress(a));
        }
        versionable_addresses[node][coinType] = a;
    }

    /**
     * Returns the address associated with a TNS node (ETH address).
     * @param node The TNS node to query.
     * @return The associated address.
     */
    function addr(bytes32 node) public view returns (address payable) {
        bytes memory a = addr(node, 60);
        if (a.length == 0) {
            return payable(0);
        }
        return bytesToAddress(a);
    }

    /**
     * Returns the address associated with a TNS node for a specific coin type.
     * @param node The TNS node to query.
     * @param coinType The coin type.
     * @return The associated address in bytes.
     */
    function addr(bytes32 node, uint256 coinType) public view returns (bytes memory) {
        return versionable_addresses[node][coinType];
    }

    // ========== Name Resolution (for reverse records) ==========

    /**
     * Sets the name associated with a TNS node, for reverse records.
     * May only be called by the owner of that node in the TNS registry.
     * @param node The node to update.
     * @param newName The name to set.
     */
    function setName(bytes32 node, string calldata newName) external authorised(node) {
        versionable_names[node] = newName;
        emit NameChanged(node, newName);
    }

    /**
     * Returns the name associated with a TNS node, for reverse records.
     * @param node The TNS node to query.
     * @return The associated name.
     */
    function name(bytes32 node) external view returns (string memory) {
        return versionable_names[node];
    }

    // ========== Text Records ==========

    /**
     * Sets the text data associated with a TNS node and key.
     * May only be called by the owner of that node in the TNS registry.
     * @param node The node to update.
     * @param key The key to set.
     * @param value The text data value to set.
     */
    function setText(bytes32 node, string calldata key, string calldata value) external authorised(node) {
        versionable_texts[node][key] = value;
        emit TextChanged(node, key, key, value);
    }

    /**
     * Returns the text data associated with a TNS node and key.
     * @param node The TNS node to query.
     * @param key The text data key to query.
     * @return The associated text data.
     */
    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return versionable_texts[node][key];
    }

    // ========== Content Hash ==========

    /**
     * Sets the contenthash associated with a TNS node.
     * May only be called by the owner of that node in the TNS registry.
     * @param node The node to update.
     * @param hash The contenthash to set.
     */
    function setContenthash(bytes32 node, bytes calldata hash) external authorised(node) {
        versionable_contenthashes[node] = hash;
        emit ContenthashChanged(node, hash);
    }

    /**
     * Returns the contenthash associated with a TNS node.
     * @param node The TNS node to query.
     * @return The associated contenthash.
     */
    function contenthash(bytes32 node) external view returns (bytes memory) {
        return versionable_contenthashes[node];
    }

    // ========== Admin Functions ==========

    function setTrustedController(address _controller) external {
        require(msg.sender == owner, "Only owner");
        trustedController = _controller;
    }

    function setTrustedReverseRegistrar(address _reverseRegistrar) external {
        require(msg.sender == owner, "Only owner");
        trustedReverseRegistrar = _reverseRegistrar;
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        owner = newOwner;
    }

    // ========== Interface Detection ==========

    function supportsInterface(bytes4 interfaceID) public pure returns (bool) {
        return interfaceID == INTERFACE_META_ID ||
               interfaceID == ADDR_INTERFACE_ID ||
               interfaceID == ADDR_ID ||
               interfaceID == NAME_INTERFACE_ID ||
               interfaceID == TEXT_INTERFACE_ID ||
               interfaceID == CONTENTHASH_INTERFACE_ID;
    }

    // ========== Helper Functions ==========

    function bytesToAddress(bytes memory b) internal pure returns (address payable a) {
        require(b.length == 20);
        assembly {
            a := div(mload(add(b, 32)), exp(256, 12))
        }
    }

    function addressToBytes(address a) internal pure returns (bytes memory b) {
        b = new bytes(20);
        assembly {
            mstore(add(b, 32), mul(a, exp(256, 12)))
        }
    }
}
