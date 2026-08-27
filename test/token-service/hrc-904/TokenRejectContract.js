// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import hre from 'hardhat';
const { ethers } = await hre.network.connect();
import Constants from '../../constants';
import hapi from '../hapi';
import utils from '../utils';

describe('HIP904Batch3 TokenRejectContract Test Suite', function () {
  let tokenRejectContract;
  let tokenCreateContract;
  let airdropContract;
  let owner;
  let rejecter;
  let secondRejecter;
  let pendingRejecter;
  let contractAddresses;

  before(async function () {
    tokenRejectContract = await utils.deployContract(
      Constants.Contract.TokenReject,
    );
    tokenCreateContract = await utils.deployContract(
      Constants.Contract.TokenCreateContract,
    );
    airdropContract = await utils.deployContract(Constants.Contract.Airdrop);

    contractAddresses = [
      await tokenRejectContract.getAddress(),
      await tokenCreateContract.getAddress(),
      await airdropContract.getAddress(),
    ];

    // Relay model: no account re-keying. TokenReject rejects on the holder's
    // behalf and Airdrop debits the sender, so every account either contract
    // acts upon must have those contracts in its key — impossible for a hardhat
    // signer that still sends EthereumTransactions. All of them are therefore
    // contract-keyed accounts that only act as subjects; signers[0] keeps
    // sending every transaction.
    const contractKeyedAccount = async (maxAutoAssociations) =>
      ethers.getAddress(
        (
          await hapi.createAccountWithContractIdKey(
            contractAddresses,
            20,
            maxAutoAssociations,
          )
        ).address,
      );

    // Airdrop sender, and treasury of every token created here.
    owner = await contractKeyedAccount(0);
    // Holders that reject: unlimited automatic associations, so an airdrop to
    // them lands straight away and there is a balance to reject. They replace
    // signers[1..2], which used to be associated to each token through the
    // contract — that only worked while their keys included it.
    rejecter = await contractKeyedAccount(-1);
    secondRejecter = await contractKeyedAccount(-1);
    // No association slots, so airdrops to it stay pending and it never holds
    // the token — the case the not-associated test needs.
    pendingRejecter = await contractKeyedAccount(0);
  });

  after(function () {
    hapi.client.close();
  });

  it('should reject tokens for a single account', async function () {
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses,
      hapi,
    );

    const ftAmount = BigInt(1);
    const airdropTx = await airdropContract.tokenAirdrop(
      tokenAddress,
      owner,
      rejecter,
      ftAmount,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      },
    );
    await airdropTx.wait();

    const tx = await tokenRejectContract.rejectTokens(
      rejecter,
      [tokenAddress],
      [],
      [],
      Constants.GAS_LIMIT_2_000_000,
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22'); // SUCCESS code
  });

  it('should reject NFTs for a single account', async function () {
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses,
      hapi,
    );

    const serial = await utils.mintNFT(tokenCreateContract, nftTokenAddress);

    const airdropTx = await airdropContract.nftAirdrop(
      nftTokenAddress,
      owner,
      rejecter,
      serial,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      },
    );
    await airdropTx.wait();

    const tx = await tokenRejectContract.rejectTokens(
      rejecter,
      [],
      [nftTokenAddress],
      [serial],
      Constants.GAS_LIMIT_2_000_000,
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22'); // SUCCESS code
  });

  it('should reject a specific NFT serial when more than one has been minted', async function () {
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses,
      hapi,
    );

    // Mint two NFTs and reject the SECOND serial. A regression to a hardcoded
    // serial (e.g. the previous `nftId.serial = 1`) would fail this case.
    await utils.mintNFT(tokenCreateContract, nftTokenAddress);
    const secondSerial = await utils.mintNFT(
      tokenCreateContract,
      nftTokenAddress,
    );
    expect(secondSerial).to.eq(2);

    const airdropTx = await airdropContract.nftAirdrop(
      nftTokenAddress,
      owner,
      rejecter,
      secondSerial,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      },
    );
    await airdropTx.wait();

    const tx = await tokenRejectContract.rejectTokens(
      rejecter,
      [],
      [nftTokenAddress],
      [secondSerial],
      Constants.GAS_LIMIT_2_000_000,
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('22'); // SUCCESS code
  });

  it('should reject tokens for multiple accounts', async function () {
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses,
      hapi,
    );
    for (const rejectingAccount of [rejecter, secondRejecter]) {
      const airdropTx = await airdropContract.tokenAirdrop(
        tokenAddress,
        owner,
        rejectingAccount,
        BigInt(1),
        {
          value: Constants.ONE_HBAR,
          gasLimit: 2_000_000,
        },
      );
      await airdropTx.wait();

      const tx = await tokenRejectContract.rejectTokens(
        rejectingAccount,
        [tokenAddress],
        [],
        [],
        Constants.GAS_LIMIT_2_000_000,
      );
      const responseCode = await utils.getHTSResponseCode(tx.hash);
      expect(responseCode).to.eq('22'); // SUCCESS code
    }
  });

  it('should fail when sender does not have any associated tokens', async function () {
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses,
      hapi,
    );

    const airdropTx = await airdropContract.tokenAirdrop(
      tokenAddress,
      owner,
      pendingRejecter,
      BigInt(1),
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      },
    );
    await airdropTx.wait();

    const tx = await tokenRejectContract.rejectTokens(
      pendingRejecter,
      [tokenAddress],
      [],
      [],
      Constants.GAS_LIMIT_2_000_000,
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('184'); // TOKEN_NOT_ASSOCIATED_TO_ACCOUNT code
  });

  it('should fail when sender does not have a pending airdrop', async function () {
    const tokenAddress = await utils.setupToken(
      tokenCreateContract,
      owner,
      contractAddresses,
      hapi,
    );

    // Associate without transferring anything: automatic association only fires
    // on receipt, and an unassociated holder would fail with 184 before the
    // balance is ever checked.
    await (
      await tokenCreateContract.associateTokenPublic(
        rejecter,
        tokenAddress,
        Constants.GAS_LIMIT_1_000_000,
      )
    ).wait();

    const tx = await tokenRejectContract.rejectTokens(
      rejecter,
      [tokenAddress],
      [],
      [],
      Constants.GAS_LIMIT_2_000_000,
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('178'); // INSUFFICIENT_TOKEN_BALANCE code
  });

  it('should fail when provided fungible token is invalid', async function () {
    const invalidToken = ethers.Wallet.createRandom().address;
    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses,
      hapi,
    );

    // Fails on the invalid fungible token before the NFT serial is evaluated,
    // so the serial value here is irrelevant (placeholder to match array length).
    const tx = await tokenRejectContract.rejectTokens(
      rejecter,
      [invalidToken],
      [nftTokenAddress],
      [1],
      Constants.GAS_LIMIT_2_000_000,
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('167'); // INVALID_TOKEN_ID code
  });

  it('should fail when provided NFT is invalid', async function () {
    const invalidNft = ethers.Wallet.createRandom().address;

    const nftTokenAddress = await utils.setupNft(
      tokenCreateContract,
      owner,
      contractAddresses,
      hapi,
    );

    const serial = await utils.mintNFT(tokenCreateContract, nftTokenAddress);

    const airdropTx = await airdropContract.nftAirdrop(
      nftTokenAddress,
      owner,
      rejecter,
      serial,
      {
        value: Constants.ONE_HBAR,
        gasLimit: 2_000_000,
      },
    );
    await airdropTx.wait();

    const tx = await tokenRejectContract.rejectTokens(
      rejecter,
      [],
      [invalidNft],
      [serial],
      Constants.GAS_LIMIT_2_000_000,
    );
    const responseCode = await utils.getHTSResponseCode(tx.hash);
    expect(responseCode).to.eq('226'); // INVALID_NFT_ID code
  });
});
