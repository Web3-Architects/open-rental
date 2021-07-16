// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./ILendingService.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockLendingService is ILendingService {
    using SafeERC20 for IERC20;

    uint256 public depositedAmountBalance;
    address public owner;
    IERC20 public tokenUsedForPayments;

    modifier onlyOwner() {
        require(msg.sender == owner, "Restricted to the owner only");
        _;
    }

    constructor(address _tokenUsedToPay) {
        owner = msg.sender;
        tokenUsedForPayments = IERC20(_tokenUsedToPay);
        depositedAmountBalance = 0;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(msg.sender == owner, "Only the owner can call this method");
        owner = newOwner;
    }

    function deposit(uint256 _amount) external override(ILendingService)  onlyOwner {
        tokenUsedForPayments.safeTransferFrom(msg.sender, address(this), _amount);
        depositedAmountBalance += _amount;
    }

    function withdraw(uint256 _amount) external override(ILendingService) onlyOwner  {
        require(_amount <= depositedAmountBalance, "Invalid withdraw amount");
        tokenUsedForPayments.safeTransfer(msg.sender, _amount);
        depositedAmountBalance -= _amount;
    }

    function withdrawCapitalAndInterests() external override(ILendingService) onlyOwner  {
        tokenUsedForPayments.safeTransfer(msg.sender, tokenUsedForPayments.balanceOf(address(this)));
        depositedAmountBalance = 0;
    }

    function depositedBalance() external override(ILendingService) view returns (uint256) {
        return depositedAmountBalance;
    }

}
