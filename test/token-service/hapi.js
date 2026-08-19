// SPDX-License-Identifier: Apache-2.0

import {
  AccountAllowanceApproveTransaction,
  AccountBalanceQuery,
  AccountId,
  AccountInfoQuery,
  AccountUpdateTransaction,
  Client,
  ContractId,
  Hbar,
  KeyList,
  NftId,
  PrivateKey,
  TokenAssociateTransaction,
  TokenId,
  TokenUpdateTransaction,
} from '@hashgraph/sdk';
import hre from 'hardhat';
const connection = await hre.network.connect();
import { config as globalConfig } from '../config.js';
const { sdkClient: config } = globalConfig.networks[connection.networkName];
import utils from './utils';

class Hapi {
  _client;

  get client() {
    if (this._client && !this._client.isClientShutDown) return this._client;
    const hederaNetwork = {};
    hederaNetwork[config.networkNodeUrl] = AccountId.fromString(config.nodeId);
    this._client = Client.forNetwork(hederaNetwork)
      .setMirrorNetwork(config.mirrorNode)
      .setOperator(config.operatorId, config.operatorKey);
    return this._client;
  }

  async updateAccountKeys(contractAddresses, ecdsaPrivateKeys = []) {
    if (!ecdsaPrivateKeys.length) {
      ecdsaPrivateKeys = await utils.getHardhatSignersPrivateKeys(false);
    }
    for (const privateKey of ecdsaPrivateKeys) {
      const pkSigner = PrivateKey.fromStringECDSA(privateKey.replace('0x', ''));
      const accountId = await this.getAccountId(
        pkSigner.publicKey.toEvmAddress(),
      );
      this.client.setOperator(accountId, pkSigner);

      const keyList = new KeyList(
        [
          pkSigner.publicKey,
          ...contractAddresses.map((address) =>
            ContractId.fromEvmAddress(0, 0, address),
          ),
        ],
        1,
      );
      await (
        await new AccountUpdateTransaction()
          .setAccountId(accountId)
          .setKey(keyList)
          .freezeWith(this.client)
          .sign(pkSigner)
      ).execute(this.client);
    }
    this.client.setOperator(config.operatorId, config.operatorKey);
  }

  async updateTokenKeys(
    tokenAddress,
    contractAddresses,
    // eslint-disable-next-line no-unused-vars -- kept for positional-arg compatibility with existing callers; the admin key is intentionally never re-keyed to a contract (a contract cannot sign to accept it, per HIP-540)
    setAdmin = true,
    setPause = true,
    setKyc = true,
    setFreeze = true,
    setSupply = true,
    setWipe = true,
    setFeeSchedule = true,
  ) {
    const signers = await connection.ethers.getSigners();
    const pkSigners = (await utils.getHardhatSignersPrivateKeys()).map((pk) =>
      PrivateKey.fromStringECDSA(pk),
    );
    const accountIdSigner0 = await this.getAccountId(signers[0].address);

    this.client.setOperator(accountIdSigner0, pkSigners[0]);

    // Under the v2 smart-contract security model, a contract may only use a token
    // key if that key IS a contract id (a `KeyList` of contract ids works — any
    // member is authorized). Hand the operational keys to the contracts directly.
    // NOTE: the admin key is intentionally NOT re-keyed here. Per HIP-540 the new
    // admin key must sign the update, and a contract cannot sign a HAPI
    // transaction, so admin can never be handed to a contract this way. It stays
    // with the operator; admin-gated ops through a contract (delete /
    // updateTokenInfo / updateExpiry / updateTokenKeys) are handled separately.
    const keyList = new KeyList(
      contractAddresses.map((address) =>
        ContractId.fromEvmAddress(0, 0, address),
      ),
      1,
    );

    const tx = new TokenUpdateTransaction().setTokenId(
      TokenId.fromSolidityAddress(tokenAddress),
    );
    if (setPause) tx.setPauseKey(keyList);
    if (setKyc) tx.setKycKey(keyList);
    if (setFreeze) tx.setFreezeKey(keyList);
    if (setSupply) tx.setSupplyKey(keyList);
    if (setWipe) tx.setWipeKey(keyList);
    if (setFeeSchedule) tx.setFeeScheduleKey(keyList);

    await (
      await tx.freezeWith(this.client).sign(pkSigners[0])
    ).execute(this.client);
    this.client.setOperator(config.operatorId, config.operatorKey);
  }

