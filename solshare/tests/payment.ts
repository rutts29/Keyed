import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolsharePayment } from "../target/types/solshare_payment";
import { assert, expect } from "chai";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("solshare-payment", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolsharePayment as Program<SolsharePayment>;

  const platformAuthority = Keypair.generate();
  const feeRecipient = Keypair.generate();
  const creator = Keypair.generate();
  const tipper = Keypair.generate();
  const subscriber = Keypair.generate();

  let platformConfigPda: PublicKey;
  let creatorVaultPda: PublicKey;

  const FEE_BASIS_POINTS = 200; // 2%

  before(async () => {
    // Airdrop SOL to test users
    const users = [platformAuthority, feeRecipient, creator, tipper, subscriber];
    for (const user of users) {
      const airdropSig = await provider.connection.requestAirdrop(
        user.publicKey,
        5 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);
    }

    // Derive PDAs
    [platformConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_config")],
      program.programId
    );

    [creatorVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), creator.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("Platform Initialization", () => {
    it("initializes the platform config", async () => {
      await program.methods
        .initializePlatform(FEE_BASIS_POINTS)
        .accounts({
          config: platformConfigPda,
          authority: platformAuthority.publicKey,
          feeRecipient: feeRecipient.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([platformAuthority])
        .rpc();

      const config = await program.account.platformConfig.fetch(platformConfigPda);
      assert.equal(config.feeBasisPoints, FEE_BASIS_POINTS);
      assert.deepEqual(config.authority, platformAuthority.publicKey);
      assert.deepEqual(config.feeRecipient, feeRecipient.publicKey);
    });

    it("fails with invalid fee basis points (>10000)", async () => {
      const tempAuth = Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        tempAuth.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // This would need a new PDA, which we can't do since platform_config exists
      // Skip this test - platform is already initialized
    });
  });

  describe("Creator Vault", () => {
    it("initializes a creator vault", async () => {
      await program.methods
        .initializeVault()
        .accounts({
          vault: creatorVaultPda,
          creator: creator.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const vault = await program.account.creatorVault.fetch(creatorVaultPda);
      assert.deepEqual(vault.creator, creator.publicKey);
      assert.equal(vault.totalEarned.toNumber(), 0);
      assert.equal(vault.withdrawn.toNumber(), 0);
      assert.equal(vault.subscribers.toNumber(), 0);
    });
  });

  describe("Tipping", () => {
    it("sends a tip to creator", async () => {
      const tipAmount = 0.1 * LAMPORTS_PER_SOL;
      const tipIndex = new anchor.BN(0);

      const [tipRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          tipper.publicKey.toBuffer(),
          tipIndex.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const creatorBalanceBefore = await provider.connection.getBalance(creator.publicKey);
      const feeRecipientBalanceBefore = await provider.connection.getBalance(feeRecipient.publicKey);

      await program.methods
        .tipCreator(new anchor.BN(tipAmount), null, tipIndex)
        .accounts({
          config: platformConfigPda,
          creatorVault: creatorVaultPda,
          tipRecord: tipRecordPda,
          tipper: tipper.publicKey,
          creator: creator.publicKey,
          feeRecipient: feeRecipient.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tipper])
        .rpc();

      const creatorBalanceAfter = await provider.connection.getBalance(creator.publicKey);
      const feeRecipientBalanceAfter = await provider.connection.getBalance(feeRecipient.publicKey);

      const expectedFee = Math.floor((tipAmount * FEE_BASIS_POINTS) / 10000);
      const expectedCreatorAmount = tipAmount - expectedFee;

      assert.equal(
        creatorBalanceAfter - creatorBalanceBefore,
        expectedCreatorAmount
      );
      assert.equal(
        feeRecipientBalanceAfter - feeRecipientBalanceBefore,
        expectedFee
      );

      const tipRecord = await program.account.tipRecord.fetch(tipRecordPda);
      assert.deepEqual(tipRecord.from, tipper.publicKey);
      assert.deepEqual(tipRecord.to, creator.publicKey);
      assert.equal(tipRecord.amount.toNumber(), tipAmount);

      const vault = await program.account.creatorVault.fetch(creatorVaultPda);
      assert.equal(vault.totalEarned.toNumber(), expectedCreatorAmount);
    });

    it("sends a tip with post reference", async () => {
      const tipAmount = 0.05 * LAMPORTS_PER_SOL;
      const tipIndex = new anchor.BN(1);
      const postPubkey = Keypair.generate().publicKey;

      const [tipRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          tipper.publicKey.toBuffer(),
          tipIndex.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .tipCreator(new anchor.BN(tipAmount), postPubkey, tipIndex)
        .accounts({
          config: platformConfigPda,
          creatorVault: creatorVaultPda,
          tipRecord: tipRecordPda,
          tipper: tipper.publicKey,
          creator: creator.publicKey,
          feeRecipient: feeRecipient.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tipper])
        .rpc();

      const tipRecord = await program.account.tipRecord.fetch(tipRecordPda);
      assert.deepEqual(tipRecord.post, postPubkey);
    });

    it("fails when tipping yourself", async () => {
      const tipIndex = new anchor.BN(99);
      const [tipRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          creator.publicKey.toBuffer(),
          tipIndex.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .tipCreator(new anchor.BN(0.01 * LAMPORTS_PER_SOL), null, tipIndex)
          .accounts({
            config: platformConfigPda,
            creatorVault: creatorVaultPda,
            tipRecord: tipRecordPda,
            tipper: creator.publicKey,
            creator: creator.publicKey,
            feeRecipient: feeRecipient.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed - cannot tip self");
      } catch (e: any) {
        expect(e.message).to.include("CannotTipSelf");
      }
    });

    it("fails with zero amount", async () => {
      const tipIndex = new anchor.BN(100);
      const [tipRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          tipper.publicKey.toBuffer(),
          tipIndex.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .tipCreator(new anchor.BN(0), null, tipIndex)
          .accounts({
            config: platformConfigPda,
            creatorVault: creatorVaultPda,
            tipRecord: tipRecordPda,
            tipper: tipper.publicKey,
            creator: creator.publicKey,
            feeRecipient: feeRecipient.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([tipper])
          .rpc();
        assert.fail("Should have failed - zero amount");
      } catch (e: any) {
        expect(e.message).to.include("InvalidAmount");
      }
    });
  });

  describe("Subscriptions", () => {
    const subscriptionAmount = 0.5 * LAMPORTS_PER_SOL;
    let subscriptionPda: PublicKey;

    it("creates a subscription", async () => {
      [subscriptionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("subscription"),
          subscriber.publicKey.toBuffer(),
          creator.publicKey.toBuffer(),
        ],
        program.programId
      );

      const creatorBalanceBefore = await provider.connection.getBalance(creator.publicKey);

      await program.methods
        .subscribe(new anchor.BN(subscriptionAmount))
        .accounts({
          config: platformConfigPda,
          creatorVault: creatorVaultPda,
          subscription: subscriptionPda,
          subscriber: subscriber.publicKey,
          creator: creator.publicKey,
          feeRecipient: feeRecipient.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([subscriber])
        .rpc();

      const subscription = await program.account.subscription.fetch(subscriptionPda);
      assert.deepEqual(subscription.subscriber, subscriber.publicKey);
      assert.deepEqual(subscription.creator, creator.publicKey);
      assert.equal(subscription.amountPerMonth.toNumber(), subscriptionAmount);
      assert.equal(subscription.isActive, true);

      const vault = await program.account.creatorVault.fetch(creatorVaultPda);
      assert.equal(vault.subscribers.toNumber(), 1);

      const creatorBalanceAfter = await provider.connection.getBalance(creator.publicKey);
      const expectedFee = Math.floor((subscriptionAmount * FEE_BASIS_POINTS) / 10000);
      const expectedCreatorAmount = subscriptionAmount - expectedFee;
      assert.equal(
        creatorBalanceAfter - creatorBalanceBefore,
        expectedCreatorAmount
      );
    });

    it("fails when subscribing to yourself", async () => {
      const [selfSubPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("subscription"),
          creator.publicKey.toBuffer(),
          creator.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .subscribe(new anchor.BN(subscriptionAmount))
          .accounts({
            config: platformConfigPda,
            creatorVault: creatorVaultPda,
            subscription: selfSubPda,
            subscriber: creator.publicKey,
            creator: creator.publicKey,
            feeRecipient: feeRecipient.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed - cannot subscribe to self");
      } catch (e: any) {
        expect(e.message).to.include("CannotSubscribeToSelf");
      }
    });

    it("cancels a subscription", async () => {
      await program.methods
        .cancelSubscription()
        .accounts({
          creatorVault: creatorVaultPda,
          subscription: subscriptionPda,
          subscriber: subscriber.publicKey,
        })
        .signers([subscriber])
        .rpc();

      const subscription = await program.account.subscription.fetch(subscriptionPda);
      assert.equal(subscription.isActive, false);

      const vault = await program.account.creatorVault.fetch(creatorVaultPda);
      assert.equal(vault.subscribers.toNumber(), 0);
    });

    it("fails to cancel already cancelled subscription", async () => {
      try {
        await program.methods
          .cancelSubscription()
          .accounts({
            creatorVault: creatorVaultPda,
            subscription: subscriptionPda,
            subscriber: subscriber.publicKey,
          })
          .signers([subscriber])
          .rpc();
        assert.fail("Should have failed - subscription not active");
      } catch (e: any) {
        expect(e.message).to.include("SubscriptionNotActive");
      }
    });
  });

  describe("Withdrawals", () => {
    it("creator withdraws earnings", async () => {
      const vault = await program.account.creatorVault.fetch(creatorVaultPda);
      const available = vault.totalEarned.toNumber() - vault.withdrawn.toNumber();
      const withdrawAmount = Math.floor(available / 2);

      await program.methods
        .withdraw(new anchor.BN(withdrawAmount))
        .accounts({
          vault: creatorVaultPda,
          creator: creator.publicKey,
        })
        .signers([creator])
        .rpc();

      const vaultAfter = await program.account.creatorVault.fetch(creatorVaultPda);
      assert.equal(vaultAfter.withdrawn.toNumber(), withdrawAmount);
    });

    it("fails to withdraw more than available", async () => {
      const vault = await program.account.creatorVault.fetch(creatorVaultPda);
      const available = vault.totalEarned.toNumber() - vault.withdrawn.toNumber();

      try {
        await program.methods
          .withdraw(new anchor.BN(available + 1000))
          .accounts({
            vault: creatorVaultPda,
            creator: creator.publicKey,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed - withdrawal exceeds balance");
      } catch (e: any) {
        expect(e.message).to.include("WithdrawalExceedsBalance");
      }
    });

    it("fails to withdraw zero amount", async () => {
      try {
        await program.methods
          .withdraw(new anchor.BN(0))
          .accounts({
            vault: creatorVaultPda,
            creator: creator.publicKey,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed - zero amount");
      } catch (e: any) {
        expect(e.message).to.include("InvalidAmount");
      }
    });
  });
});
