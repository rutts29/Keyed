import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolshareSocial } from "../target/types/solshare_social";
import { assert, expect } from "chai";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("solshare-social", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolshareSocial as Program<SolshareSocial>;
  
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();

  let user1ProfilePda: PublicKey;
  let user2ProfilePda: PublicKey;
  let postPda: PublicKey;
  let likePda: PublicKey;
  let followPda: PublicKey;
  let commentPda: PublicKey;

  before(async () => {
    // Airdrop SOL to test users
    const airdropSig1 = await provider.connection.requestAirdrop(
      user1.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig1);

    const airdropSig2 = await provider.connection.requestAirdrop(
      user2.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig2);

    // Derive PDAs
    [user1ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );

    [user2ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user2.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("Profile Management", () => {
    it("creates a user profile", async () => {
      await program.methods
        .createProfile("alice", "Hello, I'm Alice!", "ipfs://avatar1")
        .accounts({
          profile: user1ProfilePda,
          authority: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const profile = await program.account.userProfile.fetch(user1ProfilePda);
      assert.equal(profile.username, "alice");
      assert.equal(profile.bio, "Hello, I'm Alice!");
      assert.equal(profile.profileImageUri, "ipfs://avatar1");
      assert.equal(profile.followerCount.toNumber(), 0);
      assert.equal(profile.followingCount.toNumber(), 0);
      assert.equal(profile.postCount.toNumber(), 0);
    });

    it("creates a second user profile", async () => {
      await program.methods
        .createProfile("bob", "I'm Bob!", "ipfs://avatar2")
        .accounts({
          profile: user2ProfilePda,
          authority: user2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const profile = await program.account.userProfile.fetch(user2ProfilePda);
      assert.equal(profile.username, "bob");
    });

    it("updates a user profile", async () => {
      await program.methods
        .updateProfile("Updated bio!", "ipfs://new-avatar")
        .accounts({
          profile: user1ProfilePda,
          authority: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      const profile = await program.account.userProfile.fetch(user1ProfilePda);
      assert.equal(profile.bio, "Updated bio!");
      assert.equal(profile.profileImageUri, "ipfs://new-avatar");
    });

    it("fails to create profile with empty username", async () => {
      const tempUser = Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        tempUser.publicKey,
        LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      const [tempProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), tempUser.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createProfile("", "Bio", "ipfs://avatar")
          .accounts({
            profile: tempProfilePda,
            authority: tempUser.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([tempUser])
          .rpc();
        assert.fail("Should have failed with empty username");
      } catch (e: any) {
        expect(e.message).to.include("UsernameEmpty");
      }
    });
  });

  describe("Post Management", () => {
    it("creates a post", async () => {
      const postCount = 0;
      [postPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("post"),
          user1.publicKey.toBuffer(),
          new anchor.BN(postCount).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .createPost(
          "ipfs://content1",
          { image: {} },
          "My first post!",
          false,
          null
        )
        .accounts({
          post: postPda,
          profile: user1ProfilePda,
          authority: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const post = await program.account.post.fetch(postPda);
      assert.equal(post.contentUri, "ipfs://content1");
      assert.equal(post.caption, "My first post!");
      assert.equal(post.likes.toNumber(), 0);
      assert.equal(post.comments.toNumber(), 0);
      assert.equal(post.isTokenGated, false);

      const profile = await program.account.userProfile.fetch(user1ProfilePda);
      assert.equal(profile.postCount.toNumber(), 1);
    });

    it("creates a token-gated post", async () => {
      const postCount = 1;
      const [tokenGatedPostPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("post"),
          user1.publicKey.toBuffer(),
          new anchor.BN(postCount).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const tokenMint = Keypair.generate().publicKey;

      await program.methods
        .createPost(
          "ipfs://exclusive-content",
          { image: {} },
          "Exclusive content for token holders!",
          true,
          tokenMint
        )
        .accounts({
          post: tokenGatedPostPda,
          profile: user1ProfilePda,
          authority: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const post = await program.account.post.fetch(tokenGatedPostPda);
      assert.equal(post.isTokenGated, true);
      assert.deepEqual(post.requiredToken, tokenMint);
    });
  });

  describe("Social Interactions - Likes", () => {
    it("user2 likes user1's post", async () => {
      [likePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), postPda.toBuffer(), user2.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .likePost()
        .accounts({
          post: postPda,
          like: likePda,
          user: user2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const post = await program.account.post.fetch(postPda);
      assert.equal(post.likes.toNumber(), 1);

      const like = await program.account.like.fetch(likePda);
      assert.deepEqual(like.user, user2.publicKey);
      assert.deepEqual(like.post, postPda);
    });

    it("fails when user tries to like own post", async () => {
      const [selfLikePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), postPda.toBuffer(), user1.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .likePost()
          .accounts({
            post: postPda,
            like: selfLikePda,
            user: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have failed - cannot like own post");
      } catch (e: any) {
        expect(e.message).to.include("CannotLikeOwnPost");
      }
    });

    it("user2 unlikes user1's post", async () => {
      await program.methods
        .unlikePost()
        .accounts({
          post: postPda,
          like: likePda,
          user: user2.publicKey,
        })
        .signers([user2])
        .rpc();

      const post = await program.account.post.fetch(postPda);
      assert.equal(post.likes.toNumber(), 0);

      // Like account should be closed
      try {
        await program.account.like.fetch(likePda);
        assert.fail("Like account should be closed");
      } catch (e: any) {
        expect(e.message).to.include("Account does not exist");
      }
    });
  });

  describe("Social Interactions - Follows", () => {
    it("user2 follows user1", async () => {
      [followPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("follow"),
          user2.publicKey.toBuffer(),
          user1.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .followUser()
        .accounts({
          follow: followPda,
          followerProfile: user2ProfilePda,
          followingProfile: user1ProfilePda,
          follower: user2.publicKey,
          authority: user2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const follow = await program.account.follow.fetch(followPda);
      assert.deepEqual(follow.follower, user2.publicKey);
      assert.deepEqual(follow.following, user1.publicKey);

      const user1Profile = await program.account.userProfile.fetch(user1ProfilePda);
      assert.equal(user1Profile.followerCount.toNumber(), 1);

      const user2Profile = await program.account.userProfile.fetch(user2ProfilePda);
      assert.equal(user2Profile.followingCount.toNumber(), 1);
    });

    it("fails when user tries to follow themselves", async () => {
      const [selfFollowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("follow"),
          user1.publicKey.toBuffer(),
          user1.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .followUser()
          .accounts({
            follow: selfFollowPda,
            followerProfile: user1ProfilePda,
            followingProfile: user1ProfilePda,
            follower: user1.publicKey,
            authority: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have failed - cannot follow self");
      } catch (e: any) {
        expect(e.message).to.include("CannotFollowSelf");
      }
    });

    it("user2 unfollows user1", async () => {
      await program.methods
        .unfollowUser()
        .accounts({
          follow: followPda,
          followerProfile: user2ProfilePda,
          followingProfile: user1ProfilePda,
          follower: user2.publicKey,
          authority: user2.publicKey,
        })
        .signers([user2])
        .rpc();

      const user1Profile = await program.account.userProfile.fetch(user1ProfilePda);
      assert.equal(user1Profile.followerCount.toNumber(), 0);

      const user2Profile = await program.account.userProfile.fetch(user2ProfilePda);
      assert.equal(user2Profile.followingCount.toNumber(), 0);
    });
  });

  describe("Social Interactions - Comments", () => {
    it("user2 comments on user1's post", async () => {
      const commentCount = 0;
      [commentPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("comment"),
          postPda.toBuffer(),
          new anchor.BN(commentCount).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .commentPost("Great post!")
        .accounts({
          post: postPda,
          comment: commentPda,
          commenter: user2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const comment = await program.account.comment.fetch(commentPda);
      assert.equal(comment.text, "Great post!");
      assert.deepEqual(comment.commenter, user2.publicKey);
      assert.deepEqual(comment.post, postPda);

      const post = await program.account.post.fetch(postPda);
      assert.equal(post.comments.toNumber(), 1);
    });

    it("fails with comment too long", async () => {
      const commentCount = 1;
      const [longCommentPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("comment"),
          postPda.toBuffer(),
          new anchor.BN(commentCount).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const longComment = "a".repeat(501);

      try {
        await program.methods
          .commentPost(longComment)
          .accounts({
            post: postPda,
            comment: longCommentPda,
            commenter: user2.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user2])
          .rpc();
        assert.fail("Should have failed - comment too long");
      } catch (e: any) {
        expect(e.message).to.include("CommentTooLong");
      }
    });
  });
});
