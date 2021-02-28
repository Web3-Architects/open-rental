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

    IERC20 public dai;

    modifier onlyTenant() {
        require(msg.sender == tenant, "Restricted to the tenant only");
        _;
    }

    constructor(
        address _tenantAddress,
        uint256 _rent,
        uint256 _deposit,
        uint256 _rentGuarantee,
        address daiAdress
    ) {
        require(_tenantAddress != address(0), "Tenant cannot be the zero address");
        require(_rent > 0, "rent cannot be 0");

        landlord = msg.sender;
        tenant = _tenantAddress;
        rent = _rent;
        deposit = _deposit;
        rentGuarantee = _rentGuarantee;
        dai = IERC20(daiAdress);
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

        uint256 amountUpfront = deposit + rent + rentGuarantee;
        dai.safeTransferFrom(tenant, address(this), amountUpfront);

        nextRentDueTimestamp = block.timestamp + 4 weeks;
        // TODO: emit event
    }

    function payRent() public onlyTenant {
        require(dai.allowance(tenant, address(this)) >= rent, "Not enough allowance");

        dai.safeTransferFrom(tenant, landlord, rent);

        nextRentDueTimestamp += 4 weeks;
    }
}
