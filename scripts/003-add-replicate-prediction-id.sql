-- Add replicate_prediction_id column to tracks table
ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS replicate_prediction_id TEXT;

-- Create index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_tracks_replicate_prediction_id ON tracks(replicate_prediction_id);

-- Add error_message column for storing detailed error information
ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS error_message TEXT;
