import { Contract } from "@ethersproject/contracts";
import hre from "hardhat";
const { ethers } = hre;

type DeployMockERC20 = {
  name: string;
  symbol: string;
};

const deployMockERC20 = async ({ name, symbol }: DeployMockERC20): Promise<Contract> => {
  const erc20Factory = await ethers.getContractFactory("ERC20PresetMinterPauser");
  const erc20 = await erc20Factory.deploy(name, symbol);

  console.log(`${symbol} contract deployed at:`, erc20.address);

  return erc20;
};

export default deployMockERC20;
