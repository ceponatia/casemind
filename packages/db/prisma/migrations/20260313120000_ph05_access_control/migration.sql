ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE users
SET role_ids = ARRAY[role]
WHERE array_length(role_ids, 1) IS NULL OR array_length(role_ids, 1) = 0;

ALTER TABLE users
  DROP COLUMN IF EXISTS role;