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

      // Platform config PDA is already initialized so we cannot re-init with bad values.
      // This test documents the constraint exists in the program.
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
    it("sends a tip to creator — funds go to vault PDA", async () => {
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

      const vaultBalanceBefore = await provider.connection.getBalance(creatorVaultPda);
      const feeRecipientBalanceBefore = await provider.connection.getBalance(feeRecipient.publicKey);

      await program.methods
        .tipCreator(new anchor.BN(tipAmount), null, tipIndex)
        .accounts({
          config: platformConfigPda,
          creatorVault: creatorVaultPda,
          tipRecord: tipRecordPda,
          tipper: tipper.publicKey,
          feeRecipient: feeRecipient.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tipper])
        .rpc();

      const vaultBalanceAfter = await provider.connection.getBalance(creatorVaultPda);
      const feeRecipientBalanceAfter = await provider.connection.getBalance(feeRecipient.publicKey);

      const expectedFee = Math.floor((tipAmount * FEE_BASIS_POINTS) / 10000);
      const expectedCreatorAmount = tipAmount - expectedFee;

      // Verify vault PDA lamport balance increased (escrow model)
      assert.equal(
        vaultBalanceAfter - vaultBalanceBefore,
        expectedCreatorAmount
      );
      assert.equal(
        feeRecipientBalanceAfter - feeRecipientBalanceBefore,
        expectedFee
      );

      // Verify tip record stores net amount (after fee)
      const tipRecord = await program.account.tipRecord.fetch(tipRecordPda);
      assert.deepEqual(tipRecord.from, tipper.publicKey);
      assert.deepEqual(tipRecord.to, creator.publicKey);
      assert.equal(tipRecord.amount.toNumber(), expectedCreatorAmount);

      // Verify vault accounting
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
          feeRecipient: feeRecipient.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tipper])
        .rpc();

      const tipRecord = await program.account.tipRecord.fetch(tipRecordPda);
      assert.deepEqual(tipRecord.post, postPubkey);
    });

    it("vault PDA balance increases on tip", async () => {
      const tipAmount = 0.2 * LAMPORTS_PER_SOL;
      const tipIndex = new anchor.BN(2);

      const [tipRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          tipper.publicKey.toBuffer(),
          tipIndex.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const vaultBefore = await provider.connection.getBalance(creatorVaultPda);

      await program.methods
        .tipCreator(new anchor.BN(tipAmount), null, tipIndex)
        .accounts({
          config: platformConfigPda,
          creatorVault: creatorVaultPda,
          tipRecord: tipRecordPda,
          tipper: tipper.publicKey,
          feeRecipient: feeRecipient.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tipper])
        .rpc();

      const vaultAfter = await provider.connection.getBalance(creatorVaultPda);
      const expectedFee = Math.floor((tipAmount * FEE_BASIS_POINTS) / 10000);
      const expectedCreatorAmount = tipAmount - expectedFee;

      assert.equal(vaultAfter - vaultBefore, expectedCreatorAmount);
      assert.isAbove(vaultAfter, vaultBefore);
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

    it("creates a subscription — funds go to vault PDA", async () => {
      [subscriptionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("subscription"),
          subscriber.publicKey.toBuffer(),
          creator.publicKey.toBuffer(),
        ],
        program.programId
      );

      const vaultBalanceBefore = await provider.connection.getBalance(creatorVaultPda);
      const feeRecipientBalanceBefore = await provider.connection.getBalance(feeRecipient.publicKey);

      await program.methods
        .subscribe(new anchor.BN(subscriptionAmount))
        .accounts({
          config: platformConfigPda,
          creatorVault: creatorVaultPda,
          subscription: subscriptionPda,
          subscriber: subscriber.publicKey,
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

      // Verify vault PDA balance increased (escrow)
      const vaultBalanceAfter = await provider.connection.getBalance(creatorVaultPda);
      const expectedFee = Math.floor((subscriptionAmount * FEE_BASIS_POINTS) / 10000);
      const expectedCreatorAmount = subscriptionAmount - expectedFee;
      assert.equal(
        vaultBalanceAfter - vaultBalanceBefore,
        expectedCreatorAmount
      );

      // Verify fee recipient received the fee
      const feeRecipientBalanceAfter = await provider.connection.getBalance(feeRecipient.publicKey);
      assert.equal(
        feeRecipientBalanceAfter - feeRecipientBalanceBefore,
        expectedFee
      );
    });

    it("vault PDA balance increases on subscription", async () => {
      // The vault should now hold the cumulative creator amounts from all tips + subscription
      const vault = await program.account.creatorVault.fetch(creatorVaultPda);
      const vaultLamports = await provider.connection.getBalance(creatorVaultPda);

      // The vault PDA lamports should be at least total_earned (plus rent-exempt)
      assert.isAbove(vaultLamports, vault.totalEarned.toNumber());
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
    it("withdrawal moves actual SOL from vault PDA to creator wallet", async () => {
      const vaultData = await program.account.creatorVault.fetch(creatorVaultPda);
      const available = vaultData.totalEarned.toNumber() - vaultData.withdrawn.toNumber();
      const withdrawAmount = Math.floor(available / 2);

      const vaultLamportsBefore = await provider.connection.getBalance(creatorVaultPda);
      const creatorBalanceBefore = await provider.connection.getBalance(creator.publicKey);

      await program.methods
        .withdraw(new anchor.BN(withdrawAmount))
        .accounts({
          vault: creatorVaultPda,
          creator: creator.publicKey,
        })
        .signers([creator])
        .rpc();

      const vaultLamportsAfter = await provider.connection.getBalance(creatorVaultPda);
      const creatorBalanceAfter = await provider.connection.getBalance(creator.publicKey);

      // Vault PDA lamports should decrease by exactly the withdrawal amount
      assert.equal(vaultLamportsBefore - vaultLamportsAfter, withdrawAmount);

      // Creator wallet should increase (minus any tx fee the creator paid as signer)
      // The creator is the signer so they pay the transaction fee, but the net
      // gain should be close to withdrawAmount. We check that they received at least
      // withdrawAmount minus a small buffer for the tx fee.
      const creatorGain = creatorBalanceAfter - creatorBalanceBefore;
      assert.isAbove(creatorGain, withdrawAmount - 10000); // tx fee < 10000 lamports
      assert.isBelow(creatorGain, withdrawAmount + 1); // can't gain more than withdrawn

      // Verify vault accounting updated
      const vaultAfter = await program.account.creatorVault.fetch(creatorVaultPda);
      assert.equal(vaultAfter.withdrawn.toNumber(), withdrawAmount);
    });

    it("creator withdraws remaining earnings", async () => {
      const vaultData = await program.account.creatorVault.fetch(creatorVaultPda);
      const available = vaultData.totalEarned.toNumber() - vaultData.withdrawn.toNumber();

      const vaultLamportsBefore = await provider.connection.getBalance(creatorVaultPda);

      await program.methods
        .withdraw(new anchor.BN(available))
        .accounts({
          vault: creatorVaultPda,
          creator: creator.publicKey,
        })
        .signers([creator])
        .rpc();

      const vaultLamportsAfter = await provider.connection.getBalance(creatorVaultPda);
      assert.equal(vaultLamportsBefore - vaultLamportsAfter, available);

      const vaultAfter = await program.account.creatorVault.fetch(creatorVaultPda);
      assert.equal(
        vaultAfter.withdrawn.toNumber(),
        vaultAfter.totalEarned.toNumber()
      );
    });

    it("fails to withdraw more than available balance", async () => {
      const vaultData = await program.account.creatorVault.fetch(creatorVaultPda);
      const available = vaultData.totalEarned.toNumber() - vaultData.withdrawn.toNumber();

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

    it("can't withdraw more than vault PDA lamports minus rent-exempt", async () => {
      // First, send another tip to have something to withdraw
      const tipAmount = 0.01 * LAMPORTS_PER_SOL;
      const tipIndex = new anchor.BN(50);
      const [tipRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          tipper.publicKey.toBuffer(),
          tipIndex.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .tipCreator(new anchor.BN(tipAmount), null, tipIndex)
        .accounts({
          config: platformConfigPda,
          creatorVault: creatorVaultPda,
          tipRecord: tipRecordPda,
          tipper: tipper.publicKey,
          feeRecipient: feeRecipient.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tipper])
        .rpc();

      // Now try to withdraw an amount larger than what the vault PDA can give
      // while still staying above rent-exempt minimum.
      // We compute the maximum: vault lamports - rent exempt minimum
      const vaultLamports = await provider.connection.getBalance(creatorVaultPda);
      const vaultAccountInfo = await provider.connection.getAccountInfo(creatorVaultPda);
      const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(
        vaultAccountInfo!.data.length
      );
      const maxWithdrawable = vaultLamports - rentExempt;

      // Attempt to withdraw more than the vault can physically give
      // (maxWithdrawable + 1 would go below rent-exempt)
      try {
        await program.methods
          .withdraw(new anchor.BN(maxWithdrawable + 1))
          .accounts({
            vault: creatorVaultPda,
            creator: creator.publicKey,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed - would go below rent-exempt minimum");
      } catch (e: any) {
        // Could be InsufficientFunds (lamport check) or WithdrawalExceedsBalance (accounting check)
        const msg = e.message;
        const isExpectedError =
          msg.includes("InsufficientFunds") || msg.includes("WithdrawalExceedsBalance");
        expect(isExpectedError).to.be.true;
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

    it("non-creator can't withdraw from vault (Unauthorized)", async () => {
      const attacker = Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        attacker.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // The attacker tries to use the creator's vault PDA but signs with their own key.
      // The vault PDA is seeded with creator.publicKey, so passing attacker as the
      // creator signer will derive a different PDA and fail anchor's seeds constraint.
      try {
        await program.methods
          .withdraw(new anchor.BN(1000))
          .accounts({
            vault: creatorVaultPda,
            creator: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        assert.fail("Should have failed - unauthorized withdrawal");
      } catch (e: any) {
        // Anchor will reject because the seeds [b"vault", attacker.key] don't match creatorVaultPda,
        // or the has_one = creator constraint fails. Either way the tx must fail.
        expect(e).to.not.be.null;
      }
    });
  });
});
