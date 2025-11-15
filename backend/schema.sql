-- CMU Courses 3D Map Database Schema
-- Run this in your Supabase SQL editor

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course topics (many-to-many relationship)
CREATE TABLE IF NOT EXISTS course_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, topic)
);

-- Course prerequisites (self-referential many-to-many)
CREATE TABLE IF NOT EXISTS course_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    prerequisite_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, prerequisite_id),
    CHECK (course_id != prerequisite_id)
);

-- Course documents (lecture notes, assignments, etc.)
CREATE TABLE IF NOT EXISTS course_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    topic TEXT,
    url TEXT,
    document_type TEXT DEFAULT 'lecture', -- 'lecture', 'assignment', 'exam', 'notes'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    course_id TEXT REFERENCES courses(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_topics_course_id ON course_topics(course_id);
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course_id ON course_prerequisites(course_id);
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prerequisite_id ON course_prerequisites(prerequisite_id);
CREATE INDEX IF NOT EXISTS idx_course_documents_course_id ON course_documents(course_id);
CREATE INDEX IF NOT EXISTS idx_course_documents_topic ON course_documents(topic);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_course_id ON chat_messages(course_id);

-- Insert sample data
INSERT INTO courses (id, code, name, description) VALUES
    ('213', '15-213', 'Introduction to Computer Systems', 'Introduction to computer systems from a programmer''s perspective.'),
    ('122', '15-122', 'Principles of Imperative Computation', 'Fundamental concepts of imperative programming.'),
    ('251', '15-251', 'Great Theoretical Ideas in Computer Science', 'Theoretical foundations of computer science.'),
    ('210', '15-210', 'Principles of Programming', 'Parallel and functional programming concepts.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_topics (course_id, topic) VALUES
    ('213', 'Cache'),
    ('213', 'Memory'),
    ('213', 'Assembly'),
    ('213', 'C Programming'),
    ('213', 'Virtual Memory'),
    ('122', 'C0'),
    ('122', 'Data Structures'),
    ('122', 'Algorithms'),
    ('251', 'Graph Theory'),
    ('251', 'Probability'),
    ('251', 'Complexity'),
    ('210', 'Parallel Algorithms'),
    ('210', 'Functional Programming')
ON CONFLICT (course_id, topic) DO NOTHING;

INSERT INTO course_prerequisites (course_id, prerequisite_id) VALUES
    ('213', '122'),
    ('210', '122')
ON CONFLICT (course_id, prerequisite_id) DO NOTHING;

