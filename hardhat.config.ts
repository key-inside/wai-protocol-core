/**
 * @type import('hardhat/config').HardhatUserConfig
 */
import "hardhat-abi-exporter";
import "@nomiclabs/hardhat-waffle";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import { wallet } from "./wallet.config";

const accounts = {
  mnemonic:
    process.env.MNEMONIC ||
    "section latin bracket spring neither harsh alarm animal assault dice patrol dragon",
};

module.exports = {
  abiExporter: {
    path: "./abi",
    clear: true,
    flat: true,
    // only: [],
    // except: []
  },
  defaultNetwork: "hardhat",
  mocha: {
    timeout: 20000,
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
    },
    jo: {
      default: 1,
      // hardhat: 0,
    },
    lee: {
      default: 2,
      // hardhat: 0,
    },
    kim: {
      default: 3,
      // hardhat: 0,
    },
    park: {
      default: 4,
      // hardhat: 0,
    },
    yoon: {
      default: 5,
      // hardhat: 0,
    },
    dev: {
      // Default to 4
      default: 9,
      1337: 9, //chainId = 1337, equals ganache: 9
      // dev address mainnet
      // 1: "",
    },
  },
  // 1 : mainnet
  // 3 : ropsten
  // 42 : kovan
  networks: {
    mainnet: {
      url: "https://mainnet.infura.io/v3/6426389963a84575827ecf6a5ffcd3f8",
      live: true,
      chainId: 1,
      aveDeployments: true,
      tags: ["staging"],
      accounts: wallet.mainnet,
      gasPrice: 120 * 1000000000,
    },
    ganache: {
      url: `http://localhost:8545`,
      accounts,
      live: true,
      saveDeployments: true,
      tags: ["staging"],
      chainId: 1337,
    },
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ["local"],
    },
    hardhat: {
      // Seems to be a bug with this, even when false it complains about being unauthenticated.
      // Reported to HardHat team and fix is incoming
      // forking: {
      //   enabled: process.env.FORKING === "true",
      //   url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      // },
      live: false,
      saveDeployments: true,
      tags: ["test", "local"],
    },
    ropsten: {
      url: "https://ropsten.infura.io/v3/6426389963a84575827ecf6a5ffcd3f8",
      live: true,
      chainId: 3,
      saveDeployments: true,
      tags: ["staging"],
      accounts: wallet.ropsten,
    },
    kovan: {
      url: "https://kovan.infura.io/v3/6426389963a84575827ecf6a5ffcd3f8",
      live: true,
      chainId: 42,
      saveDeployments: true,
      tags: ["staging"],
      accounts: wallet.kovan,
    },
  },
  paths: {
    artifacts: "artifacts",
    cache: "cache",
    deploy: "deploy",
    deployments: "deployments",
    imports: "imports",
    sources: "contracts",
    tests: "test",
  },
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
};
