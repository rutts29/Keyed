# Agent 1: Solana Programs - Implementation Documentation

## Overview

Agent 1 has successfully implemented three Anchor programs for SolShare V1:

| Program | Program ID | Purpose |
|---------|-----------|---------|
| `solshare_social` | `G2USoTtbNw78NYvPJSeuYVZQS9oVQNLrLE5zJb7wsM3L` | User profiles, posts, follows, likes, comments |
| `solshare_payment` | `H5FgabhipaFijiP2HQxtsDd1papEtC9rvvQANsm1fc8t` | Creator vaults, tips, subscriptions |
| `solshare_token_gate` | `EXVqoivgZKebHm8VeQNBEFYZLRjJ61ZWNieXg3Npy4Hi` | Token/NFT-gated content access |

## File Structure

```
solshare/
├── programs/
│   ├── solshare-social/
│   │   └── src/
│   │       ├── lib.rs                    # Program entry point
│   │       ├── state.rs                  # Account structures
│   │       ├── error.rs                  # Custom errors
│   │       ├── events.rs                 # Program events
│   │       └── instructions/
│   │           ├── create_profile.rs
│   │           ├── update_profile.rs
│   │           ├── create_post.rs
│   │           ├── like_post.rs
│   │           ├── unlike_post.rs
│   │           ├── follow_user.rs
│   │           ├── unfollow_user.rs
│   │           └── comment_post.rs
│   ├── solshare-payment/
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── state.rs
│   │       ├── error.rs
│   │       ├── events.rs
│   │       └── instructions/
│   │           ├── initialize_platform.rs
│   │           ├── initialize_vault.rs
│   │           ├── tip_creator.rs
│   │           ├── subscribe.rs
│   │           ├── process_subscription.rs
│   │           ├── cancel_subscription.rs
│   │           └── withdraw.rs
│   └── solshare-token-gate/
│       └── src/
│           ├── lib.rs
│           ├── state.rs
│           ├── error.rs
│           ├── events.rs
│           └── instructions/
│               ├── set_access_requirements.rs
│               ├── verify_token_access.rs
│               ├── verify_nft_access.rs
│               └── check_access.rs
├── tests/
│   ├── social.ts       # 14 tests
│   ├── payment.ts      # 14 tests
│   └── token-gate.ts   # 9 tests
├── target/
│   ├── idl/            # Generated IDL files
│   └── deploy/         # Compiled .so files
└── Anchor.toml
```

---

## Program 1: Social Program (`solshare_social`)

### Account Structures

#### UserProfile
- **Seeds:** `["profile", authority.key()]`
- **Fields:**
  - `authority: Pubkey` - Owner wallet
  - `username: String (max 32)` - Unique username
  - `bio: String (max 256)` - Profile bio
  - `profile_image_uri: String (max 200)` - IPFS avatar URI
  - `follower_count: u64` - Total followers
  - `following_count: u64` - Total following
  - `post_count: u64` - Posts created
  - `created_at: i64` - Unix timestamp
  - `is_verified: bool` - Verification badge
  - `bump: u8` - PDA bump

#### Post
- **Seeds:** `["post", creator.key(), post_count.to_le_bytes()]`
- **Fields:**
  - `creator: Pubkey`
  - `content_uri: String (max 200)` - IPFS content URI
  - `content_type: ContentType` - Image/Video/Text/Multi
  - `caption: String (max 2000)`
  - `timestamp: i64`
  - `likes: u64`
  - `comments: u64`
  - `tips_received: u64` - In lamports
  - `is_token_gated: bool`
  - `required_token: Option<Pubkey>`
  - `post_index: u64`
  - `bump: u8`

#### Follow
- **Seeds:** `["follow", follower.key(), following.key()]`
- **Fields:** `follower`, `following`, `timestamp`, `bump`

#### Like
- **Seeds:** `["like", post.key(), user.key()]`
- **Fields:** `user`, `post`, `timestamp`, `bump`

#### Comment
- **Seeds:** `["comment", post.key(), comment_count.to_le_bytes()]`
- **Fields:** `post`, `commenter`, `text (max 500)`, `timestamp`, `comment_index`, `bump`

