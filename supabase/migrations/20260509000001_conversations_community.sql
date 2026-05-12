-- Community chat (global, single room)
CREATE TABLE IF NOT EXISTS community_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT        CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_messages_created_at_idx ON community_messages(created_at DESC);

ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_messages_select" ON community_messages;
DROP POLICY IF EXISTS "community_messages_insert" ON community_messages;
DROP POLICY IF EXISTS "community_messages_delete" ON community_messages;

CREATE POLICY "community_messages_select" ON community_messages FOR SELECT USING (true);
CREATE POLICY "community_messages_insert" ON community_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_messages_delete" ON community_messages FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE community_messages;

-- Direct message conversations (one-to-one)
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_unique_pair UNIQUE (user1_id, user2_id),
  CONSTRAINT conversations_no_self     CHECK (user1_id <> user2_id),
  CONSTRAINT conversations_ordered     CHECK (user1_id < user2_id)
);

CREATE INDEX IF NOT EXISTS conversations_user1_idx ON conversations(user1_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS conversations_user2_idx ON conversations(user2_id, last_message_at DESC NULLS LAST);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;

CREATE POLICY "conversations_select" ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK ((auth.uid() = user1_id OR auth.uid() = user2_id) AND user1_id < user2_id);

CREATE POLICY "conversations_update" ON conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Messages within a DM conversation
CREATE TABLE IF NOT EXISTS conversation_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversation_messages_conv_idx
  ON conversation_messages(conversation_id, created_at DESC);

ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_messages_select" ON conversation_messages;
DROP POLICY IF EXISTS "conversation_messages_insert" ON conversation_messages;
DROP POLICY IF EXISTS "conversation_messages_update" ON conversation_messages;

CREATE POLICY "conversation_messages_select" ON conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "conversation_messages_insert" ON conversation_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "conversation_messages_update" ON conversation_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE conversation_messages;
