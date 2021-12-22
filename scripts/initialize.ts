import { Contract, ContractFactory, utils, BigNumber } from "ethers";
import { network, ethers, deployments, config } from "hardhat";
import { getContract, formatETH, formatUnits } from "./utils";
import proxyABI from "../abi/Proxy.json";
import vaultABI from "../abi/Vault.json";

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const [operator, treasury, fee] = await ethers.getSigners();
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

  // Vault SET IMPLIMENTATION!
  const _vault = new ethers.Contract(
    "0x70Ea3ecdbc20897C8a04818185a465BB54309551", //kovan
    // "", // mainnet
    proxyABI,
    ethers.provider
  );
  const _vaultImpl = new ethers.Contract(
    "0x88E1A3bb1f7abC4f6ebE627271805E006e202975", //kovan
    // "", // mainnet
    vaultABI,
    ethers.provider
  );
  // await _vault.connect(operator)._setPendingImplementation(_vaultImpl.address); // first
  // await _vaultImpl.connect(operator)._become(_vault.address); // second

  // Vault INITIALIZE
  const wai = await getContract(ethers, "WAI");
  const wmlk = await getContract(ethers, "WMLK");
  const wpci = await getContract(ethers, "WPCI");
  const pla = await getContract(ethers, "PLA");
  const oracle = await getContract(ethers, "OracleWrapper");
  const v3oracle = await getContract(ethers, "UniswapV3PriceOracle");
  const vault = await getContract(ethers, "Vault");

  // INITIALIZE ORACLE WRAPPER
  // await oracle.connect(operator).setPriceOracle(wmlk.address, v3oracle.address);
  // await oracle.connect(operator).setPriceOracle(wpci.address, v3oracle.address);
  // await oracle.connect(operator).setPriceOracle(pla.address, v3oracle.address);

  // $$$$$ Transfer WAI operator to mint, burn for Vault
  // await wai.connect(operator).transferOperator(vault.address);

  // await vault
  //   .connect(operator)
  //   .initialize(wai.address, treasury.address, fee.address);
  // await vault.connect(operator).setPriceOracle(oracle.address);
  // await vault.connect(operator).setFeeRatio(1, 1); // mint = 0.01%, burn = 0.01%

  // ADD TOKEN
  // await vault.connect(operator).supportToken(wmlk.address, 1000, 7000);
  // await vault.connect(operator).supportToken(wpci.address, 1000, 7000);
  // await vault.connect(operator).supportToken(pla.address, 1000, 7000);

  // SEND INITIAL AMOUNT
  // await wmlk
  //   .connect(operator)
  //   .transfer(vault.address, utils.parseUnits("4221", 8));
  // await wpci
  //   .connect(operator)
  //   .transfer(vault.address, utils.parseUnits("5050", 8));
  // await pla
  //   .connect(operator)
  //   .transfer(vault.address, utils.parseUnits("4613", 18));

  // $$$$ MINT INITIAL AMOUNT
  // await vault.connect(operator).mintInitialAmount(utils.parseEther("0.01")); // mint 0.01 ether price

  // CHECK TREASURY STATE & ORACLE
  console.log("vault treasury = ", await vault.treasury());
  console.log("vault oracle = ", await vault.oracle());
  console.log("wmlk price = ", formatETH(await oracle.getPrice(wmlk.address)));
  console.log("wpci price = ", formatETH(await oracle.getPrice(wpci.address)));
  console.log("pla price = ", formatETH(await oracle.getPrice(pla.address)));

  console.log(
    "vault wmlk balance = ",
    formatUnits(await wmlk.balanceOf(vault.address), 8),
    formatUnits(await vault.tokenBalances(wmlk.address), 8)
  );
  console.log(
    "vault wpci balance = ",
    formatUnits(await wpci.balanceOf(vault.address), 8),
    formatUnits(await vault.tokenBalances(wpci.address), 8)
  );
  console.log(
    "vault pla balance = ",
    formatETH(await pla.balanceOf(vault.address)),
    formatETH(await vault.tokenBalances(pla.address))
  );
  console.log(
    "treasury wai balance = ",
    formatETH(await wai.balanceOf(treasury.address))
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
