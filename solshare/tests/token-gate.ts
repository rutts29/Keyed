import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolshareTokenGate } from "../target/types/solshare_token_gate";
import { assert, expect } from "chai";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import {
  createMint,
  createAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";

describe("solshare-token-gate", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolshareTokenGate as Program<SolshareTokenGate>;

  const creator = Keypair.generate();
  const user = Keypair.generate();
  const postPubkey = Keypair.generate().publicKey;

  let tokenMint: PublicKey;
  let userTokenAccount: PublicKey;
  let accessControlPda: PublicKey;

  const MINIMUM_BALANCE = 100; // Require 100 tokens

  before(async () => {
    // Airdrop SOL to test users
    for (const wallet of [creator, user]) {
      const airdropSig = await provider.connection.requestAirdrop(
        wallet.publicKey,
        5 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);
    }

    // Create token mint
    tokenMint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      6 // 6 decimals
    );

    // Create user token account
    userTokenAccount = await createAccount(
      provider.connection,
      user,
      tokenMint,
      user.publicKey
    );

    // Mint tokens to user (above minimum)
    await mintTo(
      provider.connection,
      creator,
      tokenMint,
      userTokenAccount,
      creator,
      150 * 10 ** 6 // 150 tokens
    );

    // Derive access control PDA
    [accessControlPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("access"), postPubkey.toBuffer()],
      program.programId
    );
  });

  describe("Access Control Setup", () => {
    it("sets token-based access requirements", async () => {
      await program.methods
        .setAccessRequirements(
          postPubkey,
          tokenMint,
          new anchor.BN(MINIMUM_BALANCE * 10 ** 6),
          null
        )
        .accounts({
          accessControl: accessControlPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const accessControl = await program.account.accessControl.fetch(
        accessControlPda
      );
      assert.deepEqual(accessControl.post, postPubkey);
      assert.deepEqual(accessControl.creator, creator.publicKey);
      assert.deepEqual(accessControl.requiredToken, tokenMint);
      assert.equal(
        accessControl.minimumBalance.toNumber(),
        MINIMUM_BALANCE * 10 ** 6
      );
      assert.deepEqual(accessControl.gateType, { token: {} });
    });

    it("fails with invalid gate config (no requirements)", async () => {
      const newPost = Keypair.generate().publicKey;
      const [newAccessControlPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("access"), newPost.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .setAccessRequirements(newPost, null, new anchor.BN(0), null)
          .accounts({
            accessControl: newAccessControlPda,
            creator: creator.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed - invalid gate config");
      } catch (e: any) {
        expect(e.message).to.include("InvalidGateConfig");
      }
    });
  });

  describe("Token Access Verification", () => {
    let verificationPda: PublicKey;

    it("verifies token access for user with sufficient balance", async () => {
      [verificationPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("verification"),
          user.publicKey.toBuffer(),
          postPubkey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .verifyTokenAccess()
        .accounts({
          accessControl: accessControlPda,
          verification: verificationPda,
          userTokenAccount: userTokenAccount,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const verification = await program.account.accessVerification.fetch(
        verificationPda
      );
      assert.deepEqual(verification.user, user.publicKey);
      assert.deepEqual(verification.post, postPubkey);
      assert.equal(verification.verified, true);
    });

    it("checks access for verified user", async () => {
      // Verify the verification account exists and is valid
      const verification = await program.account.accessVerification.fetch(
        verificationPda
      );
      assert.equal(verification.verified, true);
      assert.deepEqual(verification.user, user.publicKey);
      assert.deepEqual(verification.post, postPubkey);
    });

    it("fails to verify access with insufficient balance", async () => {
      // Create a new user with no tokens
      const poorUser = Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        poorUser.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // Create token account with 0 tokens
      const poorUserTokenAccount = await createAccount(
        provider.connection,
        poorUser,
        tokenMint,
        poorUser.publicKey
      );

      const [poorVerificationPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("verification"),
          poorUser.publicKey.toBuffer(),
          postPubkey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .verifyTokenAccess()
          .accounts({
            accessControl: accessControlPda,
            verification: poorVerificationPda,
            userTokenAccount: poorUserTokenAccount,
            user: poorUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([poorUser])
          .rpc();
        assert.fail("Should have failed - insufficient balance");
      } catch (e: any) {
        expect(e.message).to.include("InsufficientTokenBalance");
      }
    });
  });

  describe("NFT-Gated Access", () => {
    const nftPost = Keypair.generate().publicKey;
    let nftAccessControlPda: PublicKey;
    let nftMint: PublicKey;
    let nftTokenAccount: PublicKey;
    const nftCollection = Keypair.generate().publicKey;

    before(async () => {
      // Derive NFT access control PDA
      [nftAccessControlPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("access"), nftPost.toBuffer()],
        program.programId
      );

      // Create NFT mint (0 decimals, supply of 1)
      nftMint = await createMint(
        provider.connection,
        creator,
        creator.publicKey,
        null,
        0 // NFT has 0 decimals
      );

      // Create user NFT account
      nftTokenAccount = await createAccount(
        provider.connection,
        user,
        nftMint,
        user.publicKey
      );

      // Mint 1 NFT to user
      await mintTo(
        provider.connection,
        creator,
        nftMint,
        nftTokenAccount,
        creator,
        1
      );
    });

    it("sets NFT-based access requirements", async () => {
      await program.methods
        .setAccessRequirements(nftPost, null, new anchor.BN(0), nftCollection)
        .accounts({
          accessControl: nftAccessControlPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const accessControl = await program.account.accessControl.fetch(
        nftAccessControlPda
      );
      assert.deepEqual(accessControl.requiredNftCollection, nftCollection);
      assert.deepEqual(accessControl.gateType, { nft: {} });
    });

    it("verifies NFT access for user holding NFT", async () => {
      const [nftVerificationPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("verification"),
          user.publicKey.toBuffer(),
          nftPost.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .verifyNftAccess()
        .accounts({
          accessControl: nftAccessControlPda,
          verification: nftVerificationPda,
          nftTokenAccount: nftTokenAccount,
          nftMint: nftMint,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const verification = await program.account.accessVerification.fetch(
        nftVerificationPda
      );
      assert.equal(verification.verified, true);
    });

    it("fails to verify NFT access without holding NFT", async () => {
      const noNftUser = Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        noNftUser.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // Create NFT account with 0 NFTs
      const emptyNftAccount = await createAccount(
        provider.connection,
        noNftUser,
        nftMint,
        noNftUser.publicKey
      );

      const [noNftVerificationPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("verification"),
          noNftUser.publicKey.toBuffer(),
          nftPost.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .verifyNftAccess()
          .accounts({
            accessControl: nftAccessControlPda,
            verification: noNftVerificationPda,
            nftTokenAccount: emptyNftAccount,
            nftMint: nftMint,
            user: noNftUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([noNftUser])
          .rpc();
        assert.fail("Should have failed - NFT not owned");
      } catch (e: any) {
        expect(e.message).to.include("NftNotOwned");
      }
    });
  });

  describe("Combined Token + NFT Gate", () => {
    const combinedPost = Keypair.generate().publicKey;

    it("sets combined access requirements", async () => {
      const [combinedAccessControlPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("access"), combinedPost.toBuffer()],
        program.programId
      );

      const nftCollection = Keypair.generate().publicKey;

      await program.methods
        .setAccessRequirements(
          combinedPost,
          tokenMint,
          new anchor.BN(50 * 10 ** 6), // 50 tokens
          nftCollection
        )
        .accounts({
          accessControl: combinedAccessControlPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const accessControl = await program.account.accessControl.fetch(
        combinedAccessControlPda
      );
      assert.deepEqual(accessControl.gateType, { both: {} });
      assert.deepEqual(accessControl.requiredToken, tokenMint);
      assert.deepEqual(accessControl.requiredNftCollection, nftCollection);
    });
  });
});
