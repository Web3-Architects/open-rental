import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { Contract } from "ethers";

import { RentalFactory } from "../typechain";
import { parseUnits18 } from "../utils/parseUnits";

const { deployContract } = hre.waffle;
const { ethers } = hre;

describe("RentalFactory", () => {
  let admin: SignerWithAddress;
  let landlord: SignerWithAddress;
  let tenant1: SignerWithAddress;
  let rentalFactory: RentalFactory;
  let dai: Contract;

  const rent = parseUnits18("500");
  const deposit = parseUnits18("500");
  const rentGuarantee = parseUnits18("1500");

  before(async function () {
    [admin, landlord, tenant1] = await ethers.getSigners();

    // deploy an ERC20 token to mock dai
    const daiFactory = await ethers.getContractFactory("ERC20PresetMinterPauser");
    dai = await daiFactory.deploy("dai", "DAI");
    console.log("dai deployed at:", dai.address);

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
    await expect(
      rentalFactory.connect(landlord).createNewRental(tenant1.address, rent, deposit, rentGuarantee, dai.address),
    ).to.emit(rentalFactory, "NewRentalDeployed");
  });
});
