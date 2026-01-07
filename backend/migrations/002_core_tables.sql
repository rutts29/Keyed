-- Users (cache of on-chain profiles)
CREATE TABLE users (
    wallet VARCHAR(44) PRIMARY KEY,
    username VARCHAR(32) UNIQUE,
    bio TEXT,
    profile_image_uri TEXT,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_wallet CHECK (LENGTH(wallet) BETWEEN 32 AND 44)
);

CREATE INDEX idx_users_username ON users(username);

-- Posts (cache + AI metadata)
CREATE TABLE posts (
    id VARCHAR(44) PRIMARY KEY,
    creator_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
    content_uri TEXT NOT NULL,
    content_type VARCHAR(10) DEFAULT 'image',
    caption TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    tips_received BIGINT DEFAULT 0,
    is_token_gated BOOLEAN DEFAULT FALSE,
    required_token VARCHAR(44),
    llm_description TEXT,
    auto_tags TEXT[],
    scene_type VARCHAR(50),
    mood VARCHAR(100),
    safety_score FLOAT,
    alt_text TEXT,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_content_type CHECK (content_type IN ('image', 'video', 'text', 'multi'))
);

CREATE INDEX idx_posts_creator ON posts(creator_wallet);
CREATE INDEX idx_posts_timestamp ON posts(timestamp DESC);
CREATE INDEX idx_posts_token_gated ON posts(is_token_gated) WHERE is_token_gated = TRUE;

-- Follows
CREATE TABLE follows (
    follower_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
    following_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_wallet, following_wallet),
    CONSTRAINT no_self_follow CHECK (follower_wallet != following_wallet)
);

CREATE INDEX idx_follows_following ON follows(following_wallet);

-- Likes
CREATE TABLE likes (
    user_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
    post_id VARCHAR(44) NOT NULL REFERENCES posts(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_wallet, post_id)
);

CREATE INDEX idx_likes_post ON likes(post_id);

-- Comments
CREATE TABLE comments (
    id VARCHAR(44) PRIMARY KEY,
    post_id VARCHAR(44) NOT NULL REFERENCES posts(id),
    commenter_wallet VARCHAR(44) NOT NULL REFERENCES users(wallet),
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id, timestamp DESC);

-- Interactions (ML training data)
CREATE TABLE interactions (
    id SERIAL PRIMARY KEY,
    user_wallet VARCHAR(44) NOT NULL,
    post_id VARCHAR(44) NOT NULL,
    interaction_type VARCHAR(20) NOT NULL,
    dwell_time_seconds FLOAT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interactions_user ON interactions(user_wallet, timestamp DESC);
CREATE INDEX idx_interactions_type ON interactions(interaction_type);

-- User taste profiles (ML-generated)
CREATE TABLE user_taste_profiles (
    wallet VARCHAR(44) PRIMARY KEY REFERENCES users(wallet),
    taste_description TEXT,
    preferences JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feed cache
CREATE TABLE feed_cache (
    user_wallet VARCHAR(44) NOT NULL,
    post_id VARCHAR(44) NOT NULL,
    score FLOAT NOT NULL,
    position INTEGER NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_wallet, post_id)
);

CREATE INDEX idx_feed_cache_expiry ON feed_cache(expires_at);

-- Transaction history
CREATE TABLE transactions (
    signature VARCHAR(88) PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    from_wallet VARCHAR(44),
    to_wallet VARCHAR(44),
    amount BIGINT,
    post_id VARCHAR(44),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE INDEX idx_transactions_from ON transactions(from_wallet, timestamp DESC);
CREATE INDEX idx_transactions_to ON transactions(to_wallet, timestamp DESC);
