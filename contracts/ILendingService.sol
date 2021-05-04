pragma solidity ^0.8.0;

interface ILendingService {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function withdrawCapitalAndInterests() external;
    function depositedBalance() external view returns (uint256);
}

