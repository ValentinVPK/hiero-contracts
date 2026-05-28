## Hiero Schedule Service (HSS) System Contract Functions

The Hiero Schedule Service (HSS) System Contract is accessible at address `0x16b` on the Hiero network. It exposes the network's scheduled transaction functionality to the EVM: contracts can create scheduled transactions, authorize and sign them, query information about scheduled token-create transactions, and delete schedules. A scheduled transaction is collected by the network and executed once it has gathered the signatures required to authorize it (or, for time-based schedules, once its expiration second is reached).

The HSS interface is defined by [`IHederaScheduleService.sol`](IHederaScheduleService.sol) and the following HIP-specific extension interfaces:

- [`IHRC755.sol`](IHRC755.sol) — authorizing and signing existing schedules ([HIP-755](https://hips.hedera.com/hip/hip-755)).
- [`IHRC756.sol`](IHRC756.sol) — scheduling native system contract calls and querying scheduled token-create info ([HIP-756](https://hips.hedera.com/hip/hip-756)).
- [`IHRC1215.sol`](IHRC1215.sol) — scheduling arbitrary contract calls, deleting schedules, and checking schedule capacity ([HIP-1215](https://hips.hedera.com/hip/hip-1215)).

The abstract [`HederaScheduleService.sol`](HederaScheduleService.sol) contract provides ready-to-use wrappers around each of these calls.

### System Contract Functions

The table below outlines the available Hiero Schedule Service System Contract functions:

| Function Name                            | Function Selector Hash | Consensus Node Release Version                                                       | HIP                                              | Method Interface                                                                                                                                                                  |
| ---------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authorizeSchedule`                      | `0xf0637961`           | [0.57](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.57) | [HIP 755](https://hips.hedera.com/hip/hip-755)   | `authorizeSchedule(address schedule) external returns (int64 responseCode)`                                                                                                       |
| `signSchedule`                           | `0x358eeb03`           | [0.59](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.59) | [HIP 755](https://hips.hedera.com/hip/hip-755)   | `signSchedule(address schedule, bytes memory signatureMap) external returns (int64 responseCode)`                                                                                 |
| `scheduleNative`                         | `0xca829811`           | [0.59](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.59) | [HIP 756](https://hips.hedera.com/hip/hip-756)   | `scheduleNative(address systemContractAddress, bytes memory callData, address payer) external returns (int64 responseCode, address scheduleAddress)`                              |
| `getScheduledCreateFungibleTokenInfo`    | `0xda2d5f8f`           | [0.59](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.59) | [HIP 756](https://hips.hedera.com/hip/hip-756)   | `getScheduledCreateFungibleTokenInfo(address scheduleAddress) external returns (int64 responseCode, IHederaTokenService.FungibleTokenInfo memory fungibleTokenInfo)`              |
| `getScheduledCreateNonFungibleTokenInfo` | `0xd68c902c`           | [0.59](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.59) | [HIP 756](https://hips.hedera.com/hip/hip-756)   | `getScheduledCreateNonFungibleTokenInfo(address scheduleAddress) external returns (int64 responseCode, IHederaTokenService.NonFungibleTokenInfo memory nonFungibleTokenInfo)`     |
| `scheduleCall`                           | `0x6f5bfde8`           | [0.68](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.68) | [HIP 1215](https://hips.hedera.com/hip/hip-1215) | `scheduleCall(address to, uint256 expirySecond, uint256 gasLimit, uint64 value, bytes memory callData) external returns (int64 responseCode, address scheduleAddress)`            |
| `scheduleCallWithPayer`                  | `0xe6599c18`           | [0.68](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.68) | [HIP 1215](https://hips.hedera.com/hip/hip-1215) | `scheduleCallWithPayer(address to, address payer, uint256 expirySecond, uint256 gasLimit, uint64 value, bytes memory callData) external returns (int64 responseCode, address scheduleAddress)` |
| `executeCallOnPayerSignature`            | `0x105772b2`           | [0.68](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.68) | [HIP 1215](https://hips.hedera.com/hip/hip-1215) | `executeCallOnPayerSignature(address to, address payer, uint256 expirySecond, uint256 gasLimit, uint64 value, bytes memory callData) external returns (int64 responseCode, address scheduleAddress)` |
| `deleteSchedule`                         | `0x72d42394`           | [0.68](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.68) | [HIP 1215](https://hips.hedera.com/hip/hip-1215) | `deleteSchedule(address scheduleAddress) external returns (int64 responseCode)`                                                                                                   |
| `hasScheduleCapacity`                    | `0xdfb4a999`           | [0.68](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.68) | [HIP 1215](https://hips.hedera.com/hip/hip-1215) | `hasScheduleCapacity(uint256 expirySecond, uint256 gasLimit) external view returns (bool hasCapacity)`                                                                            |

### Facade Functions

The Hiero network also makes facade contract calls available to EOAs for an improved experience.
Facade functions allow EOAs to make calls without requiring a deployed contract — the EOA calls the schedule's own address directly.
The table below outlines the available Hiero Schedule Service (HSS) System Contract facade functions, defined in [`IHRCScheduleFacade.sol`](IHRCScheduleFacade.sol):

| Function Name    | Function Selector Hash | Consensus Node Release Version                                                       | HIP                                              | Method Interface                                       | Defining Interface                                       |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------- |
| `signSchedule`   | `0x06d15889`           | [0.57](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.57) | [HIP 755](https://hips.hedera.com/hip/hip-755)   | `signSchedule() external returns (int64 responseCode)` | [`IHRC755ScheduleFacade.sol`](IHRC755ScheduleFacade.sol) |
| `deleteSchedule` | `0xc61dea85`           | [0.68](https://docs.hedera.com/hedera/networks/release-notes/services#release-v0.68) | [HIP 1215](https://hips.hedera.com/hip/hip-1215) | `deleteSchedule() external returns (int64 responseCode)` | [`IHRC1215ScheduleFacade.sol`](IHRC1215ScheduleFacade.sol) |

### Function Notes

- **`authorizeSchedule`** — Authorizes the calling contract as a signer on the target schedule transaction.
- **`signSchedule`** — Signs the target schedule with a protobuf-encoded signature map. The signed message is the concatenation of the shard, realm, and schedule transaction ID. The parameterless facade form signs with the key of the calling EOA.
- **`scheduleNative`** — Creates a schedule transaction for a call to another system contract. Currently supports the Hiero Token Service (`0x167`) with call data for `createFungibleToken`, `createNonFungibleToken`, `createFungibleTokenWithCustomFees`, `createNonFungibleTokenWithCustomFees`, and `updateToken`.
- **`getScheduledCreateFungibleTokenInfo` / `getScheduledCreateNonFungibleTokenInfo`** — Return the token info that a scheduled token-create transaction will produce.
- **`scheduleCall`** — Schedules an arbitrary contract call (`to`, `gasLimit`, `value`, `callData`) to execute once the consensus second reaches `expirySecond`. The payer is the scheduling account.
- **`scheduleCallWithPayer`** — Like `scheduleCall`, but a separate `payer` account funds the future call. Execution waits until `expirySecond` *and* the payer's key has been activated by sufficient signatures.
- **`executeCallOnPayerSignature`** — Like `scheduleCallWithPayer`, but executes as soon as the payer signs rather than waiting for `expirySecond` (it still will not execute after `expirySecond` has passed).
- **`deleteSchedule`** — Deletes the target schedule transaction so it can no longer be signed or executed. The facade form deletes the schedule whose address is being called.
- **`hasScheduleCapacity`** — Returns `true` if the given second still has gas capacity to accept a scheduled contract call with the specified gas limit.

All functions return an `int64 responseCode` (`SUCCESS` is `22`) from [`HederaResponseCodes.sol`](../common/HederaResponseCodes.sol), except `hasScheduleCapacity`, which returns a `bool`.
