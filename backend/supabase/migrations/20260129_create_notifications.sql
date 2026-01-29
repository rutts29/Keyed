-- Create notifications table for persistent notification storage
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient   TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'tip', 'new_post')),
  from_wallet TEXT,
  post_id     TEXT,
  comment_id  TEXT,
  amount      NUMERIC,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient) WHERE read = false;

-- Enable RLS for defense-in-depth
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Service role (used by backend) bypasses RLS automatically.
-- These policies protect against accidental anon-key exposure.
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (recipient = current_setting('request.jwt.claims', true)::json ->> 'wallet');

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (recipient = current_setting('request.jwt.claims', true)::json ->> 'wallet');
