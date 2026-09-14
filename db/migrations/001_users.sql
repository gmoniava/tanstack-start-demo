CREATE TABLE users (
  id uuid PRIMARY KEY,
  name varchar(100) NOT NULL CHECK (length(trim(name)) > 0),
  email varchar(254) NOT NULL UNIQUE CHECK (email = lower(trim(email))),
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_attempts (
  email varchar(254) PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX auth_attempts_expiry_idx ON auth_attempts (expires_at);
