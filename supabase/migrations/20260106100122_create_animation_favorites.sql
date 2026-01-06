/*
  # Create animation_favorites table

  1. New Tables
    - `animation_favorites`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid) - References auth.users
      - `animation_id` (text) - ID of the favorited animation
      - `created_at` (timestamptz) - When the favorite was added

  2. Security
    - Enable RLS on `animation_favorites` table
    - Add policy for users to read their own favorites
    - Add policy for users to insert their own favorites
    - Add policy for users to delete their own favorites

  3. Indexes
    - Index on user_id for fast lookups
    - Unique constraint on (user_id, animation_id) to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS animation_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  animation_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, animation_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_animation_favorites_user_id ON animation_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_animation_favorites_created_at ON animation_favorites(created_at DESC);

-- Enable RLS
ALTER TABLE animation_favorites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own favorites"
  ON animation_favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON animation_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON animation_favorites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
