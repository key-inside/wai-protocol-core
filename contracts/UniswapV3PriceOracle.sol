// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/libraries/FixedPoint96.sol";
import "@uniswap/v3-core/contracts/libraries/FullMath.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IERC20Metadata.sol";

import "./owner/Operator.sol";

contract UniswapV3PriceOracle is Operator {
    address public constant uniV3Factory = 0x1F98431c8aD98523631AE4a59f267346ea31F984;

    mapping (address => address) public pairs;
    uint32 defaultTWAPInterval;

    function setPair(address asset, address pair) public onlyOperator {
        pairs[asset] = pair;
    }

    function setTWAPInterval(uint32 interval) public onlyOperator {
        require(interval >= 0, "!interval");
        defaultTWAPInterval = interval;
    }

    function getSqrtTwapX96(address uniswapV3Pool, uint32 twapInterval) public view returns (uint160 sqrtPriceX96) {
        if (twapInterval == 0) {
            // return the current price if twapInterval == 0
            (sqrtPriceX96, , , , , , ) = IUniswapV3Pool(uniswapV3Pool).slot0();
        } else {
            uint32[] memory secondsAgos = new uint32[](2);
            secondsAgos[0] = twapInterval; // from (before)
            secondsAgos[1] = 0; // to (now)

            (int56[] memory tickCumulatives, ) = IUniswapV3Pool(uniswapV3Pool).observe(secondsAgos);

            // tick(imprecise as it's an integer) to price
            sqrtPriceX96 = TickMath.getSqrtRatioAtTick(
                int24((tickCumulatives[1] - tickCumulatives[0]) / twapInterval)
            );
        }
    }

    function getTWAP(address asset, uint32 twapInterval) public view returns (uint256) {
        address pair = pairs[asset];
        require(pair != address(0), "!pair");

        uint160 sqrtPriceX96 = getSqrtTwapX96(pair, twapInterval);
        uint256 priceX96 = FullMath.mulDiv(sqrtPriceX96, sqrtPriceX96, FixedPoint96.Q96);
        
        address token0 = IUniswapV3Pool(pair).token0();
        address token1 = IUniswapV3Pool(pair).token1();
        uint decimals0 = IERC20Metadata(token0).decimals();
        uint decimals1 = IERC20Metadata(token1).decimals();

        uint256 price0 = FullMath.mulDiv(priceX96, 10**(decimals0 + 18 - decimals1), FixedPoint96.Q96);

        if (token0 == asset) return price0;
        else return FullMath.mulDiv(10**18, 10**18, price0);
    }

    function getPrice(address asset) public view returns (uint256) {
        return getTWAP(asset, defaultTWAPInterval);
    }
}
