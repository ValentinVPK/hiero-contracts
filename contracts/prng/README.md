## Pseudo-Random Number Generator (PRNG) System Contract Functions

The Pseudo-Random Number Generator (PRNG) System Contract is accessible at address `0x169` on the Hiero network. It returns a 256-bit pseudo-random seed derived from the network's running hash (the first 256 bits of the running hash of the n-3 transaction record). Callers can derive a pseudo-random number in a desired range from the seed as `uint256(seed) % range`. The interface is defined by [`IPrngSystemContract.sol`](IPrngSystemContract.sol).

The table below outlines the available Pseudo-Random Number Generator (PRNG) System Contract functions:

| Function Name          | Function Selector Hash | Consensus Node Release Version                                               | HIP                                            | Method Interface                                       |
|------------------------|------------------------|------------------------------------------------------------------------------|------------------------------------------------|--------------------------------------------------------|
| `getPseudorandomSeed`  | `0xd83bf9a1`           | [0.28](https://docs.hedera.com/hedera/networks/release-notes/services#v0.28) | [HIP 351](https://hips.hedera.com/hip/hip-351) | `getPseudorandomSeed() external returns (bytes32 seed)` |
