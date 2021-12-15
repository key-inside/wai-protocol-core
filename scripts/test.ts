import { Contract, ContractFactory, utils, BigNumber } from "ethers";
import { network, ethers, deployments, config } from "hardhat";
import { formatETH, getContract } from "./utils";

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  const [operator, treasury, fee] = await ethers.getSigners();
  const ETH = utils.parseEther("1.0");

  console.log(
    "current block number, chainId = ",
    await ethers.provider.getBlockNumber(),
    chainId
  );

  console.log("treasury address = ", treasury.address);
  console.log(
    "treasury eth balance = ",
    utils.formatEther(await ethers.provider.getBalance(treasury.address))
  );

  const wai = await getContract(ethers, "WAI");
  const wmlk = await getContract(ethers, "WMLK");
  const wpci = await getContract(ethers, "WPCI");
  const pla = await getContract(ethers, "PLA");
  const vault = await getContract(ethers, "Vault");

  // $$$$ APPROVE ALL
  // await wmlk
  //   .connect(treasury)
  //   .approve(vault.address, ethers.constants.MaxUint256);
  // await wpci
  //   .connect(treasury)
  //   .approve(vault.address, ethers.constants.MaxUint256);
  // await pla
  //   .connect(treasury)
  //   .approve(vault.address, ethers.constants.MaxUint256);
  // await wai
  //   .connect(treasury)
  //   .approve(vault.address, ethers.constants.MaxUint256);

  const waiPrice = await vault.getWAIPrice();
  console.log("wai price = ", formatETH(waiPrice));

  // Single Mint Test
  // await vault
  //   .connect(treasury)
  //   .mintWAI([pla.address], [utils.parseEther("100")], waiPrice);

  // Multi Mint Test
  // await vault
  //   .connect(treasury)
  //   .mintWAI(
  //     [wmlk.address, pla.address, wpci.address],
  //     [
  //       utils.parseUnits("50", 8),
  //       utils.parseEther("10"),
  //       utils.parseUnits("500", 8),
  //     ],
  //     waiPrice
  //   );

  // Burn Test
  // await vault.connect(treasury).burnWAI(utils.parseEther("1200"), waiPrice);

  console.log(
    "wai balance = ",
    formatETH(await wai.balanceOf(treasury.address))
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
