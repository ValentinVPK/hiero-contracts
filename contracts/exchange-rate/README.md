## Exchange Rate System Contract Functions

The Exchange Rate System Contract is accessible at address `0x168` on the Hiero network. It exposes the network's active HBAR-to-USD exchange rate to the EVM, letting contracts convert between **tinycents** (1e-8 US cents) and **tinybars** (1e-8 HBAR). The rate is the same one the network uses to price transaction fees — read from system file `0.0.112` — so a "self-funding" contract can use it to compute how much HBAR a caller must send to cover fees. It is **not** a live price oracle and should not be treated as one.

The interface is defined by [`IExchangeRate.sol`](IExchangeRate.sol).

The table below outlines the available methods in the Exchange Rate System Contract:
| Function Name | Function Selector Hash | Consensus Node Release Version | HIP | Method Interface |
| --------------------- | ------------ | ---------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| `tinycentsToTinybars` | `0x2e3cff6a` | [0.26](https://docs.hedera.com/hedera/networks/release-notes/services#v0.26) | [HIP 475](https://hips.hedera.com/hip/hip-475) | `tinycentsToTinybars(uint256 tinycents) external returns (uint256 tinybars)` |
| `tinybarsToTinycents` | `0x43a88229` | [0.26](https://docs.hedera.com/hedera/networks/release-notes/services#v0.26) | [HIP 475](https://hips.hedera.com/hip/hip-475) | `tinybarsToTinycents(uint256 tinybars) external returns (uint256 tinycents)` |
