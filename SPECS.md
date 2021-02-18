
version: 0.1
### *Initial draft*


# Elevator pitch

Protocol that manages rent payment, deposits and rent guarantees for landlords and tenants without any third-party or guarantors.

# Definitions
Rent: Payment from tenant to landlord for the use of a property.

Security Deposit: A security deposit protects the landlord from financial loss should the tenant cause serious damage to the property.

Rent guarantee: Money locked upfront that is claimable by the landlord in case of non-payment of rent

Note: Security deposit usually also protects from **unpaid rent** however we would make a distinction between *Security Deposit* and *Rent Guarantee* because the latter is verifiable on-chain, the former is not.


# User stories

## 1. Moving in

Amount for *rent*, *security deposit* and *rent guarantee* to be agreed upon off-chain between landlord and tenant.

As a tenant:

- I should be able to lock a certain amount as deposit
- I should be able to lock a certain amount as rent guarantee


## 2. Renting


As a tenant:
- I should be able to pay my rent on time (if rent is due on the 5th of each month, it means before that day).

As a landlord:
- I should be able to withdraw from the protocol the rent from the moment it's due
- If rent payment is late, I should be able to withdraw from the rent guarantee an amount equivalent to the unpaid rent (see below for integration with Sablier)

## 3. Moving out

As a landlord:
- I should have control over the deposit and how much of it is given back (dependency with off-chain legal procedure for outgoing inspection)


# Further integrations

- Deposit and rent guarantee locked in the protocol can be deposited on **Aave** and generate interests => 100% of the interests go to the tenant ? x% to the tenant / y% to the landlord ?

- Sablier allows to stream money, which could potentially be used to:
  - Determine the amount of rent that is due and increasing each second! If rent is due once, the tenant doesn't necessarily to do 1 transfer per month. Similarly, the landlord doesn't have to withdraw rent money owed once a month.
  - Determine exactly the amount of rent that is due, unpaid and claimable from the rent guarantee (also increasing each second) 



# Research

- https://en.m.wikipedia.org/wiki/Jeonse
- IMPORTANT: THE LANDLORD MAY BE REQUIRED BY STATE LAW TO PAY INTEREST ON BOTH LAST MONTH'S RENT AND SECURITY DEPOSIT
