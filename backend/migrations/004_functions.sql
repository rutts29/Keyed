-- Function to check wallet upload limit based on violations
CREATE OR REPLACE FUNCTION get_wallet_upload_limit(wallet_address VARCHAR(44))
RETURNS INTEGER AS $$
DECLARE
    restriction_lvl INTEGER;
    recent_violations INTEGER;
BEGIN
    SELECT COALESCE(wr.restriction_level, 0)
    INTO restriction_lvl
    FROM wallet_restrictions wr
    WHERE wr.wallet = wallet_address
    AND (wr.restriction_until IS NULL OR wr.restriction_until > NOW());
    
    IF restriction_lvl IS NULL THEN
        restriction_lvl := 0;
    END IF;

    SELECT COUNT(*)
    INTO recent_violations
    FROM content_violations cv
    WHERE cv.wallet = wallet_address
    AND cv.timestamp > NOW() - INTERVAL '24 hours';

    IF restriction_lvl >= 3 THEN
        RETURN 0;
    ELSIF restriction_lvl = 2 OR recent_violations >= 3 THEN
        RETURN 2;
    ELSIF restriction_lvl = 1 OR recent_violations >= 2 THEN
        RETURN 10;
    ELSIF recent_violations >= 1 THEN
        RETURN 25;
    ELSE
        RETURN 50;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to increment user stats
CREATE OR REPLACE FUNCTION increment_user_stat(
    wallet_addr VARCHAR(44),
    stat_name TEXT,
    delta INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE users SET %I = %I + $1 WHERE wallet = $2',
        stat_name, stat_name
    ) USING delta, wallet_addr;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically increment post likes counter
-- Note: Requires index on posts(id) for efficient updates (created in 002_core_tables.sql as PRIMARY KEY)
CREATE OR REPLACE FUNCTION increment_post_likes(post_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically decrement post likes counter
-- Uses GREATEST to prevent negative counts from race conditions
CREATE OR REPLACE FUNCTION decrement_post_likes(post_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE posts SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically increment post comments counter
-- Note: Requires index on posts(id) for efficient updates (created in 002_core_tables.sql as PRIMARY KEY)
CREATE OR REPLACE FUNCTION increment_post_comments(post_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE posts SET comments = COALESCE(comments, 0) + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically decrement post comments counter
-- Uses GREATEST to prevent negative counts from race conditions
CREATE OR REPLACE FUNCTION decrement_post_comments(post_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE posts SET comments = GREATEST(COALESCE(comments, 0) - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;