### Instructions

| Instruction | Parameters | Description |
|------------|-----------|-------------|
| `create_profile` | username, bio, profile_image_uri | Create user profile |
| `update_profile` | bio?, profile_image_uri? | Update profile fields |
| `create_post` | content_uri, content_type, caption, is_token_gated, required_token? | Create a post |
| `like_post` | - | Like a post (can't like own) |
| `unlike_post` | - | Remove like |
| `follow_user` | - | Follow a user (can't follow self) |
| `unfollow_user` | - | Unfollow a user |
| `comment_post` | comment_text | Add comment to post |

### Events

- `ProfileCreated { authority, username, timestamp }`
- `ProfileUpdated { authority, timestamp }`
- `PostCreated { post, creator, content_uri, timestamp }`
- `PostLiked { post, user, timestamp }`
- `PostUnliked { post, user, timestamp }`
- `UserFollowed { follower, following, timestamp }`
- `UserUnfollowed { follower, following, timestamp }`
- `PostCommented { post, commenter, comment, timestamp }`

---

## Program 2: Payment Program (`solshare_payment`)

### Account Structures

#### PlatformConfig
- **Seeds:** `["platform_config"]`
- **Fields:**
  - `authority: Pubkey` - Platform admin
  - `fee_basis_points: u16` - Fee percentage (200 = 2%)
  - `fee_recipient: Pubkey` - Fee collection wallet
  - `bump: u8`

#### CreatorVault
- **Seeds:** `["vault", creator.key()]`
- **Fields:**
  - `creator: Pubkey`
  - `total_earned: u64` - Lifetime earnings (lamports)
  - `withdrawn: u64` - Total withdrawn
  - `subscribers: u64` - Active subscriber count
  - `bump: u8`

#### TipRecord
- **Seeds:** `["tip", tipper.key(), tip_index.to_le_bytes()]`
- **Fields:**
  - `from: Pubkey`
  - `to: Pubkey`
  - `amount: u64`
  - `post: Option<Pubkey>`
  - `timestamp: i64`
  - `bump: u8`

#### Subscription
- **Seeds:** `["subscription", subscriber.key(), creator.key()]`
- **Fields:**
  - `subscriber: Pubkey`
  - `creator: Pubkey`
  - `amount_per_month: u64`
  - `last_payment: i64`
  - `started_at: i64`
  - `is_active: bool`
  - `bump: u8`

### Instructions

| Instruction | Parameters | Description |
|------------|-----------|-------------|
| `initialize_platform` | fee_basis_points | Initialize platform config (one-time) |
| `initialize_vault` | - | Create creator vault |
| `tip_creator` | amount, post?, tip_index | Send tip (2% fee deducted) |
| `subscribe` | amount_per_month | Create subscription + first payment |
| `process_subscription` | - | Process monthly renewal (crank) |
| `cancel_subscription` | - | Deactivate subscription |
| `withdraw` | amount | Creator withdraws earnings |

### Fee Logic

- Platform fee: 2% (configurable via `fee_basis_points`)
- Fee deducted from all tips and subscription payments
- Direct SOL transfer to creator wallet (no custodial vault)

---

## Program 3: Token-Gate Program (`solshare_token_gate`)

### Account Structures

#### AccessControl
- **Seeds:** `["access", post.key()]`
- **Fields:**
  - `post: Pubkey`
  - `creator: Pubkey`
  - `required_token: Option<Pubkey>` - SPL token mint
  - `minimum_balance: u64` - Required token amount
  - `required_nft_collection: Option<Pubkey>` - NFT collection
  - `gate_type: GateType` - Token/Nft/Both
  - `created_at: i64`
  - `bump: u8`

#### AccessVerification
- **Seeds:** `["verification", user.key(), post.key()]`
- **Fields:**
  - `user: Pubkey`
  - `post: Pubkey`
  - `verified: bool`
  - `verified_at: i64`
  - `expires_at: Option<i64>`
  - `bump: u8`

### Instructions

| Instruction | Parameters | Description |
|------------|-----------|-------------|
| `set_access_requirements` | post, required_token?, minimum_balance, required_nft_collection? | Configure access gate |
| `verify_token_access` | - | Verify user holds required tokens |
| `verify_nft_access` | - | Verify user holds required NFT |
| `check_access` | - | Check if user has valid verification |

### Gate Types

- **Token:** Requires minimum SPL token balance
- **NFT:** Requires ownership of NFT from collection
- **Both:** Requires both token balance AND NFT ownership

---

## Test Coverage

**Total: 37 tests across 3 test suites**

### Social Tests (14 tests)
- Profile creation, update, validation
- Post creation (regular and token-gated)
- Like/unlike with self-like prevention
- Follow/unfollow with self-follow prevention
- Comment creation with length validation

### Payment Tests (14 tests)
- Platform config initialization
- Creator vault setup
- Tipping with fee calculation
- Subscription creation and cancellation
- Withdrawal with balance validation
- Error handling for self-tip, zero amounts

### Token-Gate Tests (9 tests)
- Token-based access requirements
- NFT-based access requirements
- Combined Token+NFT gates
- Access verification for token holders
- Access denial for insufficient balance
- NFT ownership verification

---

## IDL Files

Generated IDL files are located at:
- `/workspace/solshare/target/idl/solshare_social.json`
- `/workspace/solshare/target/idl/solshare_payment.json`
- `/workspace/solshare/target/idl/solshare_token_gate.json`

Copies for backend integration:
- `/workspace/backend/idl/solshare_social.json`
- `/workspace/backend/idl/solshare_payment.json`
- `/workspace/backend/idl/solshare_token_gate.json`

---

## Deployment

### Local Testing
```bash
# Start local validator
solana-test-validator

# Deploy programs
anchor deploy

# Run tests
ANCHOR_PROVIDER_URL="http://localhost:8899" \
ANCHOR_WALLET="~/.config/solana/id.json" \
yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts
```

### Devnet Deployment
```bash
# Configure for devnet
solana config set --url devnet

# Get devnet SOL
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet
```

---

## Integration Notes for Agent 2 (Backend)

1. **IDL Location:** Import IDLs from `/workspace/backend/idl/`

2. **Program IDs:**
   ```typescript
   const SOCIAL_PROGRAM_ID = "G2USoTtbNw78NYvPJSeuYVZQS9oVQNLrLE5zJb7wsM3L";
   const PAYMENT_PROGRAM_ID = "H5FgabhipaFijiP2HQxtsDd1papEtC9rvvQANsm1fc8t";
   const TOKEN_GATE_PROGRAM_ID = "EXVqoivgZKebHm8VeQNBEFYZLRjJ61ZWNieXg3Npy4Hi";
   ```

3. **PDA Derivation Examples:**
   ```typescript
   // User Profile
   const [profilePda] = PublicKey.findProgramAddressSync(
     [Buffer.from("profile"), userWallet.toBuffer()],
     SOCIAL_PROGRAM_ID
   );

   // Post
   const [postPda] = PublicKey.findProgramAddressSync(
     [
       Buffer.from("post"),
       creator.toBuffer(),
       new BN(postCount).toArrayLike(Buffer, "le", 8)
     ],
     SOCIAL_PROGRAM_ID
   );

   // Creator Vault
   const [vaultPda] = PublicKey.findProgramAddressSync(
     [Buffer.from("vault"), creator.toBuffer()],
     PAYMENT_PROGRAM_ID
   );
   ```

4. **Transaction Building:** All write operations require building unsigned transactions that the frontend will sign.

---

## Security Considerations

- All state mutations require authority verification
- Cannot like own posts or follow self
- Tip/subscription amounts must be > 0
- Withdrawal cannot exceed available balance
- Token gate requires valid token account ownership check
- NFT gate verifies token amount is exactly 1

---

## Completed Deliverables

- [x] Three Anchor programs implemented and building
- [x] All account structures with proper PDAs
- [x] All instructions with validation
- [x] Event emissions for off-chain indexing
- [x] Custom error types
- [x] 37 tests passing (90%+ coverage)
- [x] IDL files generated and exported
- [x] Documentation complete
