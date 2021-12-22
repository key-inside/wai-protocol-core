interface TimeConfigType {
  [key: string]: any;
}

export const TimeConfig: TimeConfigType = {
  1337: {},
  42: {},
  1: {},
};

interface BlockConfigType {
  [key: string]: any;
}

export const BlockConfig: BlockConfigType = {
  1337: {},
  42: {},
  1: {},
};

interface ContractInfoType {
  [key: string]: any;
}

export const ContractInfo: ContractInfoType = {
  1337: {
    // Internal contract
    // External contract
  },
  42: {
    // Internal contract
    WAI: {
      address: "0x9909358a55f337863FD5F9617d1f641E322cc713",
      abi: require("./abi/WAI.json"),
    },
    OracleWrapper: {
      address: "0x0D0F7fBC7b0461a9635aC0F476Cd028E250a2ea6",
      abi: require("./abi/OracleWrapper.json"),
    },
    UniswapV3PriceOracle: {
      address: "0x4697cb60363B133B7d750bDC00871CD6e207495F",
      abi: require("./abi/UniswapV3PriceOracle.json"),
    },
    Vault: {
      address: "0x70Ea3ecdbc20897C8a04818185a465BB54309551",
      abi: require("./abi/Vault.json"),
    },
    VaultImpl: {
      address: "0x88E1A3bb1f7abC4f6ebE627271805E006e202975",
      abi: require("./abi/Vault.json"),
    },

    // External contract
    WMLK: {
      address: "0x378620EC61c41Ecdb2683a8F2355502a403b4785",
      abi: require("./scripts/abi/erc20.json"),
    },
    WPCI: {
      address: "0xa4edf84181141400e8766dcd1113a21cff0aed78",
      abi: require("./scripts/abi/erc20.json"),
    },
    PLA: {
      address: "0xe9857fCee32518e96CA7113108Aa1448845d84C0",
      abi: require("./scripts/abi/erc20.json"),
    },
    "ETH-WMLK": {
      address: "0x574c1f76a5779e2e2ace57392fc10f3faab1099d",
      abi: require("./scripts/abi/erc20.json"),
    },
    "ETH-WPCI": {
      address: "0x60613312e55ed33da5afca5d8a1b2162b3e539a7",
      abi: require("./scripts/abi/erc20.json"),
    },
    "ETH-PLA": {
      address: "0x5fdfeb096327bd23bf49b7b08d66bbdb4cc05fa5",
      abi: require("./scripts/abi/erc20.json"),
    },
  },
  1: {
    // Internal contract
    // External contract
  },
};
