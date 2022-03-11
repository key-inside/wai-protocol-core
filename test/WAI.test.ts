import chai, { expect, util } from "chai";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { Contract, ContractFactory, BigNumber, utils } from "ethers";
import { Provider } from "@ethersproject/providers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import { advanceTimeAndBlock } from "./shared/utilities";

chai.use(solidity);

const HOUR = 3600;
const DAY = 86400;
const ETH = utils.parseEther("1");
const ZERO = BigNumber.from(0);
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

async function latestBlocktime(provider: any): Promise<number> {
  const { timestamp } = await provider.getBlock("latest");
  return timestamp;
}

describe("WAI", () => {
  const { provider } = ethers;

  let operator: SignerWithAddress;
  let treasury: SignerWithAddress;
  let fee: SignerWithAddress;
  let user: SignerWithAddress;

  before("provider & accounts setting", async () => {
    [operator, treasury, fee, user] = await ethers.getSigners();
  });

  // core
  let Proxy: ContractFactory;
  let WAI: ContractFactory;
  let Vault: ContractFactory;
  let ERC20: ContractFactory;
  let Oracle: ContractFactory;

  before("fetch contract factories", async () => {
    Proxy = await ethers.getContractFactory("Proxy");
    WAI = await ethers.getContractFactory("WAI");
    Vault = await ethers.getContractFactory("Vault");
    ERC20 = await ethers.getContractFactory("MockERC20");
    Oracle = await ethers.getContractFactory("SimplePriceOracle");
  });

  let wai: Contract;
  let vault: Contract;
  let pla: Contract;
  let mlk: Contract;
  let pci: Contract;
  let kusdt: Contract;
  let oracle: Contract;

  beforeEach("deploy contracts", async () => {
    wai = await WAI.connect(operator).deploy();
    pla = await ERC20.connect(operator).deploy(18);
    mlk = await ERC20.connect(operator).deploy(8);
    pci = await ERC20.connect(operator).deploy(8);
    kusdt = await ERC20.connect(operator).deploy(6);

    vault = await Proxy.connect(operator).deploy();
    const vaultImpl = await Vault.connect(operator).deploy();
    await vault.connect(operator)._setPendingImplementation(vaultImpl.address);
    await vaultImpl.connect(operator)._become(vault.address);
    vault = Vault.attach(vault.address);

    oracle = await Oracle.connect(operator).deploy();

    await vault.initialize(wai.address, treasury.address, fee.address);
    await vault.setPriceOracle(oracle.address);
    await vault.setFeeRatio(1, 1);

    await wai.connect(operator).transferOperator(vault.address); // transfer operator

    await pla.mint(treasury.address, utils.parseUnits("100000", 18));
    await mlk.mint(treasury.address, utils.parseUnits("100000", 8));
    await pci.mint(treasury.address, utils.parseUnits("100000", 8));
    await kusdt.mint(treasury.address, utils.parseUnits("100000", 6));

    await oracle.setPrice(pla.address, utils.parseEther("1.5")); // $1.5
    await oracle.setPrice(mlk.address, utils.parseEther("2")); // $2
    await oracle.setPrice(pci.address, utils.parseEther("1")); // $1
    await oracle.setPrice(kusdt.address, utils.parseEther("10")); // $10

    await vault.supportToken(pla.address, 1000, 7000);
    await vault.supportToken(mlk.address, 1000, 7000);
    await vault.supportToken(pci.address, 1000, 7000);

    await pla
      .connect(treasury)
      .transfer(vault.address, utils.parseUnits("20000", 18)); // 20000 * 1.5 = $30000
    await mlk
      .connect(treasury)
      .transfer(vault.address, utils.parseUnits("15000", 8)); // 15000 * 2 = $30000
    await pci
      .connect(treasury)
      .transfer(vault.address, utils.parseUnits("30000", 8)); // 30000 * 1 = $30000
    // total value = $90000
  });

  describe("mint initial amount", () => {
    it("mintInitialAmount", async () => {
      await vault.connect(operator).mintInitialAmount(utils.parseEther("10"));
      expect(await pla.balanceOf(vault.address)).to.eq(
        utils.parseUnits("20000", 18)
      );
      expect(await mlk.balanceOf(vault.address)).to.eq(
        utils.parseUnits("15000", 8)
      );
      expect(await pci.balanceOf(vault.address)).to.eq(
        utils.parseUnits("30000", 8)
      );
      // $90000 / $10 = 9000
      expect(await wai.balanceOf(treasury.address)).to.eq(
        utils.parseUnits("9000", 18)
      );
      await expect(
        vault.connect(operator).mintInitialAmount(utils.parseEther("10"))
      ).to.revertedWith("already minted");

      const {
        0: tvl,
        1: tokens,
        2: ratios,
      } = await vault.getCurrentTokenRatio();
      expect(ratios[0]).to.eq(BigNumber.from(10000).div(3));
      expect(ratios[1]).to.eq(BigNumber.from(10000).div(3));
      expect(ratios[2]).to.eq(BigNumber.from(10000).div(3));

      expect(await vault.getWAIPrice()).to.eq(utils.parseEther("10"));
    });
  });

  describe("mint test", () => {
    beforeEach("mint initial", async () => {
      await vault.connect(operator).mintInitialAmount(utils.parseEther("10"));
      await mlk.mint(user.address, utils.parseUnits("3000", 8));
      await pci.mint(user.address, utils.parseUnits("3000", 8));
      await pla.mint(user.address, utils.parseUnits("3000", 18));
      await mlk
        .connect(user)
        .approve(vault.address, ethers.constants.MaxUint256);
      await pci
        .connect(user)
        .approve(vault.address, ethers.constants.MaxUint256);
      await pla
        .connect(user)
        .approve(vault.address, ethers.constants.MaxUint256);
    });
    it("mint single", async () => {
      await expect(
        vault
          .connect(user)
          .mintWAI(
            [mlk.address],
            [utils.parseUnits("3000", 8)],
            utils.parseEther("11")
          )
      ).to.revertedWith("target price moved");
      expect(
        await vault
          .connect(user)
          .mintWAI(
            [mlk.address],
            [utils.parseUnits("3000", 8)],
            utils.parseEther("10")
          )
      )
        .to.emit(wai, "Transfer")
        .withArgs(ZERO_ADDR, user.address, utils.parseEther("599.94"));
      // fee is 0.01%, 600 WAI * 99.99% = 599.94
      expect(await wai.balanceOf(user.address)).to.eq(
        utils.parseEther("599.94")
      );
      expect(await pla.balanceOf(vault.address)).to.eq(
        utils.parseUnits("20000", 18)
      );
      expect(await mlk.balanceOf(vault.address)).to.eq(
        utils.parseUnits("18000", 8)
      );
      expect(await pci.balanceOf(vault.address)).to.eq(
        utils.parseUnits("30000", 8)
      );
      expect(await wai.totalSupply()).to.eq(utils.parseEther("9600"));
      expect(await wai.balanceOf(fee.address)).to.eq(utils.parseEther("0.06"));
    });
    it("mint multi", async () => {
      await vault.connect(operator).disableToken(pci.address);
      await expect(
        vault
          .connect(user)
          .mintWAI(
            [mlk.address, pci.address],
            [utils.parseUnits("2000", 8), utils.parseUnits("2000", 8)],
            utils.parseEther("10")
          )
      ).to.revertedWith("not mintable");

      await vault.connect(operator).enableToken(pci.address);
      expect(
        await vault
          .connect(user)
          .mintWAI(
            [mlk.address, pci.address],
            [utils.parseUnits("2000", 8), utils.parseUnits("2000", 8)],
            utils.parseEther("10")
          )
      )
        .to.emit(wai, "Transfer")
        .withArgs(ZERO_ADDR, user.address, utils.parseEther("599.94"));
      // fee is 0.01%, 600 WAI * 99.99% = 599.94
      expect(await wai.balanceOf(user.address)).to.eq(
        utils.parseEther("599.94")
      );

      await vault.connect(user).mintWAI(
        [mlk.address, pci.address, pla.address],
        [
          utils.parseUnits("1000", 8), // $2000
          utils.parseUnits("1000", 8), // $1000
          utils.parseEther("2000"), // $3000
        ],
        utils.parseEther("10")
      );

      expect(await wai.balanceOf(user.address)).to.eq(
        utils.parseEther("599.94").mul(2)
      );

      expect(await pla.balanceOf(vault.address)).to.eq(
        utils.parseUnits("22000", 18)
      );
      expect(await mlk.balanceOf(vault.address)).to.eq(
        utils.parseUnits("18000", 8)
      );
      expect(await pci.balanceOf(vault.address)).to.eq(
        utils.parseUnits("33000", 8)
      );
      expect(await wai.balanceOf(fee.address)).to.eq(utils.parseEther("0.12"));
    });
  });

  describe("burn test", () => {
    beforeEach("mint", async () => {
      await vault.connect(operator).mintInitialAmount(utils.parseEther("10"));
      await mlk.mint(user.address, utils.parseUnits("3000", 8));
      await mlk
        .connect(user)
        .approve(vault.address, ethers.constants.MaxUint256);
      await vault
        .connect(user)
        .mintWAI(
          [mlk.address],
          [utils.parseUnits("3000", 8)],
          utils.parseEther("10")
        );
    });
    it("burn", async () => {
      await wai
        .connect(user)
        .approve(vault.address, ethers.constants.MaxUint256);

      await expect(
        vault
          .connect(user)
          .burnWAI(utils.parseEther("100"), utils.parseEther("11"))
      ).to.revertedWith("target price moved");

      const beforePLA = await pla.balanceOf(vault.address);
      const beforeMLK = await mlk.balanceOf(vault.address);
      const beforePCI = await pci.balanceOf(vault.address);

      const {
        0: tvl,
        1: tokens,
        2: ratios,
        3: sumRatio,
      } = await vault.getCurrentTokenRatio();

      expect(
        await vault
          .connect(user)
          .burnWAI(utils.parseEther("100"), utils.parseEther("10"))
      )
        .to.emit(wai, "Transfer")
        .withArgs(user.address, ZERO_ADDR, utils.parseEther("100"));

      const burnValue = utils
        .parseEther("100")
        .mul(utils.parseEther("10"))
        .div(ETH);

      const afterPLA = await pla.balanceOf(vault.address);
      const afterMLK = await mlk.balanceOf(vault.address);
      const afterPCI = await pci.balanceOf(vault.address);

      const expectOutPLA = burnValue.mul(beforePLA).div(tvl);
      const expectOutMLK = burnValue.mul(beforeMLK).div(tvl);
      const expectOutPCI = burnValue.mul(beforePCI).div(tvl);

      // const plaPrice = await oracle.getPrice(pla.address);
      // const mlkPrice = await oracle.getPrice(mlk.address);
      // const pciPrice = await oracle.getPrice(pci.address);
      // const expectOutValuePLA = expectOutPLA
      //   .mul(BigNumber.from(10).pow(18 - 18))
      //   .mul(plaPrice)
      //   .div(ETH);
      // const expectOutValueMLK = expectOutMLK
      //   .mul(mlkPrice)
      //   .div(ETH)
      //   .mul(BigNumber.from(10).pow(18 - 8));

      // const expectOutValuePCI = expectOutPCI
      //   .mul(pciPrice)
      //   .div(ETH)
      //   .mul(BigNumber.from(10).pow(18 - 8));

      expect(beforePLA.sub(afterPLA)).to.eq(expectOutPLA);
      expect(beforeMLK.sub(afterMLK)).to.eq(expectOutMLK);
      expect(beforePCI.sub(afterPCI)).to.eq(expectOutPCI);

      const expectUserPLA = parseFloat(
        utils.formatEther(beforePLA.sub(afterPLA))
      );
      const expectUserMLK = parseFloat(
        utils.formatUnits(beforeMLK.sub(afterMLK), 8)
      );
      const expectUserPCI = parseFloat(
        utils.formatUnits(beforePCI.sub(afterPCI), 8)
      );
      const userPLA = parseFloat(
        utils.formatEther(await pla.balanceOf(user.address))
      );
      const userMLK = parseFloat(
        utils.formatUnits(await mlk.balanceOf(user.address), 8)
      );
      const userPCI = parseFloat(
        utils.formatUnits(await pci.balanceOf(user.address), 8)
      );

      expect(userPLA).to.closeTo(expectUserPLA * 0.9999, 0.000000001);
      expect(userMLK).to.closeTo(expectUserMLK * 0.9999, 0.000000001);
      expect(userPCI).to.closeTo(expectUserPCI * 0.9999, 0.000000001);
      expect(await pla.balanceOf(fee.address)).to.eq(
        expectOutPLA.mul(1).div(10000)
      );
      expect(await mlk.balanceOf(fee.address)).to.eq(
        expectOutMLK.mul(1).div(10000)
      );
      expect(await pci.balanceOf(fee.address)).to.eq(
        expectOutPCI.mul(1).div(10000)
      );
    });
  });

  describe("ll, max ratio", () => {
    beforeEach("mint", async () => {
      await vault.connect(operator).mintInitialAmount(utils.parseEther("10"));
      await pla.mint(user.address, utils.parseEther("100000"));
      await pla
        .connect(user)
        .approve(vault.address, ethers.constants.MaxUint256);
      await mlk.mint(user.address, utils.parseUnits("300000", 8));
      await mlk
        .connect(user)
        .approve(vault.address, ethers.constants.MaxUint256);
    });
    it("max test", async () => {
      await expect(
        vault
          .connect(user)
          .mintWAI(
            [pla.address],
            [utils.parseEther("100000")],
            utils.parseEther("10")
          )
      ).to.revertedWith("over ratio");

      await vault
        .connect(user)
        .mintWAI(
          [pla.address],
          [utils.parseEther("60000")],
          utils.parseEther("10")
        );
    });
    it("ll test", async () => {
      await vault
        .connect(user)
        .mintWAI(
          [pla.address],
          [utils.parseEther("60000")],
          utils.parseEther("10")
        );

      await expect(
        vault
          .connect(user)
          .mintWAI(
            [mlk.address],
            [utils.parseUnits("60100", 8)],
            utils.parseEther("10")
          )
      ).to.revertedWith("under ratio");

      await vault
        .connect(user)
        .mintWAI(
          [mlk.address],
          [utils.parseUnits("55000", 8)],
          utils.parseEther("10")
        );

      //   console.log(utils.formatEther(await wai.balanceOf(user.address)));
      //   const {
      //     0: tvl_,
      //     1: tokens_,
      //     2: ratios_,
      //   } = await vault.getCurrentTokenRatio();
      //   console.log(ratios_[0].toString());
      //   console.log(ratios_[1].toString());
      //   console.log(ratios_[2].toString());
    });
  });

  describe("test ll, max border", () => {
    beforeEach("mint", async () => {
      await vault.connect(operator).mintInitialAmount(utils.parseEther("10"));
      await vault.connect(operator).setFeeRatio(0, 0);
      await vault.connect(operator).changeTokenRatio(pla.address, 1000, 5000);
      await vault.connect(operator).changeTokenRatio(mlk.address, 1000, 5000);
      await vault.connect(operator).changeTokenRatio(pci.address, 1000, 5000);

      await pla.mint(user.address, utils.parseEther("100000"));
      await pla
        .connect(user)
        .approve(vault.address, ethers.constants.MaxUint256);
      await mlk.mint(user.address, utils.parseUnits("300000", 8));
      await mlk
        .connect(user)
        .approve(vault.address, ethers.constants.MaxUint256);
      await pci.mint(user.address, utils.parseUnits("300000", 8));
      await pci
        .connect(user)
        .approve(vault.address, ethers.constants.MaxUint256);
    });
    it("max border", async () => {
      // tvl = 90000, pla = 30000
      // + pla 30000 = tvl = 120000, pla = 60000, 50%
      await vault.connect(user).mintWAI(
        [pla.address],
        [utils.parseEther("20000")], // $1.5
        utils.parseEther("10")
      );
      let [_tvl, _validTokens, _ratios, _sum] =
        await vault.getCurrentTokenRatio();
      expect(_ratios[0]).to.eq(5000);

      await expect(
        vault
          .connect(user)
          .mintWAI(
            [pla.address],
            [utils.parseEther("100")],
            utils.parseEther("10")
          )
      ).to.revertedWith("over ratio");
      // tvl = 120000, mlk = 30000
      // + mlk 40000 = tvl = 160000, mlk = 70000
      await vault.connect(user).mintWAI(
        [mlk.address],
        [utils.parseUnits("20000", 8)], // $2
        utils.parseEther("10")
      );
      [_tvl, _validTokens, _ratios, _sum] = await vault.getCurrentTokenRatio();
      expect(_ratios[0]).to.eq(3750); // 6 / 16 = 3750
      expect(_ratios[1]).to.eq(4375); // 7 / 16 = 4375
      expect(_ratios[2]).to.eq(1875); // 3 / 16 = 1875
    });
    it("ll border", async () => {
      // tvl = 90000, pla = 30000
      // + pla 105000, mlk 105000 = tvl = 300000
      await vault.connect(user).mintWAI(
        [pla.address, mlk.address],
        [utils.parseEther("70000"), utils.parseUnits("52500", 8)], // $1.5, $2
        utils.parseEther("10")
      );
      let [_tvl, _validTokens, _ratios, _sum] =
        await vault.getCurrentTokenRatio();
      expect(_ratios[2]).to.eq(1000);

      await expect(
        vault
          .connect(user)
          .mintWAI(
            [pla.address],
            [utils.parseEther("100")],
            utils.parseEther("10")
          )
      ).to.revertedWith("under ratio");
      await vault
        .connect(user)
        .mintWAI(
          [pci.address],
          [utils.parseUnits("100000", 8)],
          utils.parseEther("10")
        );
      [_tvl, _validTokens, _ratios, _sum] = await vault.getCurrentTokenRatio();
      expect(_ratios[0]).to.eq(3375); // 13.5 / 40 = 3375
      expect(_ratios[1]).to.eq(3375); // 13.5 / 40 = 3375
      expect(_ratios[2]).to.eq(3250); // 13 / 40 = 3250
    });
  });

  describe("remove token test", () => {
    beforeEach("mint", async () => {
      await vault.connect(operator).mintInitialAmount(utils.parseEther("10"));
      await pla.mint(user.address, utils.parseEther("100000"));
      await pla
        .connect(user)
        .approve(vault.address, ethers.constants.MaxUint256);
      await mlk.mint(user.address, utils.parseUnits("300000", 8));

      // mint more
      await vault
        .connect(user)
        .mintWAI(
          [pla.address],
          [utils.parseEther("50000")],
          utils.parseEther("10")
        );

      // in token
      await vault.connect(operator).supportToken(kusdt.address, 1000, 7000);
    });
    it("removeToken", async () => {
      // transfer first
      await kusdt
        .connect(treasury)
        .transfer(vault.address, utils.parseUnits("100000", 6));
      expect(await kusdt.balanceOf(treasury.address)).to.eq(0);
      expect(await pci.balanceOf(vault.address)).to.eq(
        utils.parseUnits("30000", 8)
      ); // $30000

      const beforeWAIPrice = await vault.getWAIPrice();
      const {
        0: tvl,
        1: tokens,
        2: ratios,
      } = await vault.getCurrentTokenRatio();

      expect(
        await vault.connect(operator).removeToken(pci.address, kusdt.address)
      )
        .to.emit(vault, "RemoveToken")
        .withArgs(
          pci.address,
          utils.parseUnits("30000", 8),
          kusdt.address,
          utils.parseUnits("3000", 6),
          await latestBlocktime(provider)
        );

      expect(await kusdt.balanceOf(treasury.address)).to.eq(
        utils.parseUnits("97000", 6)
      );
      expect(await kusdt.balanceOf(vault.address)).to.eq(
        utils.parseUnits("3000", 6)
      );
      expect(await pci.balanceOf(vault.address)).to.eq(0);
      expect(await vault.tokenBalances(pci.address)).to.eq(0);

      const {
        0: tvl_,
        1: tokens_,
        2: ratios_,
      } = await vault.getCurrentTokenRatio();

      expect(tvl_).to.eq(tvl);
      expect(tokens_.length).to.eq(3);
      expect(tokens_[0]).to.eq(pla.address);
      expect(tokens_[1]).to.eq(mlk.address);
      expect(tokens_[2]).to.eq(kusdt.address);
      expect(ratios_[0]).to.eq(ratios[0]);
      expect(ratios_[1]).to.eq(ratios[1]);
      expect(ratios_[2]).to.eq(ratios[2]);

      expect(await vault.getWAIPrice()).to.eq(beforeWAIPrice);
    });
  });
});
