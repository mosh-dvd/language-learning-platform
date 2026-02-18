-- Language Learning Platform - Initial Schema Migration
-- This migration creates all core tables for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  native_language VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Images table
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Create index on created_by for faster lookups
CREATE INDEX idx_images_created_by ON images(created_by);

-- Image_Texts table
CREATE TABLE image_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  text TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(image_id, language_code, version)
);

-- Create indexes for faster lookups
CREATE INDEX idx_image_texts_image_id ON image_texts(image_id);
CREATE INDEX idx_image_texts_language_code ON image_texts(language_code);
CREATE INDEX idx_image_texts_image_lang ON image_texts(image_id, language_code);

-- Lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_lessons_target_language ON lessons(target_language);
CREATE INDEX idx_lessons_published ON lessons(published);
CREATE INDEX idx_lessons_created_by ON lessons(created_by);

-- Exercises table
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  image_id UUID REFERENCES images(id),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lesson_id, order_index)
);

-- Create indexes for faster lookups
CREATE INDEX idx_exercises_lesson_id ON exercises(lesson_id);
CREATE INDEX idx_exercises_image_id ON exercises(image_id);

-- User_Progress table
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, exercise_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_exercise_id ON user_progress(exercise_id);
CREATE INDEX idx_user_progress_completed ON user_progress(completed);

-- Pronunciation_Scores table
CREATE TABLE pronunciation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  recognized_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX idx_pronunciation_scores_user_id ON pronunciation_scores(user_id);
CREATE INDEX idx_pronunciation_scores_exercise_id ON pronunciation_scores(exercise_id);
CREATE INDEX idx_pronunciation_scores_created_at ON pronunciation_scores(created_at);

-- Cached_Audio table
CREATE TABLE cached_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_text_id UUID REFERENCES image_texts(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  text_hash VARCHAR(64) NOT NULL,
  audio_url VARCHAR(500) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  UNIQUE(text_hash, language_code, provider)
);

-- Create indexes for faster lookups
CREATE INDEX idx_cached_audio_text_hash ON cached_audio(text_hash, language_code);
CREATE INDEX idx_cached_audio_last_accessed ON cached_audio(last_accessed);
CREATE INDEX idx_cached_audio_image_text_id ON cached_audio(image_text_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
