// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ITNSPriceOracle.sol";
import "./StringUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TNSPriceOracle is ITNSPriceOracle, Ownable {
    using StringUtils for string;

    uint256 public price3CharPerYear = 100 ether;
    uint256 public price4CharPerYear = 70 ether;
    uint256 public price5PlusCharPerYear = 30 ether;

    event PricesUpdated(uint256 price3Char, uint256 price4Char, uint256 price5PlusChar);

    function price(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view override returns (Price memory) {
        uint256 len = name.strlen();
        uint256 basePrice;

        if (len == 3) {
            basePrice = price3CharPerYear;
        } else if (len == 4) {
            basePrice = price4CharPerYear;
        } else {
            basePrice = price5PlusCharPerYear;
        }

        uint256 years = duration / 365 days;
        if (years == 0) years = 1;

        return Price({
            base: basePrice * years,
            premium: 0
        });
    }

    function setPrices(
        uint256 _price3Char,
        uint256 _price4Char,
        uint256 _price5PlusChar
    ) external onlyOwner {
        price3CharPerYear = _price3Char;
        price4CharPerYear = _price4Char;
        price5PlusCharPerYear = _price5PlusChar;
        emit PricesUpdated(_price3Char, _price4Char, _price5PlusChar);
    }

    function getPricePerYear(uint256 nameLength) external view returns (uint256) {
        if (nameLength == 3) return price3CharPerYear;
        if (nameLength == 4) return price4CharPerYear;
        return price5PlusCharPerYear;
    }
}
