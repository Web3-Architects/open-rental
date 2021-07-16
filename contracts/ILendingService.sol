// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


interface ILendingService {
    /// @notice Deposits funds from current smart contract to a lending protocol
    /// @dev Will revert if the amount exceeds the contract balance or caller is not the owner.
    /// @param amount The amount to deposit
    function deposit(uint256 amount) external;

    /// @notice Withdraws `amount` from a lending protocol plus a proportional amount of interests earned 
    /// @dev Will revert if the amount exceeds the balance of capital deposited or caller is not the owner.
    /// @param amount The amount to withdraw
    function withdraw(uint256 amount) external;

    /// @notice Withdraws all capital and interests earned from a lending protocol 
    /// @dev Will revert if the caller is not the owner.
    function withdrawCapitalAndInterests() external;

    /// @notice Returns the amount deposited on a lending protocol
    function depositedBalance() external view returns (uint256);
}

