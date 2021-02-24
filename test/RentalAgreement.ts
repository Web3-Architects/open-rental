import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import { RentalAgreement } from "../typechain/RentalAgreement";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";

const { deployContract } = hre.waffle;
const { ethers } = hre;

// TODO: to move
const parseUnits18 = (stringToParse: string) => ethers.utils.parseEther(stringToParse);

describe("Rental Agreement", function () {
  let landlord: SignerWithAddress;
  let tenant1: SignerWithAddress;
  let rental: RentalAgreement;

  let rent: BigNumber;
  let deposit: BigNumber;
  let rentGuarantee: BigNumber;
  let dai: Contract;

  before(async function () {
    [landlord, tenant1] = await ethers.getSigners();

    // deploy an ERC20 token to mock dai
    const daiFactory = await ethers.getContractFactory("ERC20PresetMinterPauser");
    dai = await daiFactory.deploy("dai", "DAI");
    console.log("dai deployed at:", dai.address);

    // Give 10 000 mock dai to tenant1
    const initialTenant1Balance = parseUnits18("10000");
    const mintingTx = await dai.mint(tenant1.address, initialTenant1Balance);
    await mintingTx.wait();

    expect(await dai.balanceOf(tenant1.address)).to.eq(initialTenant1Balance);
  });

  beforeEach(async function () {
    rent = parseUnits18("500");
    deposit = parseUnits18("500");
    rentGuarantee = parseUnits18("1500");
    const rentalArtifact: Artifact = await hre.artifacts.readArtifact("RentalAgreement");
    rental = <RentalAgreement>(
      await deployContract(landlord, rentalArtifact, [tenant1.address, rent, deposit, rentGuarantee, dai.address])
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
