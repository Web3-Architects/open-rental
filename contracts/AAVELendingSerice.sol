import "./ILendingService.sol";

contract AAVELendingService is ILendingService {

    function deposit(uint256 amount) external override(ILendingService)  {
    }

    function withdraw(uint256 amount) external override(ILendingService)  {
    }

    function withdrawCapitalAndInterests() external override(ILendingService)  {
    }

    function depositedBalance() external override(ILendingService) view returns (uint256) {
        return 0;
    }
}
