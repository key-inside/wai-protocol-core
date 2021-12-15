import { utils } from "ethers";
import { ParamType } from "ethers/lib/utils";
import erc20ABI from "./abi/erc20.json";
import { ContractInfo } from "../deploy.config";

export const encodeParameters = (
  ethers: any,
  types: Array<string | ParamType>,
  values: Array<any>
) => {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
};

export const wait = async (
  ethers: any,
  hash: string,
  desc?: string,
  confirmation: number = 1
): Promise<void> => {
  if (desc) {
    console.log(`Waiting tx ${hash}. action = ${desc}\n`);
  } else {
    console.log(`Waiting tx ${hash}\n`);
  }
  await ethers.provider.waitForTransaction(hash, confirmation);
};

export const latestBlocktime = async (provider: any) => {
  const { timestamp } = await provider.getBlock("latest");
  return timestamp;
};

export const getContract = async (ethers: any, name: string) => {
  const { chainId } = await ethers.provider.getNetwork();
  const info = ContractInfo[chainId][name];
  return new ethers.Contract(info.address, info.abi, ethers.provider);
};

export const getERC20Contract = async (ethers: any, address: string) => {
  return await new ethers.Contract(address, erc20ABI, ethers.provider);
};

export const formatETH = (value: any) => {
  return parseFloat(utils.formatEther(value));
};

export const formatUnits = (value: any, decimals: any) => {
  return parseFloat(utils.formatUnits(value, decimals));
};
