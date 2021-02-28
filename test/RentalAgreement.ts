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

const FOUR_WEEKS_IN_SECS = 2419200;

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

    it("should let the tenant enter the agreement", async () => {
      const amountUpfront = deposit.add(rentGuarantee).add(rent);
      const approveTx = await dai.connect(tenant1).approve(rental.address, amountUpfront);
      await approveTx.wait();

      const tx = await rental.connect(tenant1).enterAgreementAsTenant(landlord.address, deposit, rentGuarantee, rent);
      const txReceipt = await tx.wait();
      const blockHash = txReceipt.blockHash;
      const block = await ethers.provider.getBlock(blockHash);

      const nextRentDueTimestamp = await rental.nextRentDueTimestamp();
      expect(nextRentDueTimestamp).to.eq(block.timestamp + FOUR_WEEKS_IN_SECS);

      expect(await dai.balanceOf(rental.address)).to.eq(amountUpfront);
    });
  });

  describe("Renting", () => {
    it("should have the tenant approve enough allowance first", async () => {
      const payRentTx = rental.connect(tenant1).payRent();

      await expect(payRentTx).to.be.revertedWith("Not enough allowance");
    });

    it("should let the tenant pay rent", async () => {
      const landlordBalanceBefore = await dai.balanceOf(landlord.address);
      const tenant1BalanceBefore = await dai.balanceOf(tenant1.address);

      const approveTx = await dai.connect(tenant1).approve(rental.address, rent);
      await approveTx.wait();

      const payRentTx = await rental.connect(tenant1).payRent();
      await payRentTx.wait();

      expect(await dai.balanceOf(tenant1.address)).to.eq(tenant1BalanceBefore.sub(rent));
      expect(await dai.balanceOf(landlord.address)).to.eq(landlordBalanceBefore.add(rent));
    });
  });
});
