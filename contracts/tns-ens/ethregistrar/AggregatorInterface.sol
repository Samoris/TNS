//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface AggregatorInterface {
    function latestAnswer() external view returns (int256);
}
