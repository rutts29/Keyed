-- Add subscription price column to users table
-- Creators set their monthly subscription price (in SOL)
ALTER TABLE users ADD COLUMN subscription_price NUMERIC(20, 9) DEFAULT NULL;
