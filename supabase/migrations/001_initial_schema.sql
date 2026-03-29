-- 1. Hospitals table
CREATE TABLE hospitals (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  country TEXT DEFAULT 'Azerbaijan',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  hospital_id BIGINT REFERENCES hospitals(id),
  role TEXT NOT NULL DEFAULT 'doctor', -- 'doctor', 'nurse', 'admin'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_at TIMESTAMPTZ,
  approved_by_admin_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Modules table
CREATE TABLE modules (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  description TEXT,
  hospital_id BIGINT REFERENCES hospitals(id),
  pass_threshold INT DEFAULT 80,
  max_attempts INT DEFAULT 3,
  certificate_validity_days INT DEFAULT 365,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Content table
CREATE TABLE content (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'html', 'markdown', 'video', 'pdf', 'image'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  duration_minutes INT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tests table
CREATE TABLE tests (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'pre', 'post'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, type)
);

-- 6. Questions table
CREATE TABLE questions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  test_id BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options JSONB NOT NULL, -- [{text, is_correct}]
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Test attempts table
CREATE TABLE test_attempts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  test_id BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  score_percent DECIMAL(5,2),
  passed BOOLEAN,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Answers table
CREATE TABLE answers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  attempt_id BIGINT NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questions(id),
  user_choice TEXT NOT NULL,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. User progress table
CREATE TABLE user_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  module_id BIGINT NOT NULL REFERENCES modules(id),
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  last_accessed TIMESTAMPTZ,
  PRIMARY KEY (user_id, module_id)
);

-- 10. Certificates table
CREATE TABLE certificates (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  module_id BIGINT NOT NULL REFERENCES modules(id),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  certificate_url TEXT,
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, module_id)
);

-- 11. Admin actions table (audit log)
CREATE TABLE admin_actions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID,
  target_module_id BIGINT,
  target_cert_id BIGINT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read their own data"
ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read modules from their hospital"
ON modules FOR SELECT USING (hospital_id = (SELECT hospital_id FROM users WHERE id = auth.uid()));
