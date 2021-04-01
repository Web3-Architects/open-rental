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

const increaseEVMTime = async (time: number) => {
  await ethers.provider.send("evm_increaseTime", [time]);
  // @ts-ignore
  await ethers.provider.send("evm_mine");
};

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

    // Give 1 000 000 mock dai to tenant1
    const initialTenant1Balance = parseUnits18("1000000");
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
      await deployContract(landlord, rentalArtifact, [
        landlord.address,
        tenant1.address,
        rent,
        deposit,
        rentGuarantee,
        dai.address,
      ])
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
      const deposits = deposit.add(rentGuarantee);
      const totalUpfront = deposits.add(rent);

      const approveTx = await dai.connect(tenant1).approve(rental.address, totalUpfront);
      await approveTx.wait();

      const tx = await rental.connect(tenant1).enterAgreementAsTenant(landlord.address, deposit, rentGuarantee, rent);
      const txReceipt = await tx.wait();
      const blockHash = txReceipt.blockHash;
      const block = await ethers.provider.getBlock(blockHash);

      const nextRentDueTimestamp = await rental.nextRentDueTimestamp();
      expect(nextRentDueTimestamp).to.eq(block.timestamp + FOUR_WEEKS_IN_SECS);

      expect(await dai.balanceOf(rental.address)).to.eq(deposits);
      expect(await dai.balanceOf(landlord.address)).to.eq(rent);

      // unfortunately doesn't work this way :/
      // await expect(tx).to.emit(rental, "TenantEnteredAgreement").withArgs(deposit, rentGuarantee, rent);
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

    it("should register rent payment and push the next time it is due", async () => {
      const nextTimeDueBeforePayment = await rental.nextRentDueTimestamp();

      const approveTx = await dai.connect(tenant1).approve(rental.address, rent);
      await approveTx.wait();

      const payRentTx = await rental.connect(tenant1).payRent();
      await payRentTx.wait();

      const nextRentDueTimestamp = await rental.nextRentDueTimestamp();

      expect(nextRentDueTimestamp).to.eq(nextTimeDueBeforePayment.add(FOUR_WEEKS_IN_SECS));
    });

    describe("Ending rental", () => {
      let landlordBalanceBefore: BigNumber;
      let tenant1BalanceBefore: BigNumber;
      let rentalBalanceBefore: BigNumber;

      const enterAsTenant = async () => {
        const amountUpfront = deposit.add(rentGuarantee).add(rent);
        const approveTx = await dai.connect(tenant1).approve(rental.address, amountUpfront);
        await approveTx.wait();
        const tx = await rental.connect(tenant1).enterAgreementAsTenant(landlord.address, deposit, rentGuarantee, rent);
        await tx.wait();
      };

      beforeEach(async () => {
        // Given
        await enterAsTenant();

        landlordBalanceBefore = await dai.balanceOf(landlord.address);
        tenant1BalanceBefore = await dai.balanceOf(tenant1.address);
        rentalBalanceBefore = await dai.balanceOf(rental.address);
      });

      it("should send back the expected deposit", async () => {
        // When
        const endRentalTx = await rental.connect(landlord).endRental(parseUnits18("250"));
        await endRentalTx.wait();

        // Expect
        const expectedTenantBalance = tenant1BalanceBefore.add(parseUnits18("250")).add(rentGuarantee);
        const expectedLandlordBalance = landlordBalanceBefore.add(parseUnits18("250"));
        const expectedContractBalance = rentalBalanceBefore.sub(deposit).sub(rentGuarantee);

        expect(await dai.balanceOf(tenant1.address)).to.eq(expectedTenantBalance);
        expect(await dai.balanceOf(landlord.address)).to.eq(expectedLandlordBalance);
        expect(await dai.balanceOf(rental.address)).to.eq(expectedContractBalance);
        expect(await rental.deposit()).to.eq(parseUnits18("0"));
        expect(await rental.rentGuarantee()).to.eq(parseUnits18("0"));
      });

      it("should not send money to the landlord if we want to refund the full despot", async () => {
        // When
        const endRentalTx = await rental.connect(landlord).endRental(parseUnits18("500"));
        await endRentalTx.wait();

        // Expect
        const expectedTenantBalance = tenant1BalanceBefore.add(deposit).add(rentGuarantee);
        expect(await dai.balanceOf(tenant1.address)).to.eq(expectedTenantBalance);
        expect(await dai.balanceOf(landlord.address)).to.eq(landlordBalanceBefore);
        expect(await dai.balanceOf(rental.address)).to.eq(parseUnits18("0"));
      });

      it("should raise an error if we ask more money than the deposit", async () => {
        // When
        const endRentalTx = rental.connect(landlord).endRental(deposit.add(1));

        // Expect
        await expect(endRentalTx).to.be.revertedWith("Invalid deposit amount");
      });
    });

    describe("Withdraw unpaid rent", () => {
      let landlordBalanceBefore: BigNumber;
      let tenant1BalanceBefore: BigNumber;
      let rentalBalanceBefore: BigNumber;

      const enterAsTenant = async () => {
        const amountUpfront = deposit.add(rentGuarantee).add(rent);
        const approveTx = await dai.connect(tenant1).approve(rental.address, amountUpfront);
        await approveTx.wait();
        const tx = await rental.connect(tenant1).enterAgreementAsTenant(landlord.address, deposit, rentGuarantee, rent);
        await tx.wait();
      };

      beforeEach(async () => {
        // Given
        await enterAsTenant();

        landlordBalanceBefore = await dai.balanceOf(landlord.address);
        tenant1BalanceBefore = await dai.balanceOf(tenant1.address);
        rentalBalanceBefore = await dai.balanceOf(rental.address);
      });

      it("should detect when there are no unpaid rent", async () => {
        // When
        const withdrawUnpaidRentTx = rental.connect(landlord).withdrawUnpaidRent();

        // Expect
        await expect(withdrawUnpaidRentTx).to.be.revertedWith("There are no unpaid rent");
      });

      it("should not withdraw more than the missing months", async () => {
        // When

        // Go 1 month after the next due rent
        await increaseEVMTime(FOUR_WEEKS_IN_SECS);
        await increaseEVMTime(1000);

        // Withdraw unpaid rent of 1 month
        const withdrawUnpaidRentTx = await rental.connect(landlord).withdrawUnpaidRent();
        await withdrawUnpaidRentTx.wait();
        const rentGuaranteeAfterFirstCall = await rental.rentGuarantee();

        // Go 3 month after the next due rent
        await increaseEVMTime(FOUR_WEEKS_IN_SECS);
        await increaseEVMTime(FOUR_WEEKS_IN_SECS);

        // Withdraw unpaid rent of month 2
        const withdrawUnpaidRentSecondTx = await rental.connect(landlord).withdrawUnpaidRent();
        await withdrawUnpaidRentSecondTx.wait();
        const rentGuaranteeAfterSecondCall = await rental.rentGuarantee();

        // Withdraw unpaid rent of month 3
        const withdrawUnpaidRentThirdTx = await rental.connect(landlord).withdrawUnpaidRent();
        await withdrawUnpaidRentThirdTx.wait();
        const rentGuaranteeAfterThirdCall = await rental.rentGuarantee();

        // Expect
        const totalAmountWithdrawed = rent.mul(3);
        const expectedLandlordBalance = landlordBalanceBefore.add(totalAmountWithdrawed);
        const expectedContractBalance = rentalBalanceBefore.sub(totalAmountWithdrawed);

        expect(await dai.balanceOf(tenant1.address)).to.eq(tenant1BalanceBefore);
        expect(await dai.balanceOf(landlord.address)).to.eq(expectedLandlordBalance);
        expect(await dai.balanceOf(rental.address)).to.eq(expectedContractBalance);
        expect(rentGuaranteeAfterFirstCall).to.eq(parseUnits18("1000"));
        expect(rentGuaranteeAfterSecondCall).to.eq(parseUnits18("500"));
        expect(rentGuaranteeAfterThirdCall).to.eq(parseUnits18("0"));
      });

      it("should at least a full month late to withdraw the unpaid rent", async () => {
        // When
        await increaseEVMTime(FOUR_WEEKS_IN_SECS);
        await increaseEVMTime(FOUR_WEEKS_IN_SECS);

        // When
        const withdrawUnpaidRentTx = await rental.connect(landlord).withdrawUnpaidRent();
        await withdrawUnpaidRentTx.wait();

        // Expect
        const expectedLandlordBalance = landlordBalanceBefore.add(rent);
        const expectedContractBalance = rentalBalanceBefore.sub(rent);

        expect(await dai.balanceOf(tenant1.address)).to.eq(tenant1BalanceBefore);
        expect(await dai.balanceOf(landlord.address)).to.eq(expectedLandlordBalance);
        expect(await dai.balanceOf(rental.address)).to.eq(expectedContractBalance);
      });

      it("should only be callable by the landlord", async () => {
        // When
        const withdrawUnpaidRentTx = rental.connect(tenant1).withdrawUnpaidRent();

        // Expect
        await expect(withdrawUnpaidRentTx).to.be.revertedWith("Restricted to the landlord only");
      });
    });
  });
});
