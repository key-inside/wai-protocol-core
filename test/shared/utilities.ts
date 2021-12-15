import { Block, JsonRpcProvider, Provider } from "@ethersproject/providers";
import { ethers } from "hardhat";
import { ParamType } from "ethers/lib/utils";

export function encodeParameters(
  types: Array<string | ParamType>,
  values: Array<any>
) {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}

export async function latestBlocktime(provider: any): Promise<number> {
  const { timestamp } = await provider.getBlock("latest");
  return timestamp;
}

export async function advanceTime(provider: any, time: number): Promise<void> {
  return provider.send("evm_increaseTime", [time]);
}

export async function advanceBlock(provider: any): Promise<Block> {
  await provider.send("evm_mine", []);
  return await provider.getBlock("latest");
}

export async function advanceTimeAndBlock(
  provider: any,
  time: number
): Promise<Block> {
  await advanceTime(provider, time);
  await advanceBlock(provider);
  return Promise.resolve(provider.getBlock("latest"));
}
