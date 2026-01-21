// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ============================================
// ENS-Style Price Oracle for TNS
// DEPLOY ORDER: 3 of 7
// Constructor: No parameters
//
// IMPORTANT: Select "TNSPriceOracle" from the dropdown
// ============================================

abstract contract Context {
    function _msgSender() internal view virtual returns (address) { return msg.sender; }
}

abstract contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() { _transferOwnership(_msgSender()); }

    modifier onlyOwner() { require(owner() == _msgSender(), "Ownable: caller is not the owner"); _; }

    function owner() public view virtual returns (address) { return _owner; }

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

library StringUtils {
    /**
     * @dev Returns the length of a given string
     * @param s The string to measure the length of
     * @return The length of the input string
     */
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

interface IPriceOracle {
    struct Price {
        uint256 base;
        uint256 premium;
    }

    /**
     * @dev Returns the price to register or renew a name.
     * @param name The name being registered or renewed.
     * @param expires When the name presently expires (0 if this is a new registration).
     * @param duration How long the name is being registered or extended for, in seconds.
     * @return base premium tuple of base price + premium price
     */
    function price(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view returns (Price calldata);
}

/**
 * @dev A price oracle for TNS that uses tiered pricing based on name length.
 *      Prices are in native TRUST tokens (wei).
 *      3 char: 100 TRUST/year
 *      4 char: 70 TRUST/year
 *      5+ char: 30 TRUST/year
 */
contract TNSPriceOracle is IPriceOracle, Ownable {
    using StringUtils for string;

    // Prices per year in wei (1 TRUST = 1e18 wei)
    uint256 public price1Letter = 1000 ether;    // Premium for 1 letter (if enabled)
    uint256 public price2Letter = 500 ether;     // Premium for 2 letters (if enabled)
    uint256 public price3Letter = 100 ether;     // 100 TRUST per year
    uint256 public price4Letter = 70 ether;      // 70 TRUST per year
    uint256 public price5Letter = 30 ether;      // 30 TRUST per year

    event RentPriceChanged(uint256[] prices);

    constructor() {}

    function price(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view override returns (Price memory) {
        uint256 len = name.strlen();
        uint256 basePrice;

        if (len == 1) {
            basePrice = price1Letter;
        } else if (len == 2) {
            basePrice = price2Letter;
        } else if (len == 3) {
            basePrice = price3Letter;
        } else if (len == 4) {
            basePrice = price4Letter;
        } else {
            basePrice = price5Letter;
        }

        // Calculate price for duration
        // basePrice is per year, so we prorate for the actual duration
        uint256 totalPrice = (basePrice * duration) / 365 days;

        return Price({
            base: totalPrice,
            premium: _premium(name, expires, duration)
        });
    }

    /**
     * @dev Returns the premium price for a name.
     *      This can be used for auction/decay pricing on recently expired names.
     *      For now, returns 0 (no premium).
     */
    function _premium(
        string memory name,
        uint256 expires,
        uint256 duration
    ) internal view virtual returns (uint256) {
        return 0;
    }

    /**
     * @dev Sets rent prices for various name lengths.
     * @param _prices Array of prices: [1-letter, 2-letter, 3-letter, 4-letter, 5+-letter]
     */
    function setPrices(uint256[] memory _prices) external onlyOwner {
        require(_prices.length == 5, "Must provide 5 prices");
        price1Letter = _prices[0];
        price2Letter = _prices[1];
        price3Letter = _prices[2];
        price4Letter = _prices[3];
        price5Letter = _prices[4];
        emit RentPriceChanged(_prices);
    }

    /**
     * @dev Returns the price per year for a given name length.
     */
    function getPricePerYear(uint256 len) external view returns (uint256) {
        if (len == 1) return price1Letter;
        if (len == 2) return price2Letter;
        if (len == 3) return price3Letter;
        if (len == 4) return price4Letter;
        return price5Letter;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IPriceOracle).interfaceId;
    }
}
