//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./StablePriceOracle.sol";
import "./AggregatorInterface.sol";

contract ExponentialPremiumPriceOracle is StablePriceOracle {
    uint256 constant GRACE_PERIOD = 90 days;
    uint256 immutable startPremium;
    uint256 immutable endValue;

    constructor(
        AggregatorInterface _usdOracle,
        uint256[] memory _rentPrices,
        uint256 _startPremium,
        uint256 _totalDays
    ) StablePriceOracle(_usdOracle, _rentPrices) {
        startPremium = _startPremium;
        endValue = _startPremium >> _totalDays;
    }

    function _premium(
        string memory,
        uint256 expires,
        uint256
    ) internal view override returns (uint256) {
        expires = expires + GRACE_PERIOD;
        if (expires > block.timestamp) {
            return 0;
        }

        uint256 elapsed = block.timestamp - expires;
        uint256 premium = decayedPremium(elapsed);
        if (premium >= endValue) {
            return premium - endValue;
        }
        return 0;
    }

    function decayedPremium(
        uint256 elapsed
    ) public view returns (uint256) {
        uint256 daysPassed = elapsed / 1 days;
        uint256 intPremium = startPremium >> daysPassed;
        uint256 fraction = (elapsed % 1 days);
        uint256 fractionPremium = (intPremium * fraction) / (2 days);
        return intPremium - fractionPremium;
    }
}
