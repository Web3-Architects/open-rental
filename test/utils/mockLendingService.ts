import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Artifact } from "hardhat/types";
import hre from "hardhat";
import { MockLendingService } from "../../typechain";
import { Contract } from "@ethersproject/contracts";

export const deployMockLendingService = async (owner: SignerWithAddress, tokenUsedForPayments: Contract): Promise<MockLendingService> => {
  const lendingServiceArtifact: Artifact = await hre.artifacts.readArtifact("MockLendingService");
  return  <MockLendingService>await hre.waffle.deployContract(owner, lendingServiceArtifact, [tokenUsedForPayments.address]);
}
