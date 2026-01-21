//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

/**
 * @dev Interface for the NameWrapper.
 * Simplified interface - full implementation optional.
 */
interface INameWrapper {
    function registerAndWrapETH2LD(
        string calldata label,
        address wrappedOwner,
        uint256 duration,
        address resolver,
        uint16 ownerControlledFuses
    ) external returns (uint256 registrarExpiry);

    function renew(
        uint256 tokenId,
        uint256 duration
    ) external returns (uint256 expires);

    function setSubnodeOwner(
        bytes32 parentNode,
        string calldata label,
        address owner,
        uint32 fuses,
        uint64 expiry
    ) external returns (bytes32 node);

    function setSubnodeRecord(
        bytes32 parentNode,
        string calldata label,
        address owner,
        address resolver,
        uint64 ttl,
        uint32 fuses,
        uint64 expiry
    ) external returns (bytes32 node);

    function setFuses(
        bytes32 node,
        uint16 ownerControlledFuses
    ) external returns (uint32 newFuses);

    function upgrade(
        bytes32 parentNode,
        string calldata label,
        address wrappedOwner,
        address resolver
    ) external;

    function setResolver(bytes32 node, address resolver) external;
}
