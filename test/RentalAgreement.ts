import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import { RentalAgreement } from "../typechain/RentalAgreement";
import { expect } from "chai";
import { BigNumber } from "ethers";

const { deployContract } = hre.waffle;
const { ethers } = hre;

// TODO: to move
const parseEth = (stringToParse: string) => ethers.utils.parseEther(stringToParse);

describe("Rental Agreement", function () {
  let landlord: SignerWithAddress;
  let tenant1: SignerWithAddress;
  let rental: RentalAgreement;

  let rent: BigNumber;
  let deposit: BigNumber;
  let rentGuarantee: BigNumber;

  before(async function () {
    [landlord, tenant1] = await ethers.getSigners();
  });

  beforeEach(async function () {
    rent = parseEth("0.5");
    deposit = parseEth("1");
    rentGuarantee = parseEth("1.5");
    const rentalArtifact: Artifact = await hre.artifacts.readArtifact("RentalAgreement");
    rental = <RentalAgreement>(
      await deployContract(landlord, rentalArtifact, [tenant1.address, rent, deposit, rentGuarantee])
    );
  });

  describe("Init", () => {
    it("should have the proper values after deployement", async () => {
      expect(await rental.landlord()).to.eq(landlord.address);
      expect(await rental.tenant()).to.eq(tenant1.address);

      expect(await rental.rent()).to.eq(rent);
      expect(await rental.deposit()).to.eq(deposit);
      expect(await rental.rentGuarantee()).to.eq(rentGuarantee);
    });
  });
});
