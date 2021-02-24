// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RentalAgreement {
    address public landlord;
    address public tenant;
    uint256 public rent;
    uint256 public deposit;
    uint256 public rentGuarantee;

    ERC20 public dai;

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
        dai = ERC20(daiAdress);
    }
}
