-- Enable Row Level Security on all public tables
-- Backend uses service_role key which bypasses RLS automatically.
-- These policies are defense-in-depth, protecting against direct
-- client access via the anon key (used by frontend for Realtime).
--
-- JWT claims are expected to contain: { "wallet": "<wallet_address>" }

-- Helper: extract wallet from JWT
CREATE OR REPLACE FUNCTION public.jwt_wallet() RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claims', true)::json ->> 'wallet';
$$ LANGUAGE sql STABLE;


-- ============================================================
-- USERS
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (wallet = public.jwt_wallet());

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (wallet = public.jwt_wallet());


-- ============================================================
-- POSTS
-- ============================================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts"
  ON public.posts FOR SELECT
  USING (true);

CREATE POLICY "Creators can insert own posts"
  ON public.posts FOR INSERT
  WITH CHECK (creator_wallet = public.jwt_wallet());

CREATE POLICY "Creators can update own posts"
  ON public.posts FOR UPDATE
  USING (creator_wallet = public.jwt_wallet());


-- ============================================================
-- FOLLOWS
-- ============================================================
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own follows"
  ON public.follows FOR INSERT
  WITH CHECK (follower_wallet = public.jwt_wallet());

CREATE POLICY "Users can delete own follows"
  ON public.follows FOR DELETE
  USING (follower_wallet = public.jwt_wallet());


-- ============================================================
-- LIKES
-- ============================================================
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own likes"
  ON public.likes FOR INSERT
  WITH CHECK (user_wallet = public.jwt_wallet());

CREATE POLICY "Users can delete own likes"
  ON public.likes FOR DELETE
  USING (user_wallet = public.jwt_wallet());


-- ============================================================
-- COMMENTS
-- ============================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own comments"
  ON public.comments FOR INSERT
  WITH CHECK (commenter_wallet = public.jwt_wallet());

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (commenter_wallet = public.jwt_wallet());


-- ============================================================
-- INTERACTIONS
-- ============================================================
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions"
  ON public.interactions FOR SELECT
  USING (user_wallet = public.jwt_wallet());

CREATE POLICY "Users can insert own interactions"
  ON public.interactions FOR INSERT
  WITH CHECK (user_wallet = public.jwt_wallet());


-- ============================================================
-- USER_TASTE_PROFILES
-- ============================================================
ALTER TABLE public.user_taste_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own taste profile"
  ON public.user_taste_profiles FOR SELECT
  USING (wallet = public.jwt_wallet());


-- ============================================================
-- FEED_CACHE
-- ============================================================
ALTER TABLE public.feed_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed cache"
  ON public.feed_cache FOR SELECT
  USING (user_wallet = public.jwt_wallet());


-- ============================================================
-- TRANSACTIONS
-- ============================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (
    from_wallet = public.jwt_wallet()
    OR to_wallet = public.jwt_wallet()
  );


-- ============================================================
-- CONTENT_VIOLATIONS
-- ============================================================
ALTER TABLE public.content_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own violations"
  ON public.content_violations FOR SELECT
  USING (wallet = public.jwt_wallet());


-- ============================================================
-- BLOCKED_CONTENT_HASHES
-- ============================================================
ALTER TABLE public.blocked_content_hashes ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- WALLET_RESTRICTIONS
-- ============================================================
ALTER TABLE public.wallet_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own restrictions"
  ON public.wallet_restrictions FOR SELECT
  USING (wallet = public.jwt_wallet());


-- ============================================================
-- USER_REPORTS
-- ============================================================
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert reports"
  ON public.user_reports FOR INSERT
  WITH CHECK (reporter_wallet = public.jwt_wallet());

CREATE POLICY "Users can view own reports"
  ON public.user_reports FOR SELECT
  USING (reporter_wallet = public.jwt_wallet());
