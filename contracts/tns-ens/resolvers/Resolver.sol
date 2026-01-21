//SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 <0.9.0;

import "../registry/TNS.sol";
import "./profiles/IAddrResolver.sol";
import "./profiles/INameResolver.sol";
import "./profiles/ITextResolver.sol";
import "./profiles/IContentHashResolver.sol";
import "./Multicallable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @dev PublicResolver for TNS.
 * Exact port of ENS PublicResolver.
 */
contract Resolver is
    IERC165,
    IAddrResolver,
    INameResolver,
    ITextResolver,
    IContentHashResolver,
    Multicallable
{
    TNS public immutable tns;
    address public trustedController;
    address public trustedReverseRegistrar;
    address public owner;

    mapping(bytes32 => mapping(uint256 => bytes)) versionable_addresses;
    mapping(bytes32 => uint64) public recordVersions;
    mapping(bytes32 => mapping(string => string)) versionable_texts;
    mapping(bytes32 => bytes) versionable_contenthashes;
    mapping(bytes32 => string) versionable_names;

    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(address => mapping(bytes32 => mapping(address => bool))) private _tokenApprovals;

    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Approved(address owner, bytes32 indexed node, address indexed delegate, bool indexed approved);
    event VersionChanged(bytes32 indexed node, uint64 newVersion);

    constructor(
        TNS _tns,
        address _trustedController,
        address _trustedReverseRegistrar
    ) {
        tns = _tns;
        trustedController = _trustedController;
        trustedReverseRegistrar = _trustedReverseRegistrar;
        owner = msg.sender;
    }

    modifier authorised(bytes32 node) {
        if (!isAuthorised(node)) {
            revert Unauthorised();
        }
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

    function isApprovedFor(address nodeOwner, bytes32 node, address delegate) public view returns (bool) {
        return _tokenApprovals[nodeOwner][node][delegate];
    }

    function clearRecords(bytes32 node) public authorised(node) {
        recordVersions[node]++;
        emit VersionChanged(node, recordVersions[node]);
    }

    // IAddrResolver
    function setAddr(bytes32 node, address a) external authorised(node) {
        setAddr(node, 60, addressToBytes(a));
    }

    function setAddr(bytes32 node, uint256 coinType, bytes memory a) public authorised(node) {
        emit AddressChanged(node, coinType, a);
        if (coinType == 60) {
            emit AddrChanged(node, bytesToAddress(a));
        }
        versionable_addresses[node][coinType] = a;
    }

    function addr(bytes32 node) public view override returns (address payable) {
        bytes memory a = addr(node, 60);
        if (a.length == 0) {
            return payable(0);
        }
        return bytesToAddress(a);
    }

    function addr(bytes32 node, uint256 coinType) public view override returns (bytes memory) {
        return versionable_addresses[node][coinType];
    }

    // INameResolver
    function setName(bytes32 node, string calldata newName) external authorised(node) {
        versionable_names[node] = newName;
        emit NameChanged(node, newName);
    }

    function name(bytes32 node) external view override returns (string memory) {
        return versionable_names[node];
    }

    // ITextResolver
    function setText(bytes32 node, string calldata key, string calldata value) external authorised(node) {
        versionable_texts[node][key] = value;
        emit TextChanged(node, key, key, value);
    }

    function text(bytes32 node, string calldata key) external view override returns (string memory) {
        return versionable_texts[node][key];
    }

    // IContentHashResolver
    function setContenthash(bytes32 node, bytes calldata hash) external authorised(node) {
        versionable_contenthashes[node] = hash;
        emit ContenthashChanged(node, hash);
    }

    function contenthash(bytes32 node) external view override returns (bytes memory) {
        return versionable_contenthashes[node];
    }

    // Admin functions
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

    function supportsInterface(bytes4 interfaceID) public pure override(IERC165, ERC165) returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IAddrResolver).interfaceId ||
            interfaceID == type(INameResolver).interfaceId ||
            interfaceID == type(ITextResolver).interfaceId ||
            interfaceID == type(IContentHashResolver).interfaceId;
    }

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
