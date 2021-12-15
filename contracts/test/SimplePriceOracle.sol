// SPDX-License-Identifier: UNLICENSED
pragma solidity >= 0.5.0;

contract SimplePriceOracle {
    mapping(address => uint256) prices;

    function setPrice(address asset, uint price) public {
        prices[address(asset)] = price;
    }

    function getPrice(address asset) public view returns (uint) {
        return prices[address(asset)];
    }
}
