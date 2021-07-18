import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { AAVELendingService } from "../typechain";
import { parseUnits18 } from "../utils/parseUnits";

const kovanDaiAddress = "0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD";

describe("Aave Lending Service (Kovan)", function () {
  this.timeout(0);
  let signer1: SignerWithAddress;
  let _signer2: SignerWithAddress;
  let dai: Contract;
  let lendingService: AAVELendingService;
  let registeredATokenAddress: string;
  const depositAmount = parseUnits18("50");

  before(async function () {
    [signer1, _signer2] = await ethers.getSigners();
    console.log(`signer1.address`, signer1.address);
    dai = await ethers.getContractAt("IERC20", kovanDaiAddress);

    const lendingServiceFactory: ContractFactory = await ethers.getContractFactory("AAVELendingService");
    try {
      lendingService = <AAVELendingService>await lendingServiceFactory.deploy(kovanDaiAddress);
      registeredATokenAddress = await lendingService.aToken();
    } catch (error) {
      console.log(`error`, error);
    }
    console.log(`AaveLending deployed at:`, lendingService.address);
  });

  after(async function () {
    console.log("Destructing contract...");
    const killTx = await lendingService.connect(signer1).kill({ gasLimit: 300000 });
    await killTx.wait();
    console.log("Contract destructed!");
  });

  describe("Init", () => {
    it("signer1 should have some dai", async () => {
      const daiBalance = await dai.balanceOf(signer1.address);

      console.log(`daiBalance`, daiBalance.toString());

      expect(daiBalance).gt(0);
    });

    it("should have the proper values after deployement", async () => {
      registeredATokenAddress = await lendingService.aToken();
      console.log("registeredATokenAddress", registeredATokenAddress);
      expect(await lendingService.tokenUsedForPayments()).to.eq(kovanDaiAddress);
    });
  });

  describe("Deposit", () => {
    it("should deposit", async () => {
      console.log("Sending dai...");
      const sendingTx = await dai.connect(signer1).transfer(lendingService.address, depositAmount);
      await sendingTx.wait();

      console.log("Depositing", depositAmount.toString());
      const depositTx = await lendingService.deposit(depositAmount);
      await depositTx.wait();

      const aToken = await ethers.getContractAt("IERC20", registeredATokenAddress);
      const aTokenBalanceOfAaveLending = await aToken.balanceOf(lendingService.address);
      console.log(`aTokenBalanceOfAaveLending`, aTokenBalanceOfAaveLending.toString());

      expect(aTokenBalanceOfAaveLending).to.equal(depositAmount);
    });
  });

  describe("Withdraw", () => {
    it("should withdraw every token", async () => {
      const withdrawTx = await lendingService.withdrawCapitalAndInterests({ gasLimit: 500000 });
      await withdrawTx.wait();

      const daiBalance = await dai.balanceOf(signer1.address);

      expect(daiBalance).to.be.at.least(depositAmount.toString());
    });

    it("should withdraw a specific amount", async () => {
      // Deposit
      const sendingTx = await dai.connect(signer1).transfer(lendingService.address, depositAmount);
      await sendingTx.wait();
      const depositTx = await lendingService.deposit(depositAmount);
      await depositTx.wait();

      // Tokens after deposit
      const aToken = await ethers.getContractAt("IERC20", registeredATokenAddress);
      const aTokenBalanceOfAaveLendingAfterDeposit = await aToken.balanceOf(lendingService.address);
      console.log(`aTokenBalanceOfAaveLendingAfterDeposit`, aTokenBalanceOfAaveLendingAfterDeposit.toString());

      // Withdraw
      const withdrawTx = await lendingService.withdraw(parseUnits18("25"), { gasLimit: 500000 });
      await withdrawTx.wait();

      const aTokenBalanceOfAaveLendingAfterWithdraw = await aToken.balanceOf(lendingService.address);
      console.log(`aTokenBalanceOfAaveLendingAfterDeposit`, aTokenBalanceOfAaveLendingAfterWithdraw.toString());
      const daiBalance = await dai.balanceOf(signer1.address);

      expect(aTokenBalanceOfAaveLendingAfterWithdraw).to.be.at.least(
        aTokenBalanceOfAaveLendingAfterWithdraw.div(parseUnits18("2")),
      );
      expect(daiBalance).to.be.at.least(parseUnits18("25"));
    });
  });
});
