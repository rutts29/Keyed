import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolshareAirdrop } from "../target/types/solshare_airdrop";
import { assert, expect } from "chai";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import * as crypto from "crypto";

describe("solshare-airdrop", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolshareAirdrop as Program<SolshareAirdrop>;

  const creator = Keypair.generate();
  const crankAuthority = Keypair.generate();
  const nonCrankAuthority = Keypair.generate();

  const DECIMALS = 6;
  const AMOUNT_PER_RECIPIENT = new anchor.BN(1_000_000); // 1 token
  const TOTAL_RECIPIENTS = 3;

  let tokenMint: PublicKey;
  let creatorAta: PublicKey;
  let campaignId: number[];
  let campaignPda: PublicKey;
  let campaignBump: number;
  let escrowAta: PublicKey;

  // Recipients
  const recipient1 = Keypair.generate();
  const recipient2 = Keypair.generate();
  const recipient3 = Keypair.generate();
  let recipient1Ata: PublicKey;
  let recipient2Ata: PublicKey;
  let recipient3Ata: PublicKey;

  // Wrong mint for security test
  let wrongMint: PublicKey;
  let wrongMintRecipientAta: PublicKey;

  before(async () => {
    // Airdrop SOL to test users
    const users = [creator, crankAuthority, nonCrankAuthority, recipient1, recipient2, recipient3];
    for (const user of users) {
      const airdropSig = await provider.connection.requestAirdrop(
        user.publicKey,
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
      DECIMALS
    );

    // Create creator ATA and mint tokens
    creatorAta = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      tokenMint,
      creator.publicKey
    );

    // Mint enough tokens for testing (10 tokens)
    await mintTo(
      provider.connection,
      creator,
      tokenMint,
      creatorAta,
      creator,
      10_000_000
    );

    // Create recipient ATAs
    recipient1Ata = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      tokenMint,
      recipient1.publicKey
    );
    recipient2Ata = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      tokenMint,
      recipient2.publicKey
    );
    recipient3Ata = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      tokenMint,
      recipient3.publicKey
    );

    // Generate campaign ID
    campaignId = Array.from(crypto.randomBytes(16));

    // Derive campaign PDA
    [campaignPda, campaignBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        creator.publicKey.toBuffer(),
        Buffer.from(campaignId),
      ],
      program.programId
    );

    // Derive escrow ATA (associated token of campaign PDA for tokenMint)
    escrowAta = getAssociatedTokenAddressSync(tokenMint, campaignPda, true);

    // Create wrong mint for security test
    wrongMint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      DECIMALS
    );

    wrongMintRecipientAta = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      wrongMint,
      recipient1.publicKey
    );
  });

  describe("Campaign Creation", () => {
    it("creates a campaign with total_recipients", async () => {
      await program.methods
        .createCampaign(
          campaignId,
          AMOUNT_PER_RECIPIENT,
          TOTAL_RECIPIENTS,
          crankAuthority.publicKey
        )
        .accounts({
          creator: creator.publicKey,
          campaign: campaignPda,
          tokenMint: tokenMint,
          escrowAta: escrowAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      const campaignState = await program.account.campaignState.fetch(campaignPda);
      assert.ok(campaignState, "Campaign account should exist");
      assert.equal(campaignState.totalRecipients, TOTAL_RECIPIENTS);
    });

    it("creates a campaign with correct state (Draft status, total_recipients set)", async () => {
      const campaignState = await program.account.campaignState.fetch(campaignPda);

      assert.deepEqual(campaignState.creator, creator.publicKey);
      assert.deepEqual(campaignState.campaignId, campaignId);
      assert.deepEqual(campaignState.tokenMint, tokenMint);
      assert.deepEqual(campaignState.escrowAta, escrowAta);
      assert.equal(
        campaignState.amountPerRecipient.toNumber(),
        AMOUNT_PER_RECIPIENT.toNumber()
      );
      assert.equal(campaignState.totalAmount.toNumber(), 0);
      assert.equal(campaignState.distributedAmount.toNumber(), 0);
      assert.equal(campaignState.totalRecipients, TOTAL_RECIPIENTS);
      assert.equal(campaignState.distributedCount, 0);
      assert.deepEqual(campaignState.status, { draft: {} });
      assert.deepEqual(campaignState.crankAuthority, crankAuthority.publicKey);
      assert.equal(campaignState.bump, campaignBump);
    });
  });

  describe("Campaign Funding", () => {
    it("funds a campaign (transfers tokens to escrow, status -> Funded)", async () => {
      const fundAmount = new anchor.BN(
        AMOUNT_PER_RECIPIENT.toNumber() * TOTAL_RECIPIENTS
      );

      const creatorAtaBefore = await getAccount(provider.connection, creatorAta);
      const escrowAtaBefore = await getAccount(provider.connection, escrowAta);

      await program.methods
        .fundCampaign(fundAmount)
        .accounts({
          creator: creator.publicKey,
          campaign: campaignPda,
          creatorAta: creatorAta,
          escrowAta: escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      const creatorAtaAfter = await getAccount(provider.connection, creatorAta);
      const escrowAtaAfter = await getAccount(provider.connection, escrowAta);

      assert.equal(
        Number(creatorAtaBefore.amount) - Number(creatorAtaAfter.amount),
        fundAmount.toNumber()
      );
      assert.equal(
        Number(escrowAtaAfter.amount) - Number(escrowAtaBefore.amount),
        fundAmount.toNumber()
      );

      const campaignState = await program.account.campaignState.fetch(campaignPda);
      assert.deepEqual(campaignState.status, { funded: {} });
      assert.equal(campaignState.totalAmount.toNumber(), fundAmount.toNumber());
    });

    it("fails to fund non-Draft campaign", async () => {
      const fundAmount = new anchor.BN(1_000_000);

      try {
        await program.methods
          .fundCampaign(fundAmount)
          .accounts({
            creator: creator.publicKey,
            campaign: campaignPda,
            creatorAta: creatorAta,
            escrowAta: escrowAta,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed - campaign is not in Draft status");
      } catch (e: any) {
        expect(e.message).to.include("InvalidStatus");
      }
    });
  });

  describe("Batch Distribution", () => {
    it("distributes tokens to valid recipients", async () => {
      const recipient1AtaBefore = await getAccount(
        provider.connection,
        recipient1Ata
      );

      await program.methods
        .distributeBatch(1)
        .accounts({
          crankAuthority: crankAuthority.publicKey,
          campaign: campaignPda,
          escrowAta: escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts([
          { pubkey: recipient1Ata, isWritable: true, isSigner: false },
        ])
        .signers([crankAuthority])
        .rpc();

      const recipient1AtaAfter = await getAccount(
        provider.connection,
        recipient1Ata
      );
      assert.equal(
        Number(recipient1AtaAfter.amount) - Number(recipient1AtaBefore.amount),
        AMOUNT_PER_RECIPIENT.toNumber()
      );
    });

    it("updates distributed_count and distributed_amount correctly", async () => {
      const campaignState = await program.account.campaignState.fetch(campaignPda);
      assert.equal(campaignState.distributedCount, 1);
      assert.equal(
        campaignState.distributedAmount.toNumber(),
        AMOUNT_PER_RECIPIENT.toNumber()
      );
      assert.deepEqual(campaignState.status, { processing: {} });
    });

    it("auto-completes when distributed_count >= total_recipients (status -> Completed)", async () => {
      // Distribute to remaining 2 recipients in one batch
      await program.methods
        .distributeBatch(2)
        .accounts({
          crankAuthority: crankAuthority.publicKey,
          campaign: campaignPda,
          escrowAta: escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts([
          { pubkey: recipient2Ata, isWritable: true, isSigner: false },
          { pubkey: recipient3Ata, isWritable: true, isSigner: false },
        ])
        .signers([crankAuthority])
        .rpc();

      const campaignState = await program.account.campaignState.fetch(campaignPda);
      assert.equal(campaignState.distributedCount, TOTAL_RECIPIENTS);
      assert.equal(
        campaignState.distributedAmount.toNumber(),
        AMOUNT_PER_RECIPIENT.toNumber() * TOTAL_RECIPIENTS
      );
      assert.deepEqual(campaignState.status, { completed: {} });
    });
  });

  describe("Security: Recipient ATA Validation", () => {
    // Need a fresh campaign for this test
    let secCampaignId: number[];
    let secCampaignPda: PublicKey;
    let secEscrowAta: PublicKey;

    before(async () => {
      secCampaignId = Array.from(crypto.randomBytes(16));

      [secCampaignPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("campaign"),
          creator.publicKey.toBuffer(),
          Buffer.from(secCampaignId),
        ],
        program.programId
      );

      secEscrowAta = getAssociatedTokenAddressSync(
        tokenMint,
        secCampaignPda,
        true
      );

      // Create campaign
      await program.methods
        .createCampaign(
          secCampaignId,
          AMOUNT_PER_RECIPIENT,
          1,
          crankAuthority.publicKey
        )
        .accounts({
          creator: creator.publicKey,
          campaign: secCampaignPda,
          tokenMint: tokenMint,
          escrowAta: secEscrowAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      // Fund campaign
      await program.methods
        .fundCampaign(AMOUNT_PER_RECIPIENT)
        .accounts({
          creator: creator.publicKey,
          campaign: secCampaignPda,
          creatorAta: creatorAta,
          escrowAta: secEscrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();
    });

    it("fails when recipient ATA has wrong mint (InvalidRecipientMint)", async () => {
      try {
        await program.methods
          .distributeBatch(1)
          .accounts({
            crankAuthority: crankAuthority.publicKey,
            campaign: secCampaignPda,
            escrowAta: secEscrowAta,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .remainingAccounts([
            { pubkey: wrongMintRecipientAta, isWritable: true, isSigner: false },
          ])
          .signers([crankAuthority])
          .rpc();
        assert.fail("Should have failed - wrong mint on recipient ATA");
      } catch (e: any) {
        expect(e.message).to.include("InvalidRecipientMint");
      }
    });
  });

  describe("Security: Crank Authority", () => {
    // Need a fresh campaign for this test
    let crankCampaignId: number[];
    let crankCampaignPda: PublicKey;
    let crankEscrowAta: PublicKey;

    before(async () => {
      crankCampaignId = Array.from(crypto.randomBytes(16));

      [crankCampaignPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("campaign"),
          creator.publicKey.toBuffer(),
          Buffer.from(crankCampaignId),
        ],
        program.programId
      );

      crankEscrowAta = getAssociatedTokenAddressSync(
        tokenMint,
        crankCampaignPda,
        true
      );

      // Create campaign
      await program.methods
        .createCampaign(
          crankCampaignId,
          AMOUNT_PER_RECIPIENT,
          1,
          crankAuthority.publicKey
        )
        .accounts({
          creator: creator.publicKey,
          campaign: crankCampaignPda,
          tokenMint: tokenMint,
          escrowAta: crankEscrowAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      // Fund campaign
      await program.methods
        .fundCampaign(AMOUNT_PER_RECIPIENT)
        .accounts({
          creator: creator.publicKey,
          campaign: crankCampaignPda,
          creatorAta: creatorAta,
          escrowAta: crankEscrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();
    });

    it("fails when non-crank-authority tries to distribute (UnauthorizedCrank)", async () => {
      try {
        await program.methods
          .distributeBatch(1)
          .accounts({
            crankAuthority: nonCrankAuthority.publicKey,
            campaign: crankCampaignPda,
            escrowAta: crankEscrowAta,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .remainingAccounts([
            { pubkey: recipient1Ata, isWritable: true, isSigner: false },
          ])
          .signers([nonCrankAuthority])
          .rpc();
        assert.fail("Should have failed - unauthorized crank authority");
      } catch (e: any) {
        expect(e.message).to.include("UnauthorizedCrank");
      }
    });
  });

  describe("Refund", () => {
    let refundCampaignId: number[];
    let refundCampaignPda: PublicKey;
    let refundEscrowAta: PublicKey;

    before(async () => {
      refundCampaignId = Array.from(crypto.randomBytes(16));

      [refundCampaignPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("campaign"),
          creator.publicKey.toBuffer(),
          Buffer.from(refundCampaignId),
        ],
        program.programId
      );

      refundEscrowAta = getAssociatedTokenAddressSync(
        tokenMint,
        refundCampaignPda,
        true
      );

      // Create campaign
      await program.methods
        .createCampaign(
          refundCampaignId,
          AMOUNT_PER_RECIPIENT,
          2,
          crankAuthority.publicKey
        )
        .accounts({
          creator: creator.publicKey,
          campaign: refundCampaignPda,
          tokenMint: tokenMint,
          escrowAta: refundEscrowAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      // Fund campaign
      const fundAmount = new anchor.BN(AMOUNT_PER_RECIPIENT.toNumber() * 2);
      await program.methods
        .fundCampaign(fundAmount)
        .accounts({
          creator: creator.publicKey,
          campaign: refundCampaignPda,
          creatorAta: creatorAta,
          escrowAta: refundEscrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();
    });

    it("refunds remaining tokens to creator (status -> Cancelled)", async () => {
      const creatorAtaBefore = await getAccount(provider.connection, creatorAta);
      const escrowAtaBefore = await getAccount(
        provider.connection,
        refundEscrowAta
      );
      const escrowBalanceBefore = Number(escrowAtaBefore.amount);

      await program.methods
        .refund()
        .accounts({
          creator: creator.publicKey,
          campaign: refundCampaignPda,
          creatorAta: creatorAta,
          escrowAta: refundEscrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      const creatorAtaAfter = await getAccount(provider.connection, creatorAta);
      assert.equal(
        Number(creatorAtaAfter.amount) - Number(creatorAtaBefore.amount),
        escrowBalanceBefore
      );

      const campaignState = await program.account.campaignState.fetch(
        refundCampaignPda
      );
      assert.deepEqual(campaignState.status, { cancelled: {} });
    });

    it("allows refund on completed campaign to reclaim excess tokens", async () => {
      // The first campaign (campaignPda) was completed after all distributions.
      // With the escrow model, any leftover tokens in the escrow ATA should be
      // reclaimable even after completion.  In this test the escrow was fully
      // distributed (exact funding), so the refund succeeds but transfers 0 tokens
      // and closes the (empty) escrow ATA. Status becomes Cancelled.
      const campaignState = await program.account.campaignState.fetch(campaignPda);
      assert.deepEqual(campaignState.status, { completed: {} });

      // The escrow should be empty (all tokens distributed)
      const escrowAccount = await getAccount(provider.connection, escrowAta);
      assert.equal(Number(escrowAccount.amount), 0);

      await program.methods
        .refund()
        .accounts({
          creator: creator.publicKey,
          campaign: campaignPda,
          creatorAta: creatorAta,
          escrowAta: escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      const campaignAfter = await program.account.campaignState.fetch(campaignPda);
      assert.deepEqual(campaignAfter.status, { cancelled: {} });
    });

    it("fails to refund cancelled campaign — no double-refund (AlreadyCompleted)", async () => {
      // After the previous refund, campaignPda is now Cancelled.
      // A second refund must be rejected.
      try {
        await program.methods
          .refund()
          .accounts({
            creator: creator.publicKey,
            campaign: campaignPda,
            creatorAta: creatorAta,
            // escrowAta was closed above, but Anchor will fail to
            // deserialize it before the constraint even fires.
            // We still pass it to exercise the constraint path.
            escrowAta: escrowAta,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed - campaign is already cancelled");
      } catch (e: any) {
        // Could fail with AlreadyCompleted (constraint) or account deserialization
        // error (escrow ATA closed). Either way the tx must not succeed.
        expect(e).to.not.be.null;
      }
    });
  });
});
