// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// DEPLOY ORDER: 2 of 7
// Constructor Parameters:
//   _tns: TNSRegistry address (from step 1)
//   _baseNode: keccak256(abi.encodePacked(bytes32(0), keccak256("trust")))
// ============================================

// NOTE: In Remix, enable "optimization" and use compiler 0.8.17
// Import OpenZeppelin from npm (Remix supports this)
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ITNS {
    function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external returns (bytes32);
    function setResolver(bytes32 node, address resolver) external;
    function owner(bytes32 node) external view returns (address);
}

interface IBaseRegistrar is IERC721 {
    event ControllerAdded(address indexed controller);
    event ControllerRemoved(address indexed controller);
    event NameRegistered(uint256 indexed id, address indexed owner, uint256 expires);
    event NameRenewed(uint256 indexed id, uint256 expires);

    function addController(address controller) external;
    function removeController(address controller) external;
    function setResolver(address resolver) external;
    function nameExpires(uint256 id) external view returns (uint256);
    function available(uint256 id) external view returns (bool);
    function register(uint256 id, address owner, uint256 duration) external returns (uint256);
    function renew(uint256 id, uint256 duration) external returns (uint256);
    function reclaim(uint256 id, address owner) external;
}

contract TNSBaseRegistrar is ERC721, IBaseRegistrar, Ownable, ReentrancyGuard {
    mapping(uint256 => uint256) public expiries;
    ITNS public tns;
    bytes32 public baseNode;
    mapping(address => bool) public controllers;
    
    uint256 public constant GRACE_PERIOD = 90 days;
    
    string private _baseTokenURI;

    modifier live() {
        require(tns.owner(baseNode) == address(this), "Registrar not live");
        _;
    }

    modifier onlyController() {
        require(controllers[msg.sender], "Not a controller");
        _;
    }

    constructor(ITNS _tns, bytes32 _baseNode) ERC721("Trust Name Service", "TNS") {
        tns = _tns;
        baseNode = _baseNode;
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view override returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return (spender == tokenOwner || getApproved(tokenId) == spender || isApprovedForAll(tokenOwner, spender));
    }

    function ownerOf(uint256 tokenId) public view override(IERC721, ERC721) returns (address) {
        require(expiries[tokenId] > block.timestamp, "Name expired");
        return super.ownerOf(tokenId);
    }

    function addController(address controller) external override onlyOwner {
        controllers[controller] = true;
        emit ControllerAdded(controller);
    }

    function removeController(address controller) external override onlyOwner {
        controllers[controller] = false;
        emit ControllerRemoved(controller);
    }

    function setResolver(address resolver) external override onlyOwner {
        tns.setResolver(baseNode, resolver);
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function nameExpires(uint256 id) external view override returns (uint256) {
        return expiries[id];
    }

    function available(uint256 id) public view override returns (bool) {
        return expiries[id] + GRACE_PERIOD < block.timestamp;
    }

    function register(
        uint256 id,
        address owner,
        uint256 duration
    ) external override returns (uint256) {
        return _register(id, owner, duration, true);
    }

    function registerOnly(
        uint256 id,
        address owner,
        uint256 duration
    ) external returns (uint256) {
        return _register(id, owner, duration, false);
    }

    function _register(
        uint256 id,
        address owner,
        uint256 duration,
        bool updateRegistry
    ) internal live onlyController nonReentrant returns (uint256) {
        require(available(id), "Name not available");
        require(block.timestamp + duration + GRACE_PERIOD > block.timestamp + GRACE_PERIOD, "Duration overflow");

        expiries[id] = block.timestamp + duration;
        
        if (_exists(id)) {
            _burn(id);
        }
        _mint(owner, id);
        
        if (updateRegistry) {
            tns.setSubnodeOwner(baseNode, bytes32(id), owner);
        }

        emit NameRegistered(id, owner, block.timestamp + duration);
        return block.timestamp + duration;
    }

    function renew(uint256 id, uint256 duration) external override live onlyController nonReentrant returns (uint256) {
        require(expiries[id] + GRACE_PERIOD >= block.timestamp, "Name expired");
        require(expiries[id] + duration + GRACE_PERIOD > duration + GRACE_PERIOD, "Duration overflow");

        expiries[id] += duration;
        emit NameRenewed(id, expiries[id]);
        return expiries[id];
    }

    function reclaim(uint256 id, address owner) external override live {
        require(_isApprovedOrOwner(msg.sender, id), "Not approved");
        tns.setSubnodeOwner(baseNode, bytes32(id), owner);
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
