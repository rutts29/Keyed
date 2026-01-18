# SolShare Frontend Technical Specification

> **Document Purpose:** Complete technical reference for frontend development  
> **Target:** Frontend Agent / Developer  
> **Last Updated:** January 2026  
> **Backend Status:** Complete and deployed  
> **Solana Programs:** Deployed to devnet

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Environment Configuration](#3-environment-configuration)
4. [API Reference](#4-api-reference)
5. [TypeScript Types & Interfaces](#5-typescript-types--interfaces)
6. [Authentication Flow](#6-authentication-flow)
7. [Solana Integration](#7-solana-integration)
8. [State Management](#8-state-management)
9. [Real-Time Features](#9-real-time-features)
10. [Page & Route Structure](#10-page--route-structure)
11. [Component Requirements](#11-component-requirements)
12. [Design System](#12-design-system)
13. [Error Handling](#13-error-handling)
14. [Performance Considerations](#14-performance-considerations)

---

## 1. Overview

SolShare is an AI-native decentralized social platform built on Solana combining:
- Instagram-like content sharing with wallet-based authentication
- Instant creator monetization (tips, subscriptions) via Solana
- Token-gated exclusive content for NFT/token holders
- AI-powered semantic search and content recommendations
- Decentralized storage (IPFS)

### Key User Flows

| Flow | Description |
|------|-------------|
| **Connect Wallet** | User connects via Dynamic.xyz, backend issues JWT |
| **Create Post** | Upload image → AI moderation → IPFS storage → Solana tx |
| **View Feed** | Personalized AI-ranked feed or chronological following feed |
| **Semantic Search** | Natural language search (e.g., "cozy workspaces") |
| **Tip Creator** | Build tx → Sign with wallet → Submit to Solana |
| **Token-Gated Content** | Verify token/NFT ownership → Access content |

---

## 2. Tech Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | Next.js | 15.x | App Router, Server Components |
| **Language** | TypeScript | 5.5+ | Type safety |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **UI Components** | shadcn/ui | Latest | Component library (already installed) |
| **State Management** | Zustand | 5.x | Global state |
| **Data Fetching** | TanStack Query | 5.x | Server state, caching |
| **Wallet Auth** | Dynamic.xyz | Latest | Multi-wallet connection |
| **Solana** | @solana/web3.js | 1.x | Transaction handling |
| **Real-time** | Supabase Client | Latest | Real-time subscriptions |
| **HTTP Client** | Axios or fetch | - | API calls |

### Existing Setup (Already Configured)

The frontend project already has:
- Next.js 15 with App Router
- Tailwind CSS configured
- shadcn/ui components: `avatar`, `badge`, `button`, `card`, `dropdown-menu`, `input`, `scroll-area`, `separator`, `skeleton`, `tabs`, `textarea`
- Basic layout structure with `(app)` and `(marketing)` route groups
- Mock data structure in `lib/mock-data.ts`

---

## 3. Environment Configuration

Create `.env.local` with these variables:

```bash
# API Endpoints
NEXT_PUBLIC_API_URL=http://localhost:3001/api  # Backend API base URL
NEXT_PUBLIC_WS_URL=ws://localhost:3001         # WebSocket (if needed)

# Supabase (for real-time subscriptions)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Dynamic.xyz (Wallet Authentication)
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your-environment-id

# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet  # devnet | mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Solana Program IDs (deployed on devnet)
NEXT_PUBLIC_SOCIAL_PROGRAM_ID=G2USoTtbNw78NYvPJSeuYVZQS9oVQNLrLE5zJb7wsM3L
NEXT_PUBLIC_PAYMENT_PROGRAM_ID=H5FgabhipaFijiP2HQxtsDd1papEtC9rvvQANsm1fc8t
NEXT_PUBLIC_TOKEN_GATE_PROGRAM_ID=EXVqoivgZKebHm8VeQNBEFYZLRjJ61ZWNieXg3Npy4Hi

# Content CDN
NEXT_PUBLIC_R2_PUBLIC_URL=https://cdn.solshare.app  # IPFS cache CDN
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs
```

---

## 4. API Reference

**Base URL:** `NEXT_PUBLIC_API_URL` (e.g., `http://localhost:3001/api`)

### 4.1 Authentication

#### POST `/auth/challenge`
Get a signing challenge for wallet authentication.

**Request:**
```typescript
{
  wallet: string;  // Solana wallet address (32-44 chars)
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    message: string;     // Message to sign
    expiresAt: number;   // Unix timestamp
  }
}
```

#### POST `/auth/verify`
Verify signed message and get JWT.

**Request:**
```typescript
{
  wallet: string;    // Wallet address
  signature: string; // Base58 encoded signature
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    token: string;      // JWT (7-day expiry)
    user: UserProfile;  // User profile if exists
  }
}
```

#### POST `/auth/refresh`
Refresh JWT token.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  success: true;
  data: {
    token: string;
  }
}
```

---

### 4.2 Users

#### GET `/users/:wallet`
Get user profile.

**Response:**
```typescript
{
  success: true;
  data: {
    wallet: string;
    username: string | null;
    bio: string | null;
    profileImageUri: string | null;
    followerCount: number;
    followingCount: number;
    postCount: number;
    createdAt: string | null;
    isVerified: boolean;
    isFollowing?: boolean;  // Only if authenticated
  }
}
```

#### POST `/users/profile`
Create or update profile. Returns unsigned Solana transaction.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```typescript
{
  username: string;           // 1-32 chars
  bio?: string;               // Max 256 chars
  profileImageUri?: string;   // URL to profile image
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    transaction: string;            // Base64 serialized unsigned tx
    blockhash: string;
    lastValidBlockHeight: number;
  }
}
```

#### GET `/users/:wallet/exists`
Check if profile exists for wallet.

**Response:**
```typescript
{
  success: true;
  data: {
    exists: boolean;
  }
}
```

#### GET `/users/:wallet/posts`
Get user's posts (paginated).

**Query Params:**
- `limit` (default: 20, max: 50)
- `cursor` (optional, for pagination)

**Response:**
```typescript
{
  success: true;
  data: {
    posts: Post[];
    nextCursor: string | null;
  }
}
```

#### GET `/users/:wallet/followers`
Get user's followers (paginated).

#### GET `/users/:wallet/following`
Get users that this user follows (paginated).

#### POST `/users/:wallet/follow`
Follow user. Returns unsigned transaction.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```typescript
{
  success: true;
  data: {
    transaction: string;
    blockhash: string;
    lastValidBlockHeight: number;
  }
}
```

#### DELETE `/users/:wallet/follow`
Unfollow user. Returns unsigned transaction.

---

### 4.3 Posts

#### POST `/posts/upload`
Upload image with AI moderation check. **This blocks if content is unsafe.**

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request (FormData):**
- `file`: Image file (jpeg, png, gif, webp; max 50MB)

**Response (Success):**
```typescript
{
  success: true;
  data: {
    contentUri: string;       // IPFS URI (ipfs://Qm...)
    moderationResult: {
      verdict: 'allow' | 'warn';
      scores: {
        nsfw: number;
        violence: number;
        hate: number;
        childSafety: number;
        spam: number;
        drugsWeapons: number;
      };
      explanation: string;
    }
  }
}
```

**Response (Blocked):**
```typescript
{
  success: false;
  error: {
    code: 'CONTENT_BLOCKED';
    message: string;
    blockedCategory: string;
  }
}
```

#### POST `/posts/create`
Create post on-chain. Returns unsigned transaction.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```typescript
{
  contentUri: string;         // IPFS URI from upload
  contentType: 'image' | 'video' | 'text' | 'multi';
  caption?: string;           // Max 2000 chars
  isTokenGated: boolean;
  requiredToken?: string;     // Token mint address if gated
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    transaction: string;
    blockhash: string;
    lastValidBlockHeight: number;
    metadata: {
      postId: string;
      aiAnalysis?: {
        description: string;
        tags: string[];
        sceneType: string;
        mood: string;
        altText: string;
      }
    }
  }
}
```

#### GET `/posts/:postId`
Get single post.

**Response:**
```typescript
{
  success: true;
  data: {
    id: string;
    creatorWallet: string;
    contentUri: string;
    contentType: string;
    caption: string | null;
    timestamp: string;
    likes: number;
    comments: number;
    tipsReceived: number;     // In lamports
    isTokenGated: boolean;
    requiredToken: string | null;
    llmDescription: string | null;
    autoTags: string[] | null;
    sceneType: string | null;
    mood: string | null;
    altText: string | null;
    creator: UserProfile;
    isLiked?: boolean;        // If authenticated
    hasAccess?: boolean;      // If token-gated
  }
}
```

#### POST `/posts/:postId/like`
Like post. Returns unsigned transaction.

#### DELETE `/posts/:postId/like`
Unlike post. Returns unsigned transaction.

#### GET `/posts/:postId/comments`
Get comments (paginated).

**Response:**
```typescript
{
  success: true;
  data: {
    comments: Comment[];
    nextCursor: string | null;
  }
}
```

#### POST `/posts/:postId/comments`
Add comment. Returns unsigned transaction.

**Request:**
```typescript
{
  text: string;  // 1-500 chars
}
```

#### POST `/posts/:postId/report`
Report post for moderation review.

**Request:**
```typescript
{
  reason: 'nsfw' | 'spam' | 'harassment' | 'other';
  description?: string;  // Max 500 chars
}
```

---

### 4.4 Feed

#### GET `/feed`
Get personalized AI-ranked feed. **Requires authentication.**

**Headers:** `Authorization: Bearer <token>`

**Query Params:**
- `limit` (default: 20, max: 50)
- `cursor` (optional)

**Response:**
```typescript
{
  success: true;
  data: {
    posts: FeedItem[];
    nextCursor: string | null;
  }
}
```

#### GET `/feed/explore`
Get explore/trending feed. Authentication optional.

#### GET `/feed/following`
Get chronological feed from followed users. **Requires authentication.**

#### GET `/feed/trending`
Get trending posts globally.

---

### 4.5 Search

#### POST `/search/semantic`
AI-powered semantic search.

**Request:**
```typescript
{
  query: string;      // Natural language query (1-500 chars)
  limit?: number;     // Default 20, max 50
  rerank?: boolean;   // Default true
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    results: SearchResult[];
    expandedQuery: string;    // AI-expanded query
  }
}
```

```typescript
interface SearchResult {
  postId: string;
  score: number;
  description?: string;
  creatorWallet?: string;
}
```

#### GET `/search/suggest?q=<query>`
Get autocomplete suggestions.

**Response:**
```typescript
{
  success: true;
  data: {
    suggestions: string[];
  }
}
```

#### GET `/search/users?q=<query>`
Search users by username.

#### GET `/search/tag?tag=<tag>`
Search posts by tag.

---

### 4.6 Payments

#### POST `/payments/vault/initialize`
Initialize creator vault. Required before receiving tips.

**Response:** Unsigned transaction

#### GET `/payments/vault`
Get creator's vault info.

**Response:**
```typescript
{
  success: true;
  data: {
    totalEarned: number;      // Lamports
    withdrawn: number;         // Lamports
    subscribers: number;
    availableBalance: number;  // totalEarned - withdrawn
  }
}
```

#### POST `/payments/tip`
Send tip to creator.

**Request:**
```typescript
{
  creatorWallet: string;
  amount: number;       // In lamports
  postId?: string;      // Optional: tip on specific post
}
```

**Response:** Unsigned transaction

#### POST `/payments/subscribe`
Subscribe to creator.

**Request:**
```typescript
{
  creatorWallet: string;
  amountPerMonth: number;  // In lamports
}
```

**Response:** Unsigned transaction

#### DELETE `/payments/subscribe/:creator`
Cancel subscription to creator.

**Response:** Unsigned transaction

#### GET `/payments/earnings`
Get creator's earnings dashboard.

**Response:**
```typescript
{
  success: true;
  data: {
    totalTips: number;
    totalSubscriptions: number;
    subscriberCount: number;
    recentTransactions: Transaction[];
  }
}
```

#### POST `/payments/withdraw`
Withdraw earnings from vault.

**Request:**
```typescript
{
  amount: number;  // In lamports
}
```

**Response:** Unsigned transaction

---

### 4.7 Access Control (Token-Gating)

#### GET `/access/verify?postId=<postId>`
Check if user has access to token-gated post.

**Response:**
```typescript
{
  success: true;
  data: {
    hasAccess: boolean;
    requirements?: {
      requiredToken?: string;
      minimumBalance?: number;
      requiredNftCollection?: string;
    }
  }
}
```

#### POST `/access/requirements`
Set access requirements for a post.

**Request:**
```typescript
{
  postId: string;
  requiredToken?: string;        // Token mint address
  minimumBalance?: number;       // Minimum token balance
  requiredNftCollection?: string; // NFT collection address
}
```

#### POST `/access/verify-token`
Verify token access (creates on-chain verification).

**Request:**
```typescript
{
  postId: string;
}
```

**Response:** Unsigned transaction

#### POST `/access/verify-nft`
Verify NFT access.

**Request:**
```typescript
{
  postId: string;
  nftMint: string;  // NFT mint address user owns
}
```

**Response:** Unsigned transaction

---

## 5. TypeScript Types & Interfaces

Create `src/types/index.ts`:

```typescript
// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ============================================
// User Types
// ============================================

export interface UserProfile {
  wallet: string;
  username: string | null;
  bio: string | null;
  profileImageUri: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: string | null;
  isVerified: boolean;
}

export interface UserWithRelation extends UserProfile {
  isFollowing?: boolean;
}

// ============================================
// Post Types
// ============================================

export type ContentType = 'image' | 'video' | 'text' | 'multi';

export interface Post {
  id: string;
  creatorWallet: string;
  contentUri: string;
  contentType: ContentType;
  caption: string | null;
  timestamp: string;
  likes: number;
  comments: number;
  tipsReceived: number;        // In lamports
  isTokenGated: boolean;
  requiredToken: string | null;
  
  // AI-generated metadata
  llmDescription: string | null;
  autoTags: string[] | null;
  sceneType: string | null;
  mood: string | null;
  safetyScore: number | null;
  altText: string | null;
}

export interface FeedItem extends Post {
  creator: UserProfile;
  isLiked?: boolean;
  isFollowing?: boolean;
  hasAccess?: boolean;        // For token-gated posts
}

export interface Comment {
  id: string;
  postId: string;
  commenterWallet: string;
  text: string;
  timestamp: string;
  commenter?: UserProfile;
}

// ============================================
// Payment Types
// ============================================

export interface CreatorVault {
  totalEarned: number;         // Lamports
  withdrawn: number;           // Lamports
  subscribers: number;
  availableBalance: number;
}

export type TransactionType = 'tip' | 'subscribe' | 'post' | 'follow' | 'like';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  signature: string;
  type: TransactionType;
  fromWallet: string | null;
  toWallet: string | null;
  amount: number | null;       // Lamports
  postId: string | null;
  timestamp: string;
  status: TransactionStatus;
}

// ============================================
// Search Types
// ============================================

export interface SearchResult {
  postId: string;
  score: number;
  description?: string;
  creatorWallet?: string;
}

export interface SemanticSearchResponse {
  results: SearchResult[];
  expandedQuery: string;
}

// ============================================
// AI/Moderation Types
// ============================================

export interface ModerationScores {
  nsfw: number;
  violence: number;
  hate: number;
  childSafety: number;
  spam: number;
  drugsWeapons: number;
}

export type ModerationVerdict = 'allow' | 'warn' | 'block';

export interface ModerationResult {
  verdict: ModerationVerdict;
  scores: ModerationScores;
  maxScore: number;
  blockedCategory?: string;
  explanation: string;
  processingTimeMs: number;
}

export interface AIAnalysis {
  description: string;
  tags: string[];
  sceneType: string;
  objects: string[];
  mood: string;
  colors: string[];
  safetyScore: number;
  altText: string;
}

// ============================================
// Transaction Response (from Backend)
// ============================================

export interface TransactionResponse {
  transaction: string;           // Base64 serialized unsigned tx
  blockhash: string;
  lastValidBlockHeight: number;
  metadata?: {
    postId?: string;
    aiAnalysis?: AIAnalysis;
  };
}

// ============================================
// Pagination Types
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

// ============================================
// Access Control Types
// ============================================

export type GateType = 'token' | 'nft' | 'both';

export interface AccessRequirements {
  requiredToken?: string;
  minimumBalance?: number;
  requiredNftCollection?: string;
  gateType: GateType;
}

export interface AccessVerification {
  hasAccess: boolean;
  requirements?: AccessRequirements;
}

// ============================================
// Auth Types
// ============================================

export interface AuthChallenge {
  message: string;
  expiresAt: number;
}

export interface AuthSession {
  token: string;
  wallet: string;
  user: UserProfile | null;
  expiresAt: number;
}
```

---

## 6. Authentication Flow

### 6.1 Dynamic.xyz Setup

```typescript
// src/lib/dynamic.ts
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';

export const dynamicConfig = {
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
  walletConnectors: [SolanaWalletConnectors],
};
```

### 6.2 Auth Flow Implementation

```typescript
// src/hooks/useAuth.ts
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';

export function useAuth() {
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const { token, setAuth, clearAuth } = useAuthStore();

  const login = async () => {
    if (!primaryWallet) throw new Error('No wallet connected');
    
    // Step 1: Get challenge
    const { data: challenge } = await api.post('/auth/challenge', {
      wallet: primaryWallet.address,
    });
    
    // Step 2: Sign message
    const signature = await primaryWallet.signMessage(challenge.message);
    
    // Step 3: Verify and get JWT
    const { data: auth } = await api.post('/auth/verify', {
      wallet: primaryWallet.address,
      signature,
    });
    
    // Step 4: Store auth state
    setAuth({
      token: auth.token,
      wallet: primaryWallet.address,
      user: auth.user,
    });
  };

  const logout = async () => {
    await handleLogOut();
    clearAuth();
  };

  return {
    isAuthenticated: !!token,
    wallet: primaryWallet?.address,
    login,
    logout,
  };
}
```

### 6.3 API Client with Auth

```typescript
// src/lib/api.ts
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth header interceptor
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export { api };
```

---

## 7. Solana Integration

### 7.1 Transaction Flow Pattern

The backend returns **unsigned transactions**. Frontend must:
1. Receive serialized transaction from API
2. Deserialize the transaction
3. Sign with connected wallet
4. Submit to Solana (or send signed tx back to backend)

```typescript
// src/lib/solana.ts
import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
  'confirmed'
);

export async function signAndSubmitTransaction(
  serializedTx: string,
  wallet: any, // Dynamic wallet instance
): Promise<string> {
  // Deserialize transaction
  const txBuffer = Buffer.from(serializedTx, 'base64');
  const transaction = Transaction.from(txBuffer);
  
  // Sign with wallet
  const signedTx = await wallet.signTransaction(transaction);
  
  // Submit to Solana
  const signature = await connection.sendRawTransaction(
    signedTx.serialize()
  );
  
  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');
  
  return signature;
}

// Helper to convert lamports to SOL
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

// Helper to convert SOL to lamports
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}
```

### 7.2 Example: Tipping a Creator

```typescript
// src/hooks/useTip.ts
import { useMutation } from '@tanstack/react-query';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { api } from '@/lib/api';
import { signAndSubmitTransaction, solToLamports } from '@/lib/solana';

export function useTip() {
  const { primaryWallet } = useDynamicContext();

  return useMutation({
    mutationFn: async ({ 
      creatorWallet, 
      amountInSol, 
      postId 
    }: { 
      creatorWallet: string; 
      amountInSol: number;
      postId?: string;
    }) => {
      // Step 1: Get unsigned transaction from backend
      const { data } = await api.post('/payments/tip', {
        creatorWallet,
        amount: solToLamports(amountInSol),
        postId,
      });

      // Step 2: Sign and submit
      const signature = await signAndSubmitTransaction(
        data.transaction,
        primaryWallet!
      );

      return { signature, amount: amountInSol };
    },
  });
}
```

### 7.3 Program IDs Reference

```typescript
// src/lib/constants.ts
export const PROGRAM_IDS = {
  social: process.env.NEXT_PUBLIC_SOCIAL_PROGRAM_ID!,
  payment: process.env.NEXT_PUBLIC_PAYMENT_PROGRAM_ID!,
  tokenGate: process.env.NEXT_PUBLIC_TOKEN_GATE_PROGRAM_ID!,
};

// G2USoTtbNw78NYvPJSeuYVZQS9oVQNLrLE5zJb7wsM3L - Social
// H5FgabhipaFijiP2HQxtsDd1papEtC9rvvQANsm1fc8t - Payment
// EXVqoivgZKebHm8VeQNBEFYZLRjJ61ZWNieXg3Npy4Hi - Token Gate
```

---

## 8. State Management

### 8.1 Auth Store (Zustand)

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/types';

interface AuthState {
  token: string | null;
  wallet: string | null;
  user: UserProfile | null;
  
  setAuth: (auth: { token: string; wallet: string; user: UserProfile | null }) => void;
  setUser: (user: UserProfile) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      wallet: null,
      user: null,

      setAuth: (auth) => set({ 
        token: auth.token, 
        wallet: auth.wallet, 
        user: auth.user 
      }),
      
      setUser: (user) => set({ user }),
      
      clearAuth: () => set({ token: null, wallet: null, user: null }),
    }),
    {
      name: 'solshare-auth',
    }
  )
);
```

### 8.2 UI Store

```typescript
// src/store/uiStore.ts
import { create } from 'zustand';

interface UIState {
  // Modals
  isCreatePostOpen: boolean;
  isTipModalOpen: boolean;
  tipTarget: { wallet: string; postId?: string } | null;
  
  // Actions
  openCreatePost: () => void;
  closeCreatePost: () => void;
  openTipModal: (wallet: string, postId?: string) => void;
  closeTipModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCreatePostOpen: false,
  isTipModalOpen: false,
  tipTarget: null,

  openCreatePost: () => set({ isCreatePostOpen: true }),
  closeCreatePost: () => set({ isCreatePostOpen: false }),
  openTipModal: (wallet, postId) => set({ 
    isTipModalOpen: true, 
    tipTarget: { wallet, postId } 
  }),
  closeTipModal: () => set({ isTipModalOpen: false, tipTarget: null }),
}));
```

### 8.3 TanStack Query Setup

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

// Query keys factory
export const queryKeys = {
  user: (wallet: string) => ['user', wallet] as const,
  userPosts: (wallet: string) => ['user', wallet, 'posts'] as const,
  post: (postId: string) => ['post', postId] as const,
  feed: (type: 'personalized' | 'explore' | 'following') => ['feed', type] as const,
  search: (query: string) => ['search', query] as const,
  comments: (postId: string) => ['comments', postId] as const,
  vault: () => ['vault'] as const,
  earnings: () => ['earnings'] as const,
};
```

---

## 9. Real-Time Features

### 9.1 Supabase Real-Time Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 9.2 Real-Time Subscriptions

```typescript
// src/hooks/useRealtimeNotifications.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeNotifications() {
  const wallet = useAuthStore((s) => s.wallet);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!wallet) return;

    // Subscribe to new likes on user's posts
    const likesChannel = supabase
      .channel('likes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'likes',
          filter: `post_id=in.(SELECT id FROM posts WHERE creator_wallet='${wallet}')`,
        },
        (payload) => {
          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: ['post', payload.new.post_id] });
          // Show notification (implement toast)
        }
      )
      .subscribe();

    // Subscribe to new followers
    const followsChannel = supabase
      .channel('follows')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follows',
          filter: `following_wallet=eq.${wallet}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['user', wallet] });
          // Show notification
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(followsChannel);
    };
  }, [wallet, queryClient]);
}
```

---

## 10. Page & Route Structure

```
src/app/
├── layout.tsx                    # Root layout (providers, global styles)
├── (marketing)/
│   ├── layout.tsx                # Marketing layout (no sidebar)
│   └── page.tsx                  # Landing page (/)
├── (app)/
│   ├── layout.tsx                # App layout (with sidebar, requires auth)
│   ├── app/
│   │   └── page.tsx              # Main feed (/app)
│   ├── explore/
│   │   └── page.tsx              # Explore feed (/explore)
│   ├── search/
│   │   └── page.tsx              # Search results (/search?q=)
│   ├── create/
│   │   └── page.tsx              # Create post (/create)
│   ├── profile/
│   │   └── [wallet]/
│   │       └── page.tsx          # User profile (/profile/[wallet])
│   ├── post/
│   │   └── [id]/
│   │       └── page.tsx          # Single post (/post/[id])
│   ├── dashboard/
│   │   └── page.tsx              # Creator dashboard (/dashboard)
│   └── settings/
│       └── page.tsx              # User settings (/settings)
```

### Route Descriptions

| Route | Auth Required | Description |
|-------|---------------|-------------|
| `/` | No | Landing/marketing page |
| `/app` | Yes | Personalized feed |
| `/explore` | No | Trending/explore feed |
| `/search` | No | Search results |
| `/create` | Yes | Create new post |
| `/profile/[wallet]` | No | User profile (public) |
| `/post/[id]` | No* | Single post view (*token-gated may require auth) |
| `/dashboard` | Yes | Creator earnings dashboard |
| `/settings` | Yes | User settings |

---

## 11. Component Requirements

### 11.1 Core Components to Build

| Component | Priority | Description |
|-----------|----------|-------------|
| `WalletButton` | P0 | Connect/disconnect wallet (Dynamic.xyz) |
| `PostCard` | P0 | Display post with interactions |
| `PostFeed` | P0 | Infinite scroll feed container |
| `CreatePostModal` | P0 | Image upload + AI preview + publish |
| `ProfileHeader` | P0 | User profile info + follow button |
| `SearchBar` | P0 | Semantic search with suggestions |
| `TipModal` | P0 | Tip amount input + send |
| `CommentSection` | P1 | Post comments + add comment |
| `FollowButton` | P1 | Follow/unfollow with loading |
| `LikeButton` | P1 | Like/unlike with animation |
| `TokenGateBadge` | P1 | Locked content indicator |
| `EarningsDashboard` | P2 | Creator earnings charts |
| `NotificationBell` | P2 | Real-time notifications |
| `SubscribeModal` | P2 | Subscription flow |

### 11.2 PostCard Requirements

```typescript
interface PostCardProps {
  post: FeedItem;
  onLike: () => void;
  onComment: () => void;
  onTip: () => void;
  onShare: () => void;
}
```

**Visual Elements:**
- Creator avatar + username + handle + timestamp
- Post image (from IPFS via CDN)
- Caption text
- AI-generated tags (clickable → search)
- Like count + button
- Comment count + button
- Tip button (opens modal)
- Share button
- Token-gated badge (if applicable)
- "Processing..." badge for new posts

**Interactions:**
- Double-tap to like (mobile)
- Click image to expand
- Click tags to search
- Optimistic updates for like/unlike

### 11.3 CreatePostModal Requirements

**States:**
1. **Upload** - Drag/drop or file select
2. **Moderating** - "Checking content..." (2-3s)
3. **Blocked** - Show error if content blocked
4. **Preview** - Show AI analysis (tags, description)
5. **Posting** - Building tx, waiting for signature
6. **Success** - Show confirmation

**Fields:**
- Image upload (jpeg, png, gif, webp; max 50MB)
- Caption textarea (max 2000 chars)
- Token-gating toggle
- Token mint input (if gated)

### 11.4 SearchBar Requirements

- Debounced input (300ms)
- Autocomplete suggestions dropdown
- Recent searches (localStorage)
- Semantic search hint in placeholder ("Try: cozy workspaces")
- Enter to search, click suggestion to navigate

---

## 12. Design System

### 12.1 Color Palette

```css
:root {
  /* Primary - Solana Gradient */
  --primary-start: #9945FF;
  --primary-end: #14F195;
  
  /* Background */
  --bg-primary: #0A0A0B;
  --bg-secondary: #111113;
  --bg-tertiary: #1A1A1D;
  
  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #A1A1AA;
  --text-muted: #71717A;
  
  /* Borders */
  --border-default: #27272A;
  --border-hover: #3F3F46;
  
  /* Status */
  --success: #22C55E;
  --error: #EF4444;
  --warning: #F59E0B;
}
```

### 12.2 Typography

- **Headings:** Inter or system font stack
- **Body:** Same, different weights
- Font sizes: Use Tailwind defaults (sm, base, lg, xl, etc.)

### 12.3 Spacing

Use Tailwind's spacing scale consistently:
- Padding: `p-2`, `p-4`, `p-6`
- Margins: `m-2`, `m-4`, `m-6`
- Gaps: `gap-2`, `gap-4`, `gap-6`

### 12.4 Components from shadcn/ui

Already installed:
- `Avatar` - User avatars
- `Badge` - Tags, status indicators
- `Button` - All buttons
- `Card` - Post cards, panels
- `DropdownMenu` - User menu, options
- `Input` - Text inputs
- `ScrollArea` - Scrollable containers
- `Separator` - Dividers
- `Skeleton` - Loading states
- `Tabs` - Profile tabs
- `Textarea` - Caption input

**Need to add:**
```bash
npx shadcn@latest add dialog        # Modals
npx shadcn@latest add toast         # Notifications
npx shadcn@latest add tooltip       # Tooltips
npx shadcn@latest add popover       # Dropdowns
npx shadcn@latest add sheet         # Mobile sidebar
npx shadcn@latest add progress      # Upload progress
npx shadcn@latest add switch        # Token-gate toggle
```

---

## 13. Error Handling

### 13.1 API Error Codes

| Code | HTTP Status | Description | User Message |
|------|-------------|-------------|--------------|
| `UNAUTHORIZED` | 401 | Invalid/expired JWT | "Please sign in again" |
| `FORBIDDEN` | 403 | No permission | "You don't have access" |
| `NOT_FOUND` | 404 | Resource not found | "Not found" |
| `VALIDATION_ERROR` | 400 | Invalid input | Show field errors |
| `RATE_LIMITED` | 429 | Too many requests | "Slow down, try again in a minute" |
| `CONTENT_BLOCKED` | 400 | Moderation blocked | "Content violates guidelines" |
| `INSUFFICIENT_FUNDS` | 400 | Not enough SOL | "Insufficient SOL balance" |
| `TRANSACTION_FAILED` | 500 | Solana error | "Transaction failed, please try again" |

### 13.2 Error Handling Hook

```typescript
// src/hooks/useApiError.ts
import { toast } from 'sonner';

const errorMessages: Record<string, string> = {
  UNAUTHORIZED: 'Please sign in again',
  FORBIDDEN: 'You don\'t have access to this resource',
  NOT_FOUND: 'The requested resource was not found',
  VALIDATION_ERROR: 'Please check your input',
  RATE_LIMITED: 'Too many requests. Please wait a moment.',
  CONTENT_BLOCKED: 'This content violates community guidelines',
  INSUFFICIENT_FUNDS: 'Insufficient SOL balance',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
};

export function handleApiError(error: any) {
  const code = error.response?.data?.error?.code || 'UNKNOWN';
  const message = errorMessages[code] || 'Something went wrong';
  
  toast.error(message);
  
  // Special handling for auth errors
  if (code === 'UNAUTHORIZED') {
    // Redirect to login or trigger re-auth
  }
}
```

---

## 14. Performance Considerations

### 14.1 Image Loading

```typescript
// Use Next.js Image with IPFS gateway
import Image from 'next/image';

function PostImage({ contentUri }: { contentUri: string }) {
  // Convert ipfs:// to gateway URL
  const imageUrl = contentUri.startsWith('ipfs://')
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${contentUri.replace('ipfs://', '')}`
    : contentUri;

  return (
    <Image
      src={imageUrl}
      alt=""
      width={600}
      height={600}
      className="w-full h-auto"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD..."
    />
  );
}
```

### 14.2 Infinite Scroll

```typescript
// src/hooks/useInfiniteScroll.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export function useInfiniteFeed(feedType: string) {
  const { ref, inView } = useInView();
  
  const query = useInfiniteQuery({
    queryKey: ['feed', feedType],
    queryFn: ({ pageParam }) => fetchFeed(feedType, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });

  useEffect(() => {
    if (inView && query.hasNextPage) {
      query.fetchNextPage();
    }
  }, [inView, query]);

  return { ...query, loadMoreRef: ref };
}
```

### 14.3 Optimistic Updates

```typescript
// Example: Optimistic like
const likeMutation = useMutation({
  mutationFn: (postId: string) => api.post(`/posts/${postId}/like`),
  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: ['post', postId] });
    
    const previous = queryClient.getQueryData(['post', postId]);
    
    queryClient.setQueryData(['post', postId], (old: any) => ({
      ...old,
      likes: old.likes + 1,
      isLiked: true,
    }));
    
    return { previous };
  },
  onError: (err, postId, context) => {
    queryClient.setQueryData(['post', postId], context?.previous);
  },
});
```

---

## Quick Reference: NPM Packages to Install

```bash
# Core dependencies
npm install @tanstack/react-query zustand axios

