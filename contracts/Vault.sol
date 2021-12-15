// SPDX-License-Identifier: UNLICENSED
pragma solidity >= 0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./interfaces/IERC20Detailed.sol";
import "./interfaces/IPriceOracle.sol";
import "./Proxy.sol";

interface WAILike {
    function mint(address recipient, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
    function isOperator() external returns (bool);
    function operator() external view returns (address);
}

contract VaultStorage is ProxyStorage {
    bool internal _notEntered;
    bool public initialized;
    bool public protocolPaused;

    IPriceOracle public oracle;

    address public wai;
    address public treasury;
    address public feeSetter;
    address public pausedGuardian;
    uint256 public mintFeeRatio;
    uint256 public burnFeeRatio;

    mapping (address => bool) public supportTokens;
    mapping (address => bool) public mintableTokens;
    mapping (address => uint256) public tokenBalances;
    address[] public allTokens;

    mapping (address => uint256) public tokensRatioLL;
    mapping (address => uint256) public tokensRatioMAX;
}

contract Vault is VaultStorage {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant tokenRatioTOTAL = 10000; // 100%

    event Initialized(address indexed executor, uint256 at);
    event MintInitialAmount(address indexed treasury, uint256 price, uint256 amount, uint256 at);
    event NewPriceOracle(IPriceOracle oldPriceOracle, IPriceOracle newPriceOracle);
    event NewPausedGuardian(address oldPausedGuardian, address newPausedGuardian);
    event ActionProtocolPaused(bool state);
    event AddSupportToken(address token, uint256 tokenRatioLL, uint256 tokenRatioMAX, uint256 at);
    event ChangeTokenRatio(address token, uint256 tokenRatioLL, uint256 tokenRatioMAX, uint256 at);
    event EnableToken(address token, uint256 at);
    event DisableToken(address token, uint256 at);
    event RemoveToken(address tokenOut, uint256 outAmount, address tokenIn, uint256 inAmount, uint256 at);
    event MintWAI(address indexed minter, uint256 amount, uint256 at);
    event BurnWAI(address indexed minter, uint256 amount, uint256 at);

    /* Modifier */
    function _become(Proxy proxy) public {
        require(msg.sender == proxy.admin(), "only admin can change brains");
        proxy._acceptImplementation();
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "RewardRoom: only admin can");
        _;
    }

    modifier checkOperator() {
        require(WAILike(wai).isOperator(), "need more permission");
        _;
    }

    modifier nonReentrant() {
        require(_notEntered, "re-entered");
        _notEntered = false;
        _;
        _notEntered = true; // get a gas-refund post-Istanbul
    }

    modifier onlyProtocolAllowed() {
        require(!protocolPaused, "protocol is paused");
        _;
    }

    /* Admin Function */
    function initialize(address _wai, address _treasury, address _feeSetter) public onlyAdmin {
        require(initialized == false, "already initialized");
        require(_wai != address(0), "!_wai");
        require(_treasury != address(0), "!_treasury");
        require(_feeSetter != address(0), "!_feeSetter");

        wai = _wai;
        treasury = _treasury;
        feeSetter = _feeSetter;
        pausedGuardian = msg.sender;
        mintFeeRatio = 1; // 0.01%
        burnFeeRatio = 1; // 0.01%

        initialized = true;
        _notEntered = true;

        emit Initialized(msg.sender, block.timestamp);
    }

    function setPriceOracle(IPriceOracle _oracle) public onlyAdmin {
        require(address(_oracle) != address(0));
        
        IPriceOracle oldOracle = oracle;
        oracle = _oracle;
        
        emit NewPriceOracle(oldOracle, oracle);
    }

    function setPausedGuardian(address _pausedGuardian) public {
        require(_pausedGuardian != address(0), "!pausedGuardian");
        require(msg.sender == pausedGuardian || msg.sender == admin, "only pausedGuardian or admin can");

        address oldPausedGuardian = pausedGuardian;
        pausedGuardian = _pausedGuardian;

        emit NewPausedGuardian(oldPausedGuardian, pausedGuardian);
    }

    function setProtocolPaused(bool state) public {
        require(msg.sender == pausedGuardian || msg.sender == admin, "only pausedGuardian or admin can");
        protocolPaused = state;

        emit ActionProtocolPaused(state);
    }

