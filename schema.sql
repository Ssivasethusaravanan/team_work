-- Cloudflare D1 Schema for ModelPro SaaS
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  tenantId TEXT NOT NULL,
  role TEXT DEFAULT 'User',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user lookups by email
CREATE INDEX idx_users_email ON users(email);
