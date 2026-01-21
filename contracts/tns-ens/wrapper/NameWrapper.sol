//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "../registry/TNS.sol";
import "../ethregistrar/IBaseRegistrar.sol";
import "./INameWrapper.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev NameWrapper for TNS.
 * Simplified implementation of ENS NameWrapper.
 * Wraps domain NFTs with additional functionality like fuses.
 */
contract NameWrapper is ERC1155, INameWrapper, Ownable {
    TNS public immutable tns;
    IBaseRegistrar public immutable registrar;

    // namehash of 'trust' - keccak256(abi.encodePacked(bytes32(0), keccak256("trust")))
    bytes32 private constant TRUST_NODE = 
        0xe16bcebb9fdd78a351d48e8b8c0efa4a4d222509da29d80bcbb1e2b64eac4985;

    mapping(bytes32 => uint32) public allFusesBurned;
    mapping(bytes32 => uint64) public expiryOf;
    mapping(address => bool) public controllers;

    event NameWrapped(
        bytes32 indexed node,
        bytes name,
        address owner,
        uint32 fuses,
        uint64 expiry
    );
    event NameUnwrapped(bytes32 indexed node, address owner);
    event FusesSet(bytes32 indexed node, uint32 fuses);
    event ExpiryExtended(bytes32 indexed node, uint64 expiry);
    event ControllerChanged(address indexed controller, bool active);

    constructor(
        TNS _tns,
        IBaseRegistrar _registrar,
        string memory _metadataUrl
    ) ERC1155(_metadataUrl) {
        tns = _tns;
        registrar = _registrar;
    }

    modifier onlyController() {
        require(controllers[msg.sender], "Not controller");
        _;
    }

    function setController(address controller, bool active) external onlyOwner {
        controllers[controller] = active;
        emit ControllerChanged(controller, active);
    }

    function registerAndWrapETH2LD(
        string calldata label,
        address wrappedOwner,
        uint256 duration,
        address resolver,
        uint16 ownerControlledFuses
    ) external override onlyController returns (uint256 registrarExpiry) {
        bytes32 labelhash = keccak256(bytes(label));
        uint256 tokenId = uint256(labelhash);
        
        // Register through BaseRegistrar
        registrarExpiry = registrar.register(tokenId, address(this), duration);
        
        // Set up the wrapped token
        bytes32 node = _makeNode(TRUST_NODE, labelhash);
        _mint(wrappedOwner, uint256(node), 1, "");
        
        allFusesBurned[node] = ownerControlledFuses;
        expiryOf[node] = uint64(registrarExpiry);
        
        // Set resolver in registry
        tns.setResolver(node, resolver);
        
        emit NameWrapped(node, bytes(label), wrappedOwner, ownerControlledFuses, uint64(registrarExpiry));
        
        return registrarExpiry;
    }

    function renew(
        uint256 tokenId,
        uint256 duration
    ) external override onlyController returns (uint256 expires) {
        expires = registrar.renew(tokenId, duration);
        bytes32 labelhash = bytes32(tokenId);
        bytes32 node = _makeNode(TRUST_NODE, labelhash);
        expiryOf[node] = uint64(expires);
        emit ExpiryExtended(node, uint64(expires));
        return expires;
    }

    function setSubnodeOwner(
        bytes32 parentNode,
        string calldata label,
        address owner,
        uint32 fuses,
        uint64 expiry
    ) external override returns (bytes32 node) {
        bytes32 labelhash = keccak256(bytes(label));
        node = _makeNode(parentNode, labelhash);
        
        require(_canModifyName(parentNode, msg.sender), "Unauthorised");
        
        tns.setSubnodeOwner(parentNode, labelhash, address(this));
        _mint(owner, uint256(node), 1, "");
        
        allFusesBurned[node] = fuses;
        expiryOf[node] = expiry;
        
        emit NameWrapped(node, bytes(label), owner, fuses, expiry);
        return node;
    }

    function setSubnodeRecord(
        bytes32 parentNode,
        string calldata label,
        address owner,
        address resolver,
        uint64 ttl,
        uint32 fuses,
        uint64 expiry
    ) external override returns (bytes32 node) {
        node = this.setSubnodeOwner(parentNode, label, owner, fuses, expiry);
        tns.setResolver(node, resolver);
        return node;
    }

    function setFuses(
        bytes32 node,
        uint16 ownerControlledFuses
    ) external override returns (uint32 newFuses) {
        require(_canModifyName(node, msg.sender), "Unauthorised");
        allFusesBurned[node] |= ownerControlledFuses;
        newFuses = allFusesBurned[node];
        emit FusesSet(node, newFuses);
        return newFuses;
    }

    function upgrade(
        bytes32 parentNode,
        string calldata label,
        address wrappedOwner,
        address resolver
    ) external override {
        // Upgrade logic - simplified
    }

    function setResolver(bytes32 node, address resolver) external override {
        require(_canModifyName(node, msg.sender), "Unauthorised");
        tns.setResolver(node, resolver);
    }

    function unwrap(bytes32 node, address newOwner) external {
        require(balanceOf(msg.sender, uint256(node)) > 0, "Not owner");
        _burn(msg.sender, uint256(node), 1);
        tns.setOwner(node, newOwner);
        emit NameUnwrapped(node, newOwner);
    }

    function _makeNode(bytes32 node, bytes32 labelhash) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(node, labelhash));
    }

    function _canModifyName(bytes32 node, address addr) internal view returns (bool) {
        return balanceOf(addr, uint256(node)) > 0 || controllers[addr];
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
