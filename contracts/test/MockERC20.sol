// SPDX-License-Identifier: UNLICENSED
pragma solidity >= 0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(uint8 _decimals) ERC20("MockToken", "MOCK") {
        _setupDecimals(_decimals);
        _mint(msg.sender, 10000**_decimals);
    }

    function mint(address recipient_, uint256 amount_) public returns (bool) {
        uint256 balanceBefore = balanceOf(recipient_);
        _mint(recipient_, amount_);
        uint256 balanceAfter = balanceOf(recipient_);

        return balanceAfter > balanceBefore;
    }
}
