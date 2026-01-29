---
name: frontend_parallel_development
overview: Phase-wise frontend development plan based on the current technical spec, optimized for two agents working in parallel across full feature scope.
todos:
  - id: setup-foundation
    content: Set up env, providers, auth, API client base
    status: pending
  - id: types-state
    content: Implement shared types, stores, query keys
    status: pending
  - id: core-pages
    content: Build routing + page shells per spec
    status: pending
  - id: post-feed-search
    content: Implement PostCard, feed, search UX
    status: pending
  - id: create-post
    content: Build upload/moderation/create post flow
    status: pending
  - id: social-transactions
    content: Likes/comments/follows + Solana tx utils
    status: pending
  - id: monetization
    content: Tips/subscriptions + earnings dashboard
    status: pending
  - id: privacy-features
    content: Privacy UI, hooks, settings, tip toggle
    status: pending
  - id: realtime-token-gate
    content: Realtime notifications + token gating UX
    status: pending
  - id: polish-qa
    content: Error handling, loading states, QA passes
    status: pending
---

# Frontend Development Plan (Parallel, Full Spec)

## References

- Primary spec: [docs/FRONTEND_TECHNICAL_SPEC.md](docs/FRONTEND_TECHNICAL_SPEC.md)
- Backend privacy endpoints: [backend/src/routes/privacy.routes.ts](backend/src/routes/privacy.routes.ts)

## Workstream Split (2 Agents)

- AgentA: app shell, auth, API client, routing, feed/search/profile/post pages, token gating, realtime
- AgentB: core components, create-post flow, interactions, monetization, privacy UI + hooks

## Phase 0 — Repository Setup and Shared Foundations

- AgentA: verify env setup and add provider scaffolding in [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx) and [frontend/src/lib/queryClient.ts](frontend/src/lib/queryClient.ts)
- AgentA: implement auth flow and API client in [frontend/src/hooks/useAuth.ts](frontend/src/hooks/useAuth.ts) and [frontend/src/lib/api.ts](frontend/src/lib/api.ts)
- AgentB: align design system and shadcn component usage from spec; establish base UI atoms in [frontend/src/components](frontend/src/components)

## Phase 1 — Types, State, and Data Layer

- AgentA: define shared types in [frontend/src/types/index.ts](frontend/src/types/index.ts) and query keys in [frontend/src/lib/queryClient.ts](frontend/src/lib/queryClient.ts)
- AgentA: set up stores [frontend/src/store/authStore.ts](frontend/src/store/authStore.ts) and [frontend/src/store/uiStore.ts](frontend/src/store/uiStore.ts)
- AgentB: add privacy store [frontend/src/store/privacyStore.ts](frontend/src/store/privacyStore.ts) and privacy hooks in [frontend/src/hooks/usePrivacy.ts](frontend/src/hooks/usePrivacy.ts)

## Phase 2 — Core Pages and Navigation

- AgentA: build routes from spec in [frontend/src/app](frontend/src/app) including feed, explore, search, profile, post, dashboard, settings
- AgentA: implement feed queries and pagination hooks using [frontend/src/lib/queryClient.ts](frontend/src/lib/queryClient.ts)
- AgentB: implement reusable UI shells for pages (layout sections, sidebars, empty states)

## Phase 3 — Posts, Feed, and Search UX

- AgentB: implement `PostCard`, `PostFeed`, `CommentSection` in [frontend/src/components](frontend/src/components)
- AgentA: connect feeds and search endpoints in [frontend/src/lib/api.ts](frontend/src/lib/api.ts) and search pages
- AgentA: implement token-gated content checks using `/access/*` endpoints in [frontend/src/app/post/[id]](frontend/src/app/post/[id])

## Phase 4 — Create Post Flow and Moderation

- AgentB: build `CreatePostModal` and upload flow (multipart upload + moderation + create post) based on API spec
- AgentB: implement AI preview UI from metadata (tags, description, alt text)
- AgentA: integrate create flow entry points in [frontend/src/app/create](frontend/src/app/create)

## Phase 5 — Social Interactions and Transactions

- AgentB: implement like, comment, follow hooks and optimistic updates
- AgentA: wire profile and post pages to show counts, relationships, and interaction state
- AgentB: implement Solana transaction signing utilities in [frontend/src/lib/solana.ts](frontend/src/lib/solana.ts) and reuse in flows

## Phase 6 — Monetization (Public)

- AgentB: build `TipModal` and `SubscribeModal` using `/payments/*` endpoints
- AgentA: build `EarningsDashboard` in [frontend/src/app/dashboard](frontend/src/app/dashboard)
- AgentB: implement tip/subscribe mutations and update UI states

## Phase 7 — Privacy Features (Hackathon Scope)

- AgentB: add privacy UI components `PrivacyBalance`, `ShieldModal`, privacy toggle in `TipModal`
- AgentB: implement privacy hooks for `/privacy/*` endpoints and balance checks
- AgentA: add privacy settings and private tips views in [frontend/src/app/settings](frontend/src/app/settings) and dashboard

## Phase 8 — Real-Time and Token-Gated Enhancements

- AgentA: implement Supabase realtime listeners in [frontend/src/hooks/useRealtimeNotifications.ts](frontend/src/hooks/useRealtimeNotifications.ts)
- AgentB: integrate realtime signals into UI notifications and update query invalidation
- AgentA: refine token-gated post UX (locked state, verification flow)

## Phase 9 — Polish, Error Handling, and QA

- AgentA: standardize error handling via [frontend/src/hooks/useApiError.ts](frontend/src/hooks/useApiError.ts)
- AgentB: add loading skeletons, empty states, and accessibility polish
- Both: run manual QA for core flows (auth, feed, create, tip, privacy), document gaps and fixes

## Integration Checkpoints

- End of Phase 1: merge types/stores/hooks to avoid divergence
- End of Phase 4: merge post/interaction components and feed pages
- End of Phase 7: merge privacy features and dashboard changes

## Deliverables

- Fully working frontend matching the spec, including Privacy Cash UI flows and token-gated access
- Updated environment documentation and minimal run instructions for local dev