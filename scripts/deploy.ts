import { Contract, ContractFactory, utils, BigNumber } from "ethers";
import { network, ethers, deployments, config } from "hardhat";

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();
  const ETH = utils.parseEther("1.0");

  console.log(
    "current block number, chainId = ",
    await ethers.provider.getBlockNumber(),
    chainId
  );

  console.log("deployer address = ", deployer.address);
  console.log(
    "deployer eth balance = ",
    utils.formatEther(await ethers.provider.getBalance(deployer.address))
  );

  // deploy WAI
  // const WAI = await ethers.getContractFactory("WAI");
  // const wai = await WAI.connect(deployer).deploy();
  // console.log("wai = ", wai.address);
  // console.log("wai totalSupply = ", utils.formatEther(await wai.totalSupply()));

  // deploy OracleWrapper
  // const OracleWrapper = await ethers.getContractFactory("OracleWrapper");
  // const oracle = await OracleWrapper.connect(deployer).deploy();
  // console.log("oracle = ", oracle.address);

  // deploy UniswapV3PriceOracle
  // const UniswapV3PriceOracle = await ethers.getContractFactory(
  //   "UniswapV3PriceOracle"
  // );
  // const v3oracle = await UniswapV3PriceOracle.connect(deployer).deploy();
  // console.log("v3oracle = ", v3oracle.address);

  // deploy Vault, Proxy
  // const Proxy = await ethers.getContractFactory("Proxy");
  // const vault = await Proxy.connect(deployer).deploy();
  // console.log("vault = ", vault.address);
  // const Vault = await ethers.getContractFactory("Vault");
  // const vaultImpl = await Vault.connect(deployer).deploy();
  // console.log("vaultImpl = ", vaultImpl.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
