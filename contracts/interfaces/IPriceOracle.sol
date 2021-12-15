// SPDX-License-Identifier: UNLICENSED
pragma solidity >= 0.5.0;

interface IPriceOracle {
    function getPrice(address asset) external view returns (uint256);
}
