// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RentalAgreement {
  address public landlord;
  address public tenant;
  uint public rent;
  uint public deposit;
  uint public rentGuarantee;


  constructor(address _tenantAddress, uint _rent, uint _deposit, uint _rentGuarantee) {
    require(_tenantAddress != address(0), "Tenant cannot be the zero address");
    require(_rent > 0, "rent cannot be 0");
    
    landlord = msg.sender;
    tenant = _tenantAddress;
    rent = _rent;
    deposit = _deposit;
    rentGuarantee = _rentGuarantee;
  }

}