import { BigNumber } from "ethers";
import hre from "hardhat";
const { ethers } = hre;

export const parseUnits18 = (stringToParse: string): BigNumber => ethers.utils.parseEther(stringToParse);
