-- Create tracks table for storing generated music
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration INTEGER DEFAULT 30, -- duration in seconds
  file_url TEXT, -- URL to the stored MP3 file
  file_path TEXT, -- path in storage bucket
  status VARCHAR(50) DEFAULT 'generating', -- generating, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Generation parameters
  user_description TEXT,
  selected_songs JSONB, -- array of selected song data
  generation_params JSONB, -- additional parameters used for generation
  
  -- Metadata
  genres TEXT[], -- extracted/inferred genres
  tempo INTEGER, -- BPM
  key VARCHAR(10), -- musical key
  mode VARCHAR(10), -- major/minor
  energy DECIMAL(3,2), -- 0.00 to 1.00
  valence DECIMAL(3,2), -- 0.00 to 1.00 (mood)
  
  -- External service IDs
  replicate_prediction_id TEXT -- Replicate prediction ID
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_tracks_updated_at ON tracks;
CREATE TRIGGER update_tracks_updated_at 
    BEFORE UPDATE ON tracks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
