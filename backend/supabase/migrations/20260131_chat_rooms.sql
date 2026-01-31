-- Chat rooms owned by creators with optional token/NFT gating
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  required_token VARCHAR(44),
  minimum_balance BIGINT DEFAULT 0,
  required_nft_collection VARCHAR(44),
  gate_type VARCHAR(10) NOT NULL DEFAULT 'open'
    CHECK (gate_type IN ('token', 'nft', 'both', 'open')),
  max_members INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_rooms_creator ON chat_rooms(creator_wallet);
CREATE INDEX idx_chat_rooms_active ON chat_rooms(is_active) WHERE is_active = TRUE;

-- Persisted chat messages within rooms
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room_time ON chat_messages(room_id, created_at DESC);

-- Room membership tracking with presence
CREATE TABLE chat_members (
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, wallet)
);

-- RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;

-- Chat rooms: anyone can view active rooms, creators can manage own
CREATE POLICY "Anyone can view active rooms"
  ON chat_rooms FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Creators can insert own rooms"
  ON chat_rooms FOR INSERT
  WITH CHECK (creator_wallet = public.jwt_wallet());

CREATE POLICY "Creators can update own rooms"
  ON chat_rooms FOR UPDATE
  USING (creator_wallet = public.jwt_wallet());

CREATE POLICY "Creators can delete own rooms"
  ON chat_rooms FOR DELETE
  USING (creator_wallet = public.jwt_wallet());

-- Chat messages: members can view and send
CREATE POLICY "Members can view messages"
  ON chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_members.room_id = chat_messages.room_id
      AND chat_members.wallet = public.jwt_wallet()
  ));

CREATE POLICY "Members can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_wallet = public.jwt_wallet()
    AND EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_messages.room_id
        AND chat_members.wallet = public.jwt_wallet()
    )
  );

-- Chat members: anyone can view, users manage own membership
CREATE POLICY "Anyone can view memberships"
  ON chat_members FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can join rooms"
  ON chat_members FOR INSERT
  WITH CHECK (wallet = public.jwt_wallet());

CREATE POLICY "Users can leave rooms"
  ON chat_members FOR DELETE
  USING (wallet = public.jwt_wallet());

CREATE POLICY "Users can update own membership"
  ON chat_members FOR UPDATE
  USING (wallet = public.jwt_wallet());

COMMENT ON TABLE chat_rooms IS 'Creator-owned chat rooms with optional token/NFT gating';
COMMENT ON TABLE chat_messages IS 'Persisted chat messages within rooms';
COMMENT ON TABLE chat_members IS 'Room membership tracking with presence';
