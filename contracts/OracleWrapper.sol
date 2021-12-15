// SPDX-License-Identifier: UNLICENSED
pragma solidity >= 0.6.0;

import "./owner/Operator.sol";
import "./interfaces/IPriceOracle.sol";

contract OracleWrapper is Operator {
    mapping (address => IPriceOracle) priceOracles;

    event SetPriceOracle(address indexed asset, address oldOracle, address newOracle);

    function setPriceOracle(address asset, IPriceOracle oracle) public onlyOperator {
        require(asset != address(0), "!asset");
        require(address(oracle) != address(0), "!oracle");

        IPriceOracle oldOracle = priceOracles[asset];
        priceOracles[asset] = oracle;

        emit SetPriceOracle(asset, address(oldOracle), address(oracle));
    }

    function getPrice(address asset) public view returns (uint256) {
        IPriceOracle o = priceOracles[asset];
        
        require(address(o) != address(0), "!oracle");
        return o.getPrice(asset);
    }
}
