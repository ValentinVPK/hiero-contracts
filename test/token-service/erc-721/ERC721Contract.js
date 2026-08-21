// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';
import { network } from 'hardhat';
const { ethers } = await network.connect();
import Constants from '../../constants';
import hapi from '../hapi';
import utils from '../utils';

describe('ERC721Contract Test Suite', function () {
  let tokenCreateContract;
  let tokenAddress;
  let erc721Contract;
  let mintedTokenSerialNumber;
  let nftInitialOwnerAddress;
  let signers, firstWallet, secondWallet;

  before(async function () {
    this.timeout(180000); // [diag] bound the hook so a hang flushes instead of eating the 45m job cap
    const step = async (label, fn) => {
      console.log('[diag] erc721c: ' + label);
      try {
        return await fn();
      } catch (err) {
        utils.logRelayError('erc721c:' + label, err);
        throw err;
      }
    };
    signers = await ethers.getSigners();
    firstWallet = signers[0];
    secondWallet = signers[1];
    tokenCreateContract = await step('deployTokenCreateContract', () =>
      utils.deployTokenCreateContract(),
    );
    erc721Contract = await step('deployERC721Contract', () =>
      utils.deployERC721Contract(),
    );
    const tokenCreateAddr = await tokenCreateContract.getAddress();
    const erc721Addr = await erc721Contract.getAddress();
    // Relay model: no account re-keying. The token is precompile-created (so the
    // contract can read its ERC721 facade) with the CONTRACT as treasury — a
    // contract authorizes itself, whereas an EOA treasury would need re-keying.
    tokenAddress = await step('createNonFungibleToken', () =>
      utils.createNonFungibleToken(tokenCreateContract, tokenCreateAddr),
    );
    // Recipients must be associated + KYC-granted. Signers self-associate with
    // their own key; the contract holds the inherited KYC key so it grants KYC
    // without the target signing.
    await step('associate firstWallet', () =>
      hapi.associateWithSigner(
        utils.getHardhatSignerPrivateKeyByIndex(0),
        tokenAddress,
      ),
    );
    await step('associate secondWallet', () =>
      hapi.associateWithSigner(
        utils.getHardhatSignerPrivateKeyByIndex(1),
        tokenAddress,
      ),
    );
    await step('grantKyc firstWallet', () =>
      tokenCreateContract.grantTokenKycPublic(
        tokenAddress,
        firstWallet.address,
        Constants.GAS_LIMIT_1_000_000,
      ),
    );
    await step('grantKyc secondWallet', () =>
      tokenCreateContract.grantTokenKycPublic(
        tokenAddress,
        secondWallet.address,
        Constants.GAS_LIMIT_1_000_000,
      ),
    );
    await step('associate erc721Contract', () =>
      tokenCreateContract.associateTokenPublic(
        erc721Addr,
        tokenAddress,
        Constants.GAS_LIMIT_1_000_000,
      ),
    );
    await step('grantKyc erc721Contract', () =>
      tokenCreateContract.grantTokenKycPublic(
        tokenAddress,
        erc721Addr,
        Constants.GAS_LIMIT_1_000_000,
      ),
    );
    // Mint straight to firstWallet: the treasury contract mints then transfers
    // the NFT to msg.sender (firstWallet, the tx sender), authorized as owner.
    mintedTokenSerialNumber = await step('mintNFTToAddress firstWallet', () =>
      utils.mintNFTToAddress(tokenCreateContract, tokenAddress),
    );
    nftInitialOwnerAddress = firstWallet.address;
    console.log('[diag] erc721c: before DONE');
  });

  after(function () {
    hapi.client.close();
  });

  it('should be able to get token name', async function () {
    const name = await erc721Contract.name(tokenAddress);
    expect(name).to.equal(Constants.TOKEN_NAME);
  });

  it('should be able to get token symbol', async function () {
    const symbol = await erc721Contract.symbol(tokenAddress);
    expect(symbol).to.equal(Constants.TOKEN_SYMBOL);
  });

  it('should be able to get token totalSupply', async function () {
    const totalSupply = await erc721Contract.totalSupply(tokenAddress);
    expect(totalSupply).to.equal(1);
  });

  it('should be able to get token uri via tokenURI', async function () {
    const tokenURI = await erc721Contract.tokenURI(
      tokenAddress,
      mintedTokenSerialNumber,
    );
    expect(tokenURI).to.equal('\u0001');
  });

  it('should be able to execute ownerOf', async function () {
    const owner = await erc721Contract.ownerOf(
      tokenAddress,
      mintedTokenSerialNumber,
    );
    expect(owner).to.equal(nftInitialOwnerAddress);
  });

  it('should be able to execute balanceOf', async function () {
    const balance = await erc721Contract.balanceOf(
      tokenAddress,
      nftInitialOwnerAddress,
    );
    expect(balance).to.equal(1);
  });

  it('should be able to execute getApproved', async function () {
    const approved = await erc721Contract.getApproved(
      tokenAddress,
      mintedTokenSerialNumber,
    );
    expect(approved).to.equal('0x0000000000000000000000000000000000000000');
  });

  it('should NOT be able to execute delegateSetApprovalForAll and isApprovedForAll', async function () {
    const secondWallet = (await ethers.getSigners())[1];
    const isApprovedForAllBefore = await erc721Contract.isApprovedForAll(
      tokenAddress,
      firstWallet.address,
      secondWallet.address,
    );
    await erc721Contract.delegateSetApprovalForAll(
      tokenAddress,
      secondWallet.address,
      true,
      Constants.GAS_LIMIT_1_000_000,
    );
    const isApprovedForAllAfter = await erc721Contract.isApprovedForAll(
      tokenAddress,
      firstWallet.address,
      secondWallet.address,
    );

    expect(isApprovedForAllBefore).to.equal(false);
    expect(isApprovedForAllAfter).to.not.equal(true);
  });

  it('should be able to execute delegate transferFrom', async function () {
    const ownerBefore = await erc721Contract.ownerOf(
      tokenAddress,
      mintedTokenSerialNumber,
    );
    const erc721ContractNFTOwner = await ethers.getContractAt(
      Constants.Contract.ERC721Contract,
      await erc721Contract.getAddress(),
      firstWallet,
    );
    await erc721ContractNFTOwner.delegateTransferFrom(
      tokenAddress,
      firstWallet.address,
      secondWallet.address,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000,
    );
    const ownerAfter = await erc721Contract.ownerOf(
      tokenAddress,
      mintedTokenSerialNumber,
    );

    expect(ownerBefore).to.equal(firstWallet.address);
    expect(ownerAfter).to.not.equal(secondWallet.address);
  });

  it('should be able to delegate approve', async function () {
    const erc721ContractNFTOwner = await ethers.getContractAt(
      Constants.Contract.ERC721Contract,
      await erc721Contract.getAddress(),
      secondWallet,
    );
    const beforeApproval = await erc721ContractNFTOwner.getApproved(
      tokenAddress,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000,
    );
    await erc721ContractNFTOwner.delegateApprove(
      tokenAddress,
      firstWallet.address,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000,
    );
    const afterApproval = await erc721ContractNFTOwner.getApproved(
      tokenAddress,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000,
    );

    expect(beforeApproval).to.equal(
      '0x0000000000000000000000000000000000000000',
    );
    expect(afterApproval).to.not.equal(firstWallet.address);
  });

  it('should be able execute safeTransferFrom', async function () {
    const tx = erc721Contract.safeTransferFrom(
      tokenAddress,
      firstWallet.address,
      secondWallet.address,
      mintedTokenSerialNumber,
      Constants.GAS_LIMIT_1_000_000,
    );
    await expect((await tx).wait()).to.eventually.not.be.rejected;
  });

  it('should be able execute safeTransferFromWithData', async function () {
    const tx = erc721Contract.safeTransferFromWithData(
      tokenAddress,
      firstWallet.address,
      secondWallet.address,
      mintedTokenSerialNumber,
      '0x01',
      Constants.GAS_LIMIT_1_000_000,
    );

    await expect((await tx).wait()).to.eventually.not.be.rejected;
  });

  describe('Unsupported operations', async function () {
    let serialNumber;

    before(async function () {
      // Mint straight to firstWallet (the tx sender), so no separate transfer.
      serialNumber = await utils.mintNFTToAddress(
        tokenCreateContract,
        tokenAddress,
        ['0x02'],
      );
    });

    it('should NOT be able to execute approve', async function () {
      const erc721ContractNFTOwner = await ethers.getContractAt(
        Constants.Contract.ERC721Contract,
        await erc721Contract.getAddress(),
        secondWallet,
      );
      const beforeApproval = await erc721ContractNFTOwner.getApproved(
        tokenAddress,
        serialNumber,
        Constants.GAS_LIMIT_1_000_000,
      );
      await utils.expectToFail(
        erc721ContractNFTOwner.approve(
          tokenAddress,
          firstWallet.address,
          serialNumber,
          Constants.GAS_LIMIT_1_000_000,
        ),
      );
      const afterApproval = await erc721ContractNFTOwner.getApproved(
        tokenAddress,
        serialNumber,
        Constants.GAS_LIMIT_1_000_000,
      );

      expect(beforeApproval).to.equal(
        '0x0000000000000000000000000000000000000000',
      );
      expect(afterApproval).to.equal(
        '0x0000000000000000000000000000000000000000',
      );
    });

    it('should NOT be able to execute transferFrom', async function () {
      const ownerBefore = await erc721Contract.ownerOf(
        tokenAddress,
        serialNumber,
      );
      const erc721ContractNFTOwner = await ethers.getContractAt(
        Constants.Contract.ERC721Contract,
        await erc721Contract.getAddress(),
        firstWallet,
      );
      await utils.expectToFail(
        erc721ContractNFTOwner.transferFrom(
          tokenAddress,
          firstWallet.address,
          secondWallet.address,
          serialNumber,
          Constants.GAS_LIMIT_1_000_000,
        ),
      );
      const ownerAfter = await erc721Contract.ownerOf(
        tokenAddress,
        serialNumber,
      );

      expect(ownerBefore).to.equal(firstWallet.address);
      expect(ownerAfter).to.equal(firstWallet.address);
    });

    it('should NOT be able call tokenByIndex', async function () {
      await utils.expectToFail(
        erc721Contract.tokenByIndex(tokenAddress, 0),
        Constants.CONTRACT_REVERT_EXECUTED_CODE,
      );
    });

    it('should NOT be able call tokenOfOwnerByIndex', async function () {
      await utils.expectToFail(
        erc721Contract.tokenOfOwnerByIndex(
          tokenAddress,
          firstWallet.address,
          0,
        ),
        Constants.CONTRACT_REVERT_EXECUTED_CODE,
      );
    });
  });
});
