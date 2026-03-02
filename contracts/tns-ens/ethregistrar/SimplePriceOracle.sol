pragma solidity >=0.4.24;

import "./PriceOracle.sol";

contract SimplePriceOracle is PriceOracle {
    uint public rentPrice;

    event RentPriceChanged(uint price);

    constructor(uint _rentPrice) public {
        setPrice(_rentPrice);
    }

    function setPrice(uint _rentPrice) public {
        rentPrice = _rentPrice;
        emit RentPriceChanged(_rentPrice);
    }

    function price(string calldata name, uint expires, uint duration) external view returns(uint) {
        return rentPrice * duration;
    }
}
