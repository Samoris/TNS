// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// DEPLOY ORDER: 6 of 7
// Constructor Parameters:
//   _tns: TNSRegistry address (from step 1)
//   _registrar: TNSBaseRegistrar address (from step 2)
//   _trustedController: TNSController address (from step 4)
//   _trustedReverseRegistrar: TNSReverseRegistrar address (from step 5)
// ============================================

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ITNS {
    function owner(bytes32 node) external view returns (address);
}

interface ITNSBaseRegistrar {
    function owner() external view returns (address);
}

contract TNSResolver is ReentrancyGuard {
    ITNS public immutable tns;
    ITNSBaseRegistrar public immutable registrar;
    address public trustedController;
    address public trustedReverseRegistrar;

    mapping(bytes32 => address) private _addresses;
    mapping(bytes32 => bytes) private _contenthashes;
    mapping(bytes32 => mapping(string => string)) private _texts;
    mapping(bytes32 => string) private _names;

    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(address => mapping(bytes32 => mapping(address => bool))) private _tokenApprovals;

    event AddrChanged(bytes32 indexed node, address addr);
    event ContenthashChanged(bytes32 indexed node, bytes hash);
    event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value);
    event NameChanged(bytes32 indexed node, string name);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Approved(address owner, bytes32 indexed node, address indexed delegate, bool indexed approved);

    constructor(
        ITNS _tns,
        ITNSBaseRegistrar _registrar,
        address _trustedController,
        address _trustedReverseRegistrar
    ) {
        tns = _tns;
        registrar = _registrar;
        trustedController = _trustedController;
        trustedReverseRegistrar = _trustedReverseRegistrar;
    }

    modifier authorised(bytes32 node) {
        require(isAuthorised(node), "Not authorised");
        _;
    }

    function isAuthorised(bytes32 node) internal view returns (bool) {
        if (msg.sender == trustedController || msg.sender == trustedReverseRegistrar) {
            return true;
        }
        address nodeOwner = tns.owner(node);
        return nodeOwner == msg.sender ||
               isApprovedForAll(nodeOwner, msg.sender) ||
               isApprovedFor(nodeOwner, node, msg.sender);
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(msg.sender != operator, "Cannot approve self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function approve(bytes32 node, address delegate, bool approved) external {
        require(msg.sender != delegate, "Cannot approve self");
        _tokenApprovals[msg.sender][node][delegate] = approved;
        emit Approved(msg.sender, node, delegate, approved);
    }

    function isApprovedFor(address owner, bytes32 node, address delegate) public view returns (bool) {
        return _tokenApprovals[owner][node][delegate];
    }

    function setAddr(bytes32 node, address addr) external authorised(node) {
        _addresses[node] = addr;
        emit AddrChanged(node, addr);
    }

    function addr(bytes32 node) external view returns (address) {
        return _addresses[node];
    }

    function setContenthash(bytes32 node, bytes calldata hash) external authorised(node) {
        _contenthashes[node] = hash;
        emit ContenthashChanged(node, hash);
    }

    function contenthash(bytes32 node) external view returns (bytes memory) {
        return _contenthashes[node];
    }

    function setText(bytes32 node, string calldata key, string calldata value) external authorised(node) {
        _texts[node][key] = value;
        emit TextChanged(node, key, key, value);
    }

    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return _texts[node][key];
    }

    function setName(bytes32 node, string calldata name) external authorised(node) {
        _names[node] = name;
        emit NameChanged(node, name);
    }

    function name(bytes32 node) external view returns (string memory) {
        return _names[node];
    }

    function setTrustedController(address _controller) external {
        require(msg.sender == address(registrar.owner()), "Only registrar owner");
        trustedController = _controller;
    }

    function setTrustedReverseRegistrar(address _reverseRegistrar) external {
        require(msg.sender == address(registrar.owner()), "Only registrar owner");
        trustedReverseRegistrar = _reverseRegistrar;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 ||
               interfaceId == 0x3b3b57de ||
               interfaceId == 0xbc1c58d1 ||
               interfaceId == 0x59d1d43c ||
               interfaceId == 0x691f3431;
    }
}
