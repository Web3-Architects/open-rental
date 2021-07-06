// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RentalAgreement.sol";

contract RentalFactory {
    mapping(address => RentalAgreement[]) public rentalsByOwner;

    event NewRentalDeployed(address contractAddress, address landlord, address tenant);

    function createNewRental(
        address _tenantAddress,
        uint256 _rent,
        uint256 _deposit,
        uint256 _rentGuarantee,
        address _tokenUsedToPay,
        address _lendingService
    ) public {
        RentalAgreement newRental =
            new RentalAgreement(msg.sender, _tenantAddress, _rent, _deposit, _rentGuarantee, _tokenUsedToPay, _lendingService);

        emit NewRentalDeployed(address(newRental), msg.sender, _tenantAddress);
        rentalsByOwner[msg.sender].push(newRental);
    }
}
