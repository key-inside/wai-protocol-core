import { Contract, ContractFactory, utils, BigNumber } from "ethers";
import { network, ethers, deployments, config } from "hardhat";
import { getContract, formatETH } from "./utils";

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const [operator] = await ethers.getSigners();
  const ETH = utils.parseEther("1.0");

  console.log(
    "current block number, chainId = ",
    await ethers.provider.getBlockNumber(),
    chainId
  );

  console.log("operator address = ", operator.address);
  console.log(
    "operator eth balance = ",
    utils.formatEther(await ethers.provider.getBalance(operator.address))
  );

  // const UniswapV3PriceOracle = await ethers.getContractFactory(
  //   "UniswapV3PriceOracle"
  // );
  // const v3oracle = await UniswapV3PriceOracle.connect(operator).deploy();
  // console.log("v3oracle = ", v3oracle.address);

  const v3oracle = await getContract(ethers, "UniswapV3PriceOracle");
  // await v3oracle
  //   .connect(operator)
  //   .setPair(
  //     "0x378620EC61c41Ecdb2683a8F2355502a403b4785", // WMLK
  //     "0x574c1f76a5779e2e2ace57392fc10f3faab1099d" // WMLK-ETH
  //   );
  // await v3oracle
  //   .connect(operator)
  //   .setPair(
  //     "0xa4edf84181141400e8766dcd1113a21cff0aed78", // WPCI
  //     "0x60613312e55ed33da5afca5d8a1b2162b3e539a7" // WPCI-ETH
  //   );
  // await v3oracle
  //   .connect(operator)
  //   .setPair(
  //     "0xe9857fCee32518e96CA7113108Aa1448845d84C0", // PLA
  //     "0x5fdfeb096327bd23bf49b7b08d66bbdb4cc05fa5" // PLA-ETH
  //   );
  // await v3oracle
  //   .connect(operator)
  //   .setPair(
  //     "0xd0A1E359811322d97991E03f863a0C30C2cF029C", // WETH
  //     "0x574c1f76a5779e2e2ace57392fc10f3faab1099d" // WMLK-WETH
  //   );

  const wmlk = await getContract(ethers, "WMLK");
  const wpci = await getContract(ethers, "WPCI");
  const pla = await getContract(ethers, "PLA");
  const wmlkprice = formatETH(await v3oracle.getPrice(wmlk.address));
  const wpciprice = formatETH(await v3oracle.getPrice(wpci.address));
  const plaprice = formatETH(await v3oracle.getPrice(pla.address));
  const ethwmlkprice = formatETH(
    await v3oracle.getPrice("0xd0A1E359811322d97991E03f863a0C30C2cF029C") // WETH
  );
  console.log("wmlk eth price = ", wmlkprice);
  console.log("wpci eth price = ", wpciprice);
  console.log("pla eth price = ", plaprice);
  console.log("eth wmlk price = ", ethwmlkprice);
  console.log("eth wmlk price = ", 1 / wmlkprice);
  console.log("eth wpci price = ", 1 / wpciprice);
  console.log("eth pla price = ", 1 / plaprice);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
