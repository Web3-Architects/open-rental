// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ILendingPool } from "../interfaces/aave/ILendingPool.sol";
import "./ILendingService.sol";


contract AAVELendingService is ILendingService {
    using SafeERC20 for IERC20;
    // this shouldn't be harcoded normally
    ILendingPool internal aaveLendingPool = ILendingPool(0xE0fBa4Fc209b4948668006B2bE61711b7f465bAe);
    // this shouldn't be harcoded normally
    address public aDaiTokenAddress = 0xdCf0aF9e59C002FA3AA091a46196b37530FD48a8;
    address payable public owner;
    uint256 public depositedAmountBalance;

    IERC20 public aToken;
    IERC20 public tokenUsedForPayments;

    modifier onlyOwner() {
        require(msg.sender == owner, "Restricted to the owner only");
        _;
    }

    constructor(address _tokenUsedToPay) {
        tokenUsedForPayments = IERC20(_tokenUsedToPay);
        aToken = IERC20(aDaiTokenAddress);
        owner = payable(msg.sender);
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(msg.sender == owner, "Only the owner can call this method");
        owner = payable(newOwner);
    }

    function deposit(uint256 amount) external override(ILendingService) onlyOwner {
        require(amount <= tokenUsedForPayments.balanceOf(address(this)), "amount exceeds contract balance");
        // Approve the LendingPool contract to pull the amount to deposit
        tokenUsedForPayments.approve(address(aaveLendingPool), amount);
        // Deposit the amount in the LendingPool
        aaveLendingPool.deposit(address(tokenUsedForPayments), amount, address(this), 0);

        depositedAmountBalance += amount;
    }

    function withdraw(uint256 amount) external override(ILendingService) onlyOwner {
        uint256 aTokenBalance = aToken.balanceOf(address(this));
        // Compute the amount to withdraw, taking into account accrued interest 
        uint256 tokenAmountToWithdraw = (amount * aTokenBalance) / depositedAmountBalance;

        // Approve the aToken contract to pull the amount to withdraw
        aToken.approve(address(aaveLendingPool), tokenAmountToWithdraw);
        // Withdraw from the LendingPool
        aaveLendingPool.withdraw(address(tokenUsedForPayments), tokenAmountToWithdraw, address(this));

        depositedAmountBalance -= amount;
    }

    function withdrawCapitalAndInterests() external override(ILendingService) onlyOwner {
        uint256 aTokenBalance = aToken.balanceOf(address(this));

        aToken.approve(address(aaveLendingPool), aTokenBalance);
        aaveLendingPool.withdraw(address(tokenUsedForPayments), aTokenBalance, address(this));
        // Transfer the balance of this contract to the owner
        tokenUsedForPayments.safeTransfer(msg.sender, tokenUsedForPayments.balanceOf(address(this)));

        depositedAmountBalance = 0;
    }

    function depositedBalance() external override(ILendingService) view returns (uint256) {
        return depositedAmountBalance;
    }

    function kill() public onlyOwner {
        tokenUsedForPayments.transfer(owner, tokenUsedForPayments.balanceOf(address(this)));
        aToken.transfer(owner, aToken.balanceOf(address(this)));

        selfdestruct(owner);
    }
}