# Dynamic.xyz (wallet auth)
npm install @dynamic-labs/sdk-react-core @dynamic-labs/solana

# Solana
npm install @solana/web3.js @solana/spl-token

# Supabase (real-time)
npm install @supabase/supabase-js

# UI enhancements
npm install sonner                  # Toast notifications
npm install react-intersection-observer  # Infinite scroll
npm install framer-motion           # Animations

# Additional shadcn components
npx shadcn@latest add dialog toast tooltip popover sheet progress switch

# Development
npm install -D @types/node
```

---

## Summary: Implementation Order

### Phase 1: Foundation (Start Here)
1. Install dependencies
2. Set up environment variables
3. Configure Dynamic.xyz provider
4. Create auth store and API client
5. Implement auth flow (challenge → sign → verify)

### Phase 2: Core Features
1. Build PostCard and PostFeed components
2. Implement feed pages (home, explore)
3. Add search functionality
4. Create profile page

### Phase 3: Transactions
1. Implement Solana transaction signing
2. Add like/unlike functionality
3. Add follow/unfollow functionality
4. Build create post flow

### Phase 4: Monetization
1. Implement tip modal and flow
2. Build creator dashboard
3. Add subscription flow

### Phase 5: Polish
1. Add real-time notifications
2. Implement token-gating UI
3. Add loading states and error handling
4. Performance optimization

---

**Document Version:** 1.0  
**Backend Compatibility:** v1.0  