// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// DEPLOY ORDER: 3 of 7
// Constructor: No parameters
// ============================================

// OpenZeppelin Ownable (inline)
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

abstract contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// StringUtils library
library StringUtils {
    function strlen(string memory s) internal pure returns (uint256) {
        uint256 len;
        uint256 i = 0;
        uint256 bytelength = bytes(s).length;
        for (len = 0; i < bytelength; len++) {
            bytes1 b = bytes(s)[i];
            if (b < 0x80) {
                i += 1;
            } else if (b < 0xE0) {
                i += 2;
            } else if (b < 0xF0) {
                i += 3;
            } else if (b < 0xF8) {
                i += 4;
            } else if (b < 0xFC) {
                i += 5;
            } else {
                i += 6;
            }
        }
        return len;
    }
}

interface ITNSPriceOracle {
    struct Price {
        uint256 base;
        uint256 premium;
    }
    function price(string calldata name, uint256 expires, uint256 duration) external view returns (Price memory);
}

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
