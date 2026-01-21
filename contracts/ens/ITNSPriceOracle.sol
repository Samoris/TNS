// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface ITNSPriceOracle {
    struct Price {
        uint256 base;
        uint256 premium;
    }

    function price(string calldata name, uint256 expires, uint256 duration) external view returns (Price memory);
}