    function setFeeRatio(uint256 _mintFeeRatio, uint256 _burnFeeRatio) public {
        require(msg.sender == admin || msg.sender == feeSetter, "not allowed");
        require(_mintFeeRatio >= 0 && _mintFeeRatio <= 300, "out or range"); // 0% ~ 3%
        require(_burnFeeRatio >= 0 && _burnFeeRatio <= 300, "out or range"); // 0% ~ 3%

        mintFeeRatio = _mintFeeRatio;
        burnFeeRatio = _burnFeeRatio;
    }

    function changeFeeSetter(address _feeSetter) public {
        require(msg.sender == admin || msg.sender == feeSetter, "not allowed");
        require(feeSetter != address(0), "!_feeSetter");
        feeSetter = _feeSetter;
    }

    function supportToken(address _token, uint256 _tokenRatioLL, uint256 _tokenRatioMax) public onlyAdmin {
        require(!supportTokens[_token], "already supported");
        require(_tokenRatioLL >= 0, "out of range");
        require(_tokenRatioMax >= _tokenRatioLL && _tokenRatioMax <= tokenRatioTOTAL, "out of range");

        supportTokens[_token] = true;
        mintableTokens[_token] = true;
        for (uint i = 0; i < allTokens.length; i ++) {
            require(allTokens[i] != _token, "already supported");
        }
        allTokens.push(_token);
        tokensRatioLL[_token] = _tokenRatioLL;
        tokensRatioMAX[_token] = _tokenRatioMax;

        emit AddSupportToken(_token, _tokenRatioLL, _tokenRatioMax, block.timestamp);
    }

    function enableToken(address _token) public onlyAdmin {
        require(supportTokens[_token], "not supported");
        require(!mintableTokens[_token], "already mintable");

        mintableTokens[_token] = true;

        emit EnableToken(_token, block.timestamp);
    }


    function disableToken(address _token) public onlyAdmin {
        require(supportTokens[_token], "not supported");
        require(mintableTokens[_token], "not mintable");

        mintableTokens[_token] = false;

        emit DisableToken(_token, block.timestamp);
    }

    function changeTokenRatio(address _token, uint256 _tokenRatioLL, uint256 _tokenRatioMax) public onlyAdmin {
        require(supportTokens[_token], "not supported");
        require(_tokenRatioLL >= 0, "out of range");
        require(_tokenRatioMax >= _tokenRatioLL && _tokenRatioMax <= tokenRatioTOTAL, "out of range");

        tokensRatioLL[_token] = _tokenRatioLL;
        tokensRatioMAX[_token] = _tokenRatioMax;

        emit AddSupportToken(_token, _tokenRatioLL, _tokenRatioMax, block.timestamp);
    }

    function mintInitialAmount(uint256 _price) public onlyAdmin {
        require(IERC20(wai).totalSupply() == 0, "already minted");

        uint256 tvl;
        for (uint i = 0; i < allTokens.length; i ++) {
            uint256 tokenPrice = oracle.getPrice(allTokens[i]);
            uint256 balance = IERC20(allTokens[i]).balanceOf(address(this));

            tokenBalances[allTokens[i]] = balance; // update balance!

            uint decimals = IERC20Detailed(allTokens[i]).decimals();            
            uint256 balanceETH = balance.mul(10**(18-decimals));
            tvl = tvl.add(balanceETH.mul(tokenPrice).div(1e18));
        }
        uint256 amount = tvl.mul(1e18).div(_price);

        WAILike(wai).mint(treasury, amount);

        emit MintInitialAmount(treasury, _price, amount, block.timestamp);
    }

    function emergencyWithdraw(address _token) public onlyAdmin {
        require(IERC20(wai).totalSupply() == 0, "already minted");
        require(treasury != address(0), "!treasury");

        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "no balance");

