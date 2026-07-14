-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'USER';

-- Set all existing users to USER
UPDATE users SET role = 'USER';

-- Set Doanne, Phandeptrai, and admin as ADMIN
UPDATE users SET role = 'ADMIN' WHERE LOWER(username) IN ('doanne', 'phandeptrai', 'admin');
