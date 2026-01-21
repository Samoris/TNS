//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @dev Multicallable contract for batching resolver calls.
 * Exact port from ENS.
 */
abstract contract Multicallable is ERC165 {
    error Unauthorised();

    function multicall(
        bytes[] calldata data
    ) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(
                data[i]
            );
            require(success);
            results[i] = result;
        }
        return results;
    }

    function multicallWithNodeCheck(
        bytes32 nodehash,
        bytes[] calldata data
    ) external returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            // Check that the node in the calldata matches
            bytes memory callData = data[i];
            bytes32 nodeInCall;
            assembly {
                nodeInCall := mload(add(callData, 36))
            }
            if (nodeInCall != nodehash) {
                revert Unauthorised();
            }
            (bool success, bytes memory result) = address(this).delegatecall(
                data[i]
            );
            require(success);
            results[i] = result;
        }
        return results;
    }
}
