// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.8.0;

contract ProxyStorage {
    address public admin;
    address public pendingAdmin;
    address public implementation;
    address public pendingImplementation;
}

contract Proxy is ProxyStorage {
    event NewPendingImplementation(address oldPendingImplementation, address newPendingImplementation);
    event NewImplementation(address oldImplementation, address newImplementation);
    event NewPendingAdmin(address oldPendingAdmin, address newPendingAdmin);
    event NewAdmin(address oldAdmin, address newAdmin);

    constructor() {
        admin = msg.sender;
    }

    /*** Admin Functions ***/
    function _setPendingImplementation(address newPendingImplementation) public {
        require(msg.sender == admin, "set pending implementation owner check");

        address oldPendingImplementation = pendingImplementation;
        pendingImplementation = newPendingImplementation;

        emit NewPendingImplementation(oldPendingImplementation, pendingImplementation);
    }

    function _acceptImplementation() public {
        require(msg.sender == pendingImplementation, "accept pending implementation address check");

        address oldImplementation = implementation;
        address oldPendingImplementation = pendingImplementation;
        implementation = pendingImplementation;
        pendingImplementation = address(0);

        emit NewImplementation(oldImplementation, implementation);
        emit NewPendingImplementation(oldPendingImplementation, pendingImplementation);
    }

    function _setPendingAdmin(address newPendingAdmin) public {
        require(msg.sender == admin, "set pending admin owner check");

        address oldPendingAdmin = pendingAdmin;
        pendingAdmin = newPendingAdmin;

        emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin);
    }

    function _acceptAdmin() public {
        require(msg.sender == pendingAdmin, "accept admin pending admin check");

        address oldAdmin = admin;
        address oldPendingAdmin = pendingAdmin;
        admin = pendingAdmin;
        pendingAdmin = address(0);

        emit NewAdmin(oldAdmin, admin);
        emit NewPendingAdmin(oldPendingAdmin, pendingAdmin);
    }

    function _delegate(address implementation) internal virtual {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())

            // Call the implementation.
            // out and outsize are 0 because we don't know the size yet.
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)

            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())

            switch result
            // delegatecall returns 0 on error.
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    function _implementation() internal view returns (address) {
        return implementation;
    }

    fallback () external payable virtual {
        _delegate(_implementation());
    }

    receive () external payable virtual {
        _delegate(_implementation());
    }
}

contract ProxyImpl is ProxyStorage {
    event Become(address proxy, uint256 at);

    function _become(Proxy proxy) public {
        require(msg.sender == proxy.admin(), "only admin can change brains");
        proxy._acceptImplementation();

        emit Become(address(proxy), block.timestamp);
    }
}
