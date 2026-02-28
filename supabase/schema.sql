-- =============================================
-- UNI Mentores - Schema v2.1 (Production-Ready)
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES (referencias auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  faculty TEXT NOT NULL,
  cycle TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','moderator','admin')),
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POSTS (OFFER / REQUEST)
-- =============================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('OFFER','REQUEST')),
  course TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT,
  price_or_budget NUMERIC(10,2),
  mode TEXT CHECK (mode IN ('virtual','presencial','hibrido')),
  urgency TEXT CHECK (urgency IN ('baja','media','alta')),
  tags TEXT[],
  availability JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_course ON posts(course);

-- =============================================
-- PAYMENTS (Yape Secure Payments)
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  yape_code TEXT NOT NULL,
  course TEXT NOT NULL,
  topic TEXT NOT NULL,
  scheduled_day TEXT,
  scheduled_start TEXT,
  scheduled_end TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_mentor ON payments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- =============================================
-- POST LIKES
-- =============================================
CREATE TABLE IF NOT EXISTS post_likes (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON post_likes(post_id);

-- =============================================
-- CONVERSATIONS (con dm_key race-safe)
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT NOT NULL CHECK (context_type IN ('post','session','direct')),
  context_id UUID,
  dm_key TEXT NOT NULL UNIQUE,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_last_msg ON conversations(last_message_at DESC);

-- =============================================
-- CONVERSATION PARTICIPANTS
-- =============================================
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT '1970-01-01',
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_user ON conversation_participants(user_id);

-- =============================================
-- MESSAGES (con idempotencia)
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'text' CHECK (type IN ('text','image','file','system')),
  content TEXT,
  metadata JSONB,
  client_id UUID NOT NULL,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_client_msg UNIQUE(conversation_id, sender_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_client ON messages(client_id);

-- =============================================
-- SESSIONS (mentorías)
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES profiles(id),
  mentee_id UUID NOT NULL REFERENCES profiles(id),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id),
  course TEXT NOT NULL,
  topic TEXT,
  scheduled_at TIMESTAMPTZ,
  mode TEXT CHECK (mode IN ('virtual','presencial','hibrido')),
  price NUMERIC(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled')),
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sess_mentor ON sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sess_mentee ON sessions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_sess_status ON sessions(status);

-- =============================================
-- REVIEWS
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  reviewee_id UUID NOT NULL REFERENCES profiles(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_review UNIQUE(session_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_rev_reviewee ON reviews(reviewee_id);

-- =============================================
-- REPORTS
-- =============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  reported_user_id UUID REFERENCES profiles(id),
  reported_post_id UUID REFERENCES posts(id),
  reported_message_id UUID REFERENCES messages(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like','comment','follow','new_post')),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id) WHERE is_read = false;

-- =============================================
-- FOLLOWS
-- =============================================
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);

-- =============================================
-- POST COMMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id, created_at DESC);

-- =============================================
-- BLOCKS
-- =============================================
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- =============================================
-- TRIGGER: Auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, faculty)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'faculty', 'Sin especificar')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RLS: Enable on all tables
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: profiles
-- =============================================
DROP POLICY IF EXISTS "View active profiles" ON profiles;
CREATE POLICY "View active profiles" ON profiles
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Update own profile" ON profiles;
CREATE POLICY "Update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- RLS POLICIES: posts
-- =============================================
DROP POLICY IF EXISTS "View posts" ON posts;
CREATE POLICY "View posts" ON posts
  FOR SELECT USING (status = 'active' OR user_id = auth.uid());

DROP POLICY IF EXISTS "Create own posts" ON posts;
CREATE POLICY "Create own posts" ON posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Update own posts" ON posts;
CREATE POLICY "Update own posts" ON posts
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Delete own posts" ON posts;
CREATE POLICY "Delete own posts" ON posts
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES: conversations
-- =============================================
DROP POLICY IF EXISTS "View own conversations" ON conversations;
CREATE POLICY "View own conversations" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES: conversation_participants
-- =============================================
DROP POLICY IF EXISTS "View own participations" ON conversation_participants;
CREATE POLICY "View own participations" ON conversation_participants
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Update own participation" ON conversation_participants;
CREATE POLICY "Update own participation" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES: messages
-- =============================================
DROP POLICY IF EXISTS "View conversation messages" ON messages;
CREATE POLICY "View conversation messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- =============================================
-- RLS POLICIES: sessions
-- =============================================
DROP POLICY IF EXISTS "View own sessions" ON sessions;
CREATE POLICY "View own sessions" ON sessions
  FOR SELECT USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

DROP POLICY IF EXISTS "Create sessions" ON sessions;
CREATE POLICY "Create sessions" ON sessions
  FOR INSERT WITH CHECK (mentor_id = auth.uid() OR mentee_id = auth.uid());

DROP POLICY IF EXISTS "Update own sessions" ON sessions;
CREATE POLICY "Update own sessions" ON sessions
  FOR UPDATE USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

-- =============================================
-- RLS POLICIES: reviews
-- =============================================
DROP POLICY IF EXISTS "View reviews" ON reviews;
CREATE POLICY "View reviews" ON reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Create reviews" ON reviews;
CREATE POLICY "Create reviews" ON reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- =============================================
-- RLS POLICIES: blocks
-- =============================================
DROP POLICY IF EXISTS "Manage own blocks" ON blocks;
CREATE POLICY "Manage own blocks" ON blocks
  FOR ALL USING (blocker_id = auth.uid());

-- =============================================
-- RLS POLICIES: reports
-- =============================================
DROP POLICY IF EXISTS "Create reports" ON reports;
CREATE POLICY "Create reports" ON reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "View own reports" ON reports;
CREATE POLICY "View own reports" ON reports
  FOR SELECT USING (reporter_id = auth.uid());

-- =============================================
-- RLS POLICIES: notifications
-- =============================================
DROP POLICY IF EXISTS "View own notifications" ON notifications;
CREATE POLICY "View own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Create notifications" ON notifications;
CREATE POLICY "Create notifications" ON notifications
  FOR INSERT WITH CHECK (actor_id = auth.uid());

DROP POLICY IF EXISTS "Update own notifications" ON notifications;
CREATE POLICY "Update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Delete own notifications" ON notifications;
CREATE POLICY "Delete own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES: follows
-- =============================================
DROP POLICY IF EXISTS "View follows" ON follows;
CREATE POLICY "View follows" ON follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage own follows" ON follows;
CREATE POLICY "Manage own follows" ON follows
  FOR ALL USING (follower_id = auth.uid());

-- =============================================
-- RLS POLICIES: post_comments
-- =============================================
DROP POLICY IF EXISTS "View comments" ON post_comments;
CREATE POLICY "View comments" ON post_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Create own comments" ON post_comments;
CREATE POLICY "Create own comments" ON post_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Delete own comments" ON post_comments;
CREATE POLICY "Delete own comments" ON post_comments
  FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- REALTIME
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
  END IF;
END$$;

-- =============================================
-- RPC: Get or Create Conversation (race-safe)
-- =============================================
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_context_type TEXT,
  p_context_id UUID,
  p_other_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  v_dm_key TEXT;
  v_conv_id UUID;
BEGIN
  -- Validate
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_other_user_id = current_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM blocks 
    WHERE (blocker_id = current_user_id AND blocked_id = p_other_user_id)
       OR (blocker_id = p_other_user_id AND blocked_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation: blocked';
  END IF;
  
  -- Build dm_key
  v_dm_key := p_context_type || ':' || COALESCE(p_context_id::TEXT, 'null') || ':' || 
              LEAST(current_user_id::TEXT, p_other_user_id::TEXT) || ':' || 
              GREATEST(current_user_id::TEXT, p_other_user_id::TEXT);
  
  -- Try to find existing
  SELECT id INTO v_conv_id FROM conversations WHERE dm_key = v_dm_key;
  
  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;
  
  -- Create new (race-safe with UNIQUE constraint)
  INSERT INTO conversations (context_type, context_id, dm_key)
  VALUES (p_context_type, p_context_id, v_dm_key)
  ON CONFLICT (dm_key) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_conv_id;
  
  -- Add participants (idempotent)
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (v_conv_id, current_user_id), (v_conv_id, p_other_user_id)
  ON CONFLICT DO NOTHING;
  
  RETURN v_conv_id;
END;
$$;

-- =============================================
-- RPC: Send Message (idempotent)
-- =============================================
CREATE OR REPLACE FUNCTION send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_client_id UUID,
  p_type TEXT DEFAULT 'text',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  v_msg_id UUID;
BEGIN
  -- Validate
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check participant
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  
  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM conversation_participants cp
    JOIN blocks b ON (b.blocker_id = cp.user_id AND b.blocked_id = current_user_id)
                  OR (b.blocked_id = cp.user_id AND b.blocker_id = current_user_id)
    WHERE cp.conversation_id = p_conversation_id AND cp.user_id != current_user_id
  ) THEN
    RAISE EXCEPTION 'Cannot send message: blocked';
  END IF;
  
  -- Insert (idempotent with UNIQUE constraint)
  INSERT INTO messages (conversation_id, sender_id, content, client_id, type, metadata)
  VALUES (p_conversation_id, current_user_id, p_content, p_client_id, p_type, p_metadata)
  ON CONFLICT (conversation_id, sender_id, client_id) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_msg_id;
  
  -- Update conversation
  UPDATE conversations SET
    last_message_at = NOW(),
    last_message_preview = LEFT(p_content, 100),
    updated_at = NOW()
  WHERE id = p_conversation_id;
  
  RETURN v_msg_id;
END;
$$;

-- =============================================
-- RPC: Mark Conversation as Read
-- =============================================
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversation_participants
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
END;
$$;

-- =============================================
-- RPC: Transition Session Status
-- =============================================
CREATE OR REPLACE FUNCTION transition_session(
  p_session_id UUID,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  v_session RECORD;
BEGIN
  -- Get session
  SELECT * INTO v_session FROM sessions WHERE id = p_session_id;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  -- Check authorization
  IF current_user_id NOT IN (v_session.mentor_id, v_session.mentee_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Validate transitions
  IF v_session.status = 'pending' AND p_new_status NOT IN ('confirmed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from pending';
  END IF;
  
  IF v_session.status = 'confirmed' AND p_new_status NOT IN ('in_progress', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from confirmed';
  END IF;
  
  IF v_session.status = 'in_progress' AND p_new_status NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition from in_progress';
  END IF;
  
  IF v_session.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot transition from terminal state';
  END IF;
  
  -- Update
  UPDATE sessions SET
    status = p_new_status,
    cancelled_by = CASE WHEN p_new_status = 'cancelled' THEN current_user_id ELSE NULL END,
    cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN p_reason ELSE NULL END,
    completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN TRUE;
END;
$$;

-- =============================================
-- MENTOR VERIFICATION SYSTEM (Migration v2.3)
-- =============================================

-- Add mentor_status column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mentor_status TEXT DEFAULT 'none'
CHECK (mentor_status IN ('none', 'approved'));

-- Add whatsapp column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_mentor_status ON profiles(mentor_status);

-- Admin can update any profile (for mentor approval)
DROP POLICY IF EXISTS "Admin update profiles" ON profiles;
DROP POLICY IF EXISTS "Update own profile" ON profiles;
DROP POLICY IF EXISTS "Update own or admin update profiles" ON profiles;
DROP POLICY IF EXISTS "Update own or admin update profiles" ON profiles;
CREATE POLICY "Update own or admin update profiles" ON profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only approved mentors can create OFFER posts
DROP POLICY IF EXISTS "Create own posts" ON posts;
DROP POLICY IF EXISTS "Only mentors create offers" ON posts;
CREATE POLICY "Only mentors create offers" ON posts
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      type = 'REQUEST'
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND mentor_status = 'approved')
    )
  );

-- View profiles: everyone can see active profiles (no self-referencing query needed)
DROP POLICY IF EXISTS "View active profiles" ON profiles;
DROP POLICY IF EXISTS "View profiles" ON profiles;
CREATE POLICY "View profiles" ON profiles
  FOR SELECT USING (true);

-- =============================================
-- SUCCESS
-- =============================================
DO $$ BEGIN RAISE NOTICE 'UNI Mentores schema v2.3 with mentor verification + whatsapp created successfully!'; END $$;
