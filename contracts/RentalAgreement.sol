// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "hardhat/console.sol";

contract RentalAgreement {
    using SafeERC20 for IERC20;

    address public landlord;
    address public tenant;
    uint256 public rent;
    uint256 public deposit;
    uint256 public rentGuarantee;
    uint256 public nextRentDueTimestamp;

    IERC20 public tokenUsedForPayments;

    event TenantEnteredAgreement(uint256 depositLocked, uint256 rentGuaranteeLocked, uint256 firstMonthRentPaid);
    event EndRental(uint256 returnedToTenant, uint256 returnToLandlord);
    event WithdrawUnpaidRent(uint256 withdrawedFunds);

    modifier onlyTenant() {
        require(msg.sender == tenant, "Restricted to the tenant only");
        _;
    }

    modifier onlyLandlord() {
        require(msg.sender == landlord, "Restricted to the landlord only");
        _;
    }

    constructor(
        address _tenantAddress,
        uint256 _rent,
        uint256 _deposit,
        uint256 _rentGuarantee,
        address _tokenUsedToPay
    ) {
        require(_tenantAddress != address(0), "Tenant cannot be the zero address");
        require(_rent > 0, "rent cannot be 0");

        landlord = msg.sender;
        tenant = _tenantAddress;
        rent = _rent;
        deposit = _deposit;
        rentGuarantee = _rentGuarantee;
        tokenUsedForPayments = IERC20(_tokenUsedToPay);
    }

    function enterAgreementAsTenant(
        address _landlordAddress,
        uint256 _deposit,
        uint256 _rentGuarantee,
        uint256 _rent
    ) public onlyTenant {
        require(_landlordAddress == landlord, "Incorrect landlord address");
        require(_deposit == deposit, "Incorrect deposit amount");
        require(_rentGuarantee == rentGuarantee, "Incorrect rent guarantee amount");
        require(_rent == rent, "Incorrect rent amount");

        uint256 deposits = deposit + rentGuarantee;
        tokenUsedForPayments.safeTransferFrom(tenant, address(this), deposits);

        tokenUsedForPayments.safeTransferFrom(tenant, landlord, rent);
        nextRentDueTimestamp = block.timestamp + 4 weeks;

        emit TenantEnteredAgreement(deposit, rentGuarantee, rent);
    }

    function payRent() public onlyTenant {
        require(tokenUsedForPayments.allowance(tenant, address(this)) >= rent, "Not enough allowance");

        tokenUsedForPayments.safeTransferFrom(tenant, landlord, rent);

        nextRentDueTimestamp += 4 weeks;
    }

    function withdrawUnpaidRent() public onlyLandlord {
        require(block.timestamp > nextRentDueTimestamp, "There are no unpaid rent");

        nextRentDueTimestamp += 4 weeks;
        rentGuarantee -= rent;

        tokenUsedForPayments.safeTransfer(landlord, rent);
    }

    function endRental(uint256 _amountOfDepositBack) public onlyLandlord {
        require(_amountOfDepositBack <= deposit, "Invalid deposit amount");

        // TODO: we can do the withdraw logic from AAVE

        uint256 landlordWithdraw = deposit - _amountOfDepositBack;
        uint256 fundsToReturnToTenant = _amountOfDepositBack + rentGuarantee;
        tokenUsedForPayments.safeTransfer(tenant, fundsToReturnToTenant);
        if (_amountOfDepositBack != deposit) {
            tokenUsedForPayments.safeTransfer(landlord, landlordWithdraw);
        }
        deposit = 0;
        rentGuarantee = 0;
        emit EndRental(fundsToReturnToTenant, landlordWithdraw);
    }
}