        IERC20(_token).safeTransfer(treasury, balance); 
    }

    struct RemoveTokenLocalVars {
        uint256 tokenOutPrice;
        uint256 tokenInPrice;
        
        uint256 balanceOut;
        uint256 balanceIn;
        uint256 balanceOutETH;
        uint256 balanceInETH;
        uint256 decimalsOut;
        uint256 decimalsIn;
    }

    function removeToken(address _tokenOut, address _tokenIn) public onlyAdmin {
        require(supportTokens[_tokenOut], "not supported token");
        require(supportTokens[_tokenIn], "not supported token");

        RemoveTokenLocalVars memory vars;

        vars.tokenOutPrice = oracle.getPrice(_tokenOut);
        vars.tokenInPrice = oracle.getPrice(_tokenIn);
        
        require(vars.tokenOutPrice > 0, "invalid price");
        require(vars.tokenInPrice > 0, "invalid price");

        vars.balanceOut = tokenBalances[_tokenOut];
        vars.decimalsOut = IERC20Detailed(_tokenOut).decimals();
        vars.balanceOutETH = vars.balanceOut.mul(10**(18-vars.decimalsOut));

        require(IERC20(_tokenOut).balanceOf(address(this)) >= vars.balanceOut, "insufficient outToken balance");

        uint256 value = vars.balanceOutETH.mul(vars.tokenOutPrice).div(1e18);
        vars.balanceInETH = value.mul(1e18).div(vars.tokenInPrice);
        vars.decimalsIn = IERC20Detailed(_tokenIn).decimals();

        vars.balanceIn = vars.balanceInETH.div(10**(18-vars.decimalsIn));
        uint256 vaultBalance = IERC20(_tokenIn).balanceOf(address(this));
        require(vaultBalance >= vars.balanceIn, "insufficient inToken balance");

        IERC20(_tokenOut).safeTransfer(treasury, vars.balanceOut);

        uint256 dust = vaultBalance.sub(vars.balanceIn);
        if (dust > 0) {
            IERC20(_tokenIn).safeTransfer(treasury, dust);
        }
        supportTokens[_tokenOut] = false;
        tokenBalances[_tokenOut] = 0;
        tokenBalances[_tokenIn] = tokenBalances[_tokenIn].add(vars.balanceIn);

        emit RemoveToken(_tokenOut, vars.balanceOut, _tokenIn, vars.balanceIn, block.timestamp);
    }

    /* Internal Function */
    function getVaildTokens() internal view returns (address[] memory _tokens) {
        uint256 nToken;
        uint256 maxToken;

        for (uint i = 0; i < allTokens.length; i ++) {
            if (!supportTokens[allTokens[i]]) continue;
            maxToken = maxToken + 1;        
        }
        _tokens = new address[](maxToken);
        
        for (uint i = 0; i < allTokens.length; i ++) {
            if (!supportTokens[allTokens[i]]) continue;
            _tokens[nToken] = allTokens[i];
            nToken = nToken + 1;
        }
    }

    function _mintWAI(address _account, uint256 _amount) internal checkOperator {
        WAILike(wai).mint(_account, _amount);
        emit MintWAI(_account, _amount, block.timestamp);
    }

    function _burnWAI(address _account, uint256 _amount) internal checkOperator {
        WAILike(wai).burnFrom(_account, _amount);
        emit BurnWAI(_account, _amount, block.timestamp);
    }

    /* View Function */
    function getWAIPrice() public view returns (uint256 _price) {
        uint256 tvl = getTotalLockValue();
        _price = tvl.mul(1e18).div(IERC20(wai).totalSupply());
    }

    function getTotalLockValue() public view returns (uint256 _sumValue) {
        for (uint i = 0; i < allTokens.length; i ++) {
            if (!supportTokens[allTokens[i]]) continue;

            uint256 tokenPrice = oracle.getPrice(allTokens[i]);
            if (tokenPrice == 0) continue;

            uint256 balance = tokenBalances[allTokens[i]];
            uint decimals = IERC20Detailed(allTokens[i]).decimals();
            balance = balance.mul(10**(18-decimals));
            _sumValue = _sumValue.add(balance.mul(tokenPrice).div(1e18));
        }
    }

    function getCurrentTokenRatio() public view returns (uint256 _tvl, address[] memory _validTokens, uint256[] memory _tokenRatio, uint256 _sum) {
        _tvl = getTotalLockValue();
        _validTokens = getVaildTokens();
        _tokenRatio = new uint256[](_validTokens.length);

        for (uint i = 0; i < _validTokens.length; i ++) {
            uint256 tokenPrice = oracle.getPrice(_validTokens[i]);
            uint256 balance = tokenBalances[_validTokens[i]];
            uint decimals = IERC20Detailed(_validTokens[i]).decimals();
            balance = balance.mul(10**(18-decimals));

            uint256 value = balance.mul(tokenPrice).div(1e18);
            _tokenRatio[i] = value.mul(1e4).div(_tvl);
            _sum = _sum + _tokenRatio[i];
        }
    }

    /* Mutable Function */
    struct MintWAILocalVars {
        uint256 mintValue;
        uint256 tvl;
        address[] validTokens;
        uint256[] tokenRatio;
        uint256 sumRatio;
    }

    function mintWAI(address[] memory _tokens, uint256[] memory _amounts, uint256 _targetPrice) public nonReentrant onlyProtocolAllowed {
        require(_tokens.length == _amounts.length, "wrong params");

        uint256 waiPrice = getWAIPrice(); // current price
        require(waiPrice == _targetPrice, "target price moved");

        MintWAILocalVars memory vars;
        for (uint i = 0; i < _tokens.length; i ++) {
            require(supportTokens[_tokens[i]], "not supported token");
            require(mintableTokens[_tokens[i]], "not mintable token");

            uint256 tokenPrice = oracle.getPrice(_tokens[i]);
            require(tokenPrice > 0, "invalid price");
            require(_amounts[i] > 0, "invalid amount");

            uint decimals = IERC20Detailed(_tokens[i]).decimals();
            uint256 balance = _amounts[i].mul(10**(18-decimals));
            vars.mintValue = vars.mintValue.add(balance.mul(tokenPrice).div(1e18));

            IERC20(_tokens[i]).safeTransferFrom(msg.sender, address(this), _amounts[i]);
            tokenBalances[_tokens[i]] = tokenBalances[_tokens[i]].add(_amounts[i]); // update balance!
        }

        (vars.tvl, vars.validTokens, vars.tokenRatio, vars.sumRatio) = getCurrentTokenRatio();

        for (uint i = 0; i < vars.validTokens.length; i ++) {
            if (tokensRatioLL[vars.validTokens[i]] > 0) {
                require (vars.tokenRatio[i] >= tokensRatioLL[vars.validTokens[i]], "under ratio");
            }
            if (tokensRatioMAX[vars.validTokens[i]] > 0) {
                require (vars.tokenRatio[i] <= tokensRatioMAX[vars.validTokens[i]], "over ratio");
            }
        }

        uint256 mintAmount = vars.mintValue.mul(1e18).div(waiPrice);

        // fee
        if (mintFeeRatio > 0) {
            uint256 fee = mintAmount.mul(mintFeeRatio).div(10000);
            mintAmount = mintAmount.sub(fee);
            if (fee > 0) _mintWAI(feeSetter, fee);
        }

        _mintWAI(msg.sender, mintAmount);
    }
    
    struct BurnWAILocalVars {
        uint256 tvl;
        uint256 waiPrice;
        address[] validTokens;
    }

    function burnWAI(uint256 _amount, uint256 _targetPrice) public nonReentrant onlyProtocolAllowed {
        BurnWAILocalVars memory vars;

        vars.tvl = getTotalLockValue();
        vars.waiPrice = vars.tvl.mul(1e18).div(IERC20(wai).totalSupply());

        require(vars.waiPrice == _targetPrice, "target price moved");

        vars.validTokens = getVaildTokens();

        uint256 burnValue = _amount.mul(vars.waiPrice).div(1e18);

        for (uint i = 0; i < vars.validTokens.length; i ++) {
            uint256 balance = tokenBalances[vars.validTokens[i]];
            uint256 amountOut = burnValue.mul(balance).div(vars.tvl);

            if (amountOut > 0) {
                require(IERC20(vars.validTokens[i]).balanceOf(address(this)) >= amountOut, "insufficient vault balance");
                tokenBalances[vars.validTokens[i]] = tokenBalances[vars.validTokens[i]].sub(amountOut); // update balance!

                // fee
                if (burnFeeRatio > 0) {
                    uint256 fee = amountOut.mul(burnFeeRatio).div(10000);
                    amountOut = amountOut.sub(fee);
                    if (fee > 0) IERC20(vars.validTokens[i]).safeTransfer(feeSetter, fee);
                }
                IERC20(vars.validTokens[i]).safeTransfer(msg.sender, amountOut);
            }
        }

        _burnWAI(msg.sender, _amount);
    }
}
