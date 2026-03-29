-- ═══════════════════════════════════════════════════════════
-- 002_schema_updates.sql
-- Adds: content_progress, last_content_access_at, user_notes
-- ═══════════════════════════════════════════════════════════

-- 1. content_progress
--    Tracks per-user completion of each content item.
--    Was already being upserted by code — now formally defined.
CREATE TABLE IF NOT EXISTS content_progress (
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id   BIGINT      NOT NULL REFERENCES content(id)   ON DELETE CASCADE,
  completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  watch_pct    DECIMAL(5,2),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, content_id)
);

ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own content_progress"
  ON content_progress
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. last_content_access_at on user_progress
--    Updated after 10+ seconds of meaningful content engagement.
--    Used by submit-test to enforce: must review content after a failed post-test.
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS last_content_access_at TIMESTAMPTZ;

-- 3. user_notes
--    One note per user per content item. Schema only — UI is postponed.
CREATE TABLE IF NOT EXISTS user_notes (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id  BIGINT      NOT NULL REFERENCES modules(id)   ON DELETE CASCADE,
  content_id BIGINT      NOT NULL REFERENCES content(id)   ON DELETE CASCADE,
  note_text  TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, content_id)
);

ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notes"
  ON user_notes
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