  async approveAllowances(
    ownerIndex,
    spenderAddress,
    { hbar = 0, tokens = [], nfts = [] },
  ) {
    const signers = await connection.ethers.getSigners();
    const pkSigners = (await utils.getHardhatSignersPrivateKeys()).map((pk) =>
      PrivateKey.fromStringECDSA(pk),
    );
    const ownerId = await this.getAccountId(signers[ownerIndex].address);
    const spenderId = await this.getAccountId(spenderAddress);
    this.client.setOperator(ownerId, pkSigners[ownerIndex]);

    const tx = new AccountAllowanceApproveTransaction();
    if (hbar) {
      tx.approveHbarAllowance(ownerId, spenderId, Hbar.fromTinybars(hbar));
    }
    for (const { token, amount } of tokens) {
      tx.approveTokenAllowance(
        TokenId.fromSolidityAddress(token),
        ownerId,
        spenderId,
        amount,
      );
    }
    for (const { token, serials } of nfts) {
      for (const serial of serials) {
        tx.approveTokenNftAllowance(
          new NftId(TokenId.fromSolidityAddress(token), serial),
          ownerId,
          spenderId,
        );
      }
    }

    await (
      await tx.freezeWith(this.client).sign(pkSigners[ownerIndex])
    ).execute(this.client);
    this.client.setOperator(config.operatorId, config.operatorKey);
  }

  async getAccountBalance(address) {
    const accountId = await this.getAccountId(address);
    return await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(this.client);
  }

  async getAccountId(evmAddress) {
    const query = new AccountInfoQuery().setAccountId(
      AccountId.fromEvmAddress(0, 0, evmAddress),
    );

    const accountInfo = await query.execute(this.client);
    return accountInfo.accountId.toString();
  }

  async getAccountInfo(evmAddress) {
    const query = new AccountInfoQuery().setAccountId(
      AccountId.fromEvmAddress(0, 0, evmAddress),
    );

    return await query.execute(this.client);
  }

  async associateWithSigner(privateKey, tokenAddress) {
    const wallet = new connection.ethers.Wallet(privateKey);
    const accountIdAsString = await this.getAccountId(wallet.address);
    const signerPk = PrivateKey.fromStringECDSA(wallet.signingKey.privateKey);

    const signerClient = this.client.setOperator(
      accountIdAsString,
      signerPk.toString(), // DER encoded
    );

    const transaction = new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(accountIdAsString))
      .setTokenIds([TokenId.fromSolidityAddress(tokenAddress)])
      .freezeWith(signerClient);

    const signTx = await transaction.sign(signerPk);
    const txResponse = await signTx.execute(signerClient);
    await txResponse.getReceipt(signerClient);

    this.client.setOperator(config.operatorId, config.operatorKey);
  }

  async getHbarBalance(address) {
    const { hbars } = (await this.getAccountBalance(address)).toJSON();
    return parseFloat(hbars);
  }

  async getTokenBalance(accountAddress, tokenAddress) {
    const accountBalanceJson = (
      await this.getAccountBalance(accountAddress)
    ).toJSON();
    const tokenId = await AccountId.fromEvmAddress(
      0,
      0,
      tokenAddress,
    ).toString();
    const { balance } = accountBalanceJson.tokens.find(
      (e) => e.tokenId === tokenId,
    );

    return parseInt(balance);
  }
}

export default new Hapi();
