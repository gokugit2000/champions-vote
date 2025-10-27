import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHEChampionsVote, FHEChampionsVote__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEChampionsVote")) as FHEChampionsVote__factory;
  const voteContract = (await factory.deploy()) as FHEChampionsVote;
  const voteContractAddress = await voteContract.getAddress();
  return { voteContract, voteContractAddress };
}

describe("FHEChampionsVote", function () {
  let signers: Signers;
  let voteContract: FHEChampionsVote;
  let voteContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This test suite requires a mock FHEVM environment`);
      this.skip();
    }
    ({ voteContract, voteContractAddress } = await deployFixture());
  });

  // ===== Basic Tests =====
  it("should show users haven't voted initially", async function () {
    expect(await voteContract.isVoted(signers.alice.address)).to.eq(false);
    expect(await voteContract.isVoted(signers.bob.address)).to.eq(false);
  });

  it("should allow a user to submit and update their vote", async function () {
    const initialChoice = 1;
    const updatedChoice = 3;

    // Initial vote
    const encryptedInitial = await fhevm
      .createEncryptedInput(voteContractAddress, signers.alice.address)
      .add32(initialChoice)
      .encrypt();

    await (
      await voteContract.connect(signers.alice).submitVote(encryptedInitial.handles[0], encryptedInitial.inputProof)
    ).wait();
    expect(await voteContract.isVoted(signers.alice.address)).to.eq(true);

    let decryptedVote = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await voteContract.encryptedVoteOf(signers.alice.address),
      voteContractAddress,
      signers.alice,
    );
    expect(decryptedVote).to.eq(initialChoice);

    // Update vote (revote)
    const encryptedUpdate = await fhevm
      .createEncryptedInput(voteContractAddress, signers.alice.address)
      .add32(updatedChoice)
      .encrypt();

    await (
      await voteContract.connect(signers.alice).submitVote(encryptedUpdate.handles[0], encryptedUpdate.inputProof)
    ).wait();

    decryptedVote = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await voteContract.encryptedVoteOf(signers.alice.address),
      voteContractAddress,
      signers.alice,
    );
    expect(decryptedVote).to.eq(updatedChoice);
  });

  it("should allow multiple users to vote independently", async function () {
    const aliceChoice = 2;
    const bobChoice = 4;

    const aliceEncrypted = await fhevm
      .createEncryptedInput(voteContractAddress, signers.alice.address)
      .add32(aliceChoice)
      .encrypt();

    const bobEncrypted = await fhevm
      .createEncryptedInput(voteContractAddress, signers.bob.address)
      .add32(bobChoice)
      .encrypt();

    await (
      await voteContract.connect(signers.alice).submitVote(aliceEncrypted.handles[0], aliceEncrypted.inputProof)
    ).wait();
    await (await voteContract.connect(signers.bob).submitVote(bobEncrypted.handles[0], bobEncrypted.inputProof)).wait();

    const aliceDecrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await voteContract.encryptedVoteOf(signers.alice.address),
      voteContractAddress,
      signers.alice,
    );
    const bobDecrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await voteContract.encryptedVoteOf(signers.bob.address),
      voteContractAddress,
      signers.bob,
    );

    expect(aliceDecrypted).to.eq(aliceChoice);
    expect(bobDecrypted).to.eq(bobChoice);
    expect(await voteContract.isVoted(signers.alice.address)).to.eq(true);
    expect(await voteContract.isVoted(signers.bob.address)).to.eq(true);
  });

  it("should return uninitialized vote for users who haven't voted", async function () {
    const vote = await voteContract.encryptedVoteOf(signers.bob.address);
    expect(vote).to.eq(ethers.ZeroHash);
  });

  it("should handle multiple users voting consecutively", async function () {
    const choices = [1, 2, 3];
    const users = [signers.deployer, signers.alice, signers.bob];

    for (let i = 0; i < users.length; i++) {
      const encrypted = await fhevm
        .createEncryptedInput(voteContractAddress, users[i].address)
        .add32(choices[i])
        .encrypt();
      await (await voteContract.connect(users[i]).submitVote(encrypted.handles[0], encrypted.inputProof)).wait();
    }

    for (let i = 0; i < users.length; i++) {
      expect(await voteContract.isVoted(users[i].address)).to.eq(true);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        await voteContract.encryptedVoteOf(users[i].address),
        voteContractAddress,
        users[i],
      );
      expect(decrypted).to.eq(choices[i]);
    }
  });

  it("should allow revoting multiple times without conflict", async function () {
    const choices = [1, 3, 2]; // simulate multiple updates

    const encrypted1 = await fhevm
      .createEncryptedInput(voteContractAddress, signers.alice.address)
      .add32(choices[0])
      .encrypt();
    await (await voteContract.connect(signers.alice).submitVote(encrypted1.handles[0], encrypted1.inputProof)).wait();

    const encrypted2 = await fhevm
      .createEncryptedInput(voteContractAddress, signers.alice.address)
      .add32(choices[1])
      .encrypt();
    await (await voteContract.connect(signers.alice).submitVote(encrypted2.handles[0], encrypted2.inputProof)).wait();

    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await voteContract.encryptedVoteOf(signers.alice.address),
      voteContractAddress,
      signers.alice,
    );
    expect(decrypted).to.eq(choices[1]);

    // Final revote
    const encrypted3 = await fhevm
      .createEncryptedInput(voteContractAddress, signers.alice.address)
      .add32(choices[2])
      .encrypt();
    await (await voteContract.connect(signers.alice).submitVote(encrypted3.handles[0], encrypted3.inputProof)).wait();

    const finalDecrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await voteContract.encryptedVoteOf(signers.alice.address),
      voteContractAddress,
      signers.alice,
    );
    expect(finalDecrypted).to.eq(choices[2]);
  });
});
