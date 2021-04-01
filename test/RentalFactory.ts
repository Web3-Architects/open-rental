import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { Contract } from "ethers";

import { RentalFactory } from "../typechain";
import { parseUnits18 } from "../utils/parseUnits";
import deployMockERC20 from "./utils/mockERC20";

const { deployContract } = hre.waffle;
const { ethers } = hre;

describe("RentalFactory", () => {
  let admin: SignerWithAddress;
  let landlord: SignerWithAddress;
  let tenant1: SignerWithAddress;
  let tenant2: SignerWithAddress;
  let rentalFactory: RentalFactory;
  let dai: Contract;

  const rent = parseUnits18("500");
  const deposit = parseUnits18("500");
  const rentGuarantee = parseUnits18("1500");

  before(async function () {
    [admin, landlord, tenant1, tenant2] = await ethers.getSigners();

    console.log(`landlord.address`, landlord.address);
    console.log(`tenant1.address`, tenant1.address);
    console.log(`tenant2.address`, tenant2.address);

    dai = await deployMockERC20({ name: "dai", symbol: "DAI" });

    const rentalFactoryArtifact: Artifact = await hre.artifacts.readArtifact("RentalFactory");
    rentalFactory = <RentalFactory>await deployContract(admin, rentalFactoryArtifact);
  });

  it("should create a new RentalAgreement", async () => {
    const createRentalTx = await rentalFactory
      .connect(landlord)
      .createNewRental(tenant1.address, rent, deposit, rentGuarantee, dai.address);
    await createRentalTx.wait();

    // Get the deployed RentalAgreement smart contract
    const firstRentalAddress = await rentalFactory.rentalsByOwner(landlord.address, 0);
    const rentalAgreement = await ethers.getContractAt("RentalAgreement", firstRentalAddress);

    expect(await rentalAgreement.landlord()).to.eq(landlord.address);
    expect(await rentalAgreement.tenant()).to.eq(tenant1.address);

    expect(await rentalAgreement.rent()).to.eq(rent);
    expect(await rentalAgreement.deposit()).to.eq(deposit);
    expect(await rentalAgreement.rentGuarantee()).to.eq(rentGuarantee);
  });

  it("should emit an event", async () => {
    // Deploy a second rental
    await expect(
      rentalFactory.connect(landlord).createNewRental(tenant1.address, rent, deposit, rentGuarantee, dai.address),
    ).to.emit(rentalFactory, "NewRentalDeployed");
  });

  it("should allow the creation of multiple rentals", async () => {
    // Given
    const rent3 = parseUnits18("1000");
    const deposit3 = parseUnits18("2000");
    const rentGuarantee3 = parseUnits18("3000");

    // First rental
    const firstRentalAddress = await rentalFactory.rentalsByOwner(landlord.address, 0);
    const firstRentalAgreement = await ethers.getContractAt("RentalAgreement", firstRentalAddress);

    expect(await firstRentalAgreement.landlord()).to.eq(landlord.address);
    expect(await firstRentalAgreement.tenant()).to.eq(tenant1.address);

    // When
    const createRentalTx = await rentalFactory
      .connect(landlord)
      .createNewRental(tenant2.address, rent3, deposit3, rentGuarantee3, dai.address);
    await createRentalTx.wait();

    // Get this third rental
    const thirdRentalAddress = await rentalFactory.rentalsByOwner(landlord.address, 2);
    const thirdRentalAgreement = await ethers.getContractAt("RentalAgreement", thirdRentalAddress);

    // Expect
    expect(await thirdRentalAgreement.address).to.eq(thirdRentalAddress);
    expect(await thirdRentalAgreement.landlord()).to.eq(landlord.address);
    expect(await thirdRentalAgreement.tenant()).to.eq(tenant2.address);

    expect(await thirdRentalAgreement.rent()).to.eq(rent3);
    expect(await thirdRentalAgreement.deposit()).to.eq(deposit3);
    expect(await thirdRentalAgreement.rentGuarantee()).to.eq(rentGuarantee3);
  });
});
