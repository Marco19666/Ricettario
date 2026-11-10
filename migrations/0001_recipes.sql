CREATE TABLE IF NOT EXISTS recipes (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  ingredients_json TEXT NOT NULL DEFAULT '[]',
  instructions TEXT NOT NULL DEFAULT '',
  photo_key TEXT,
  photo_type TEXT,
  saved_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS recipes_by_user_saved
  ON recipes (user_id, saved_at DESC);
