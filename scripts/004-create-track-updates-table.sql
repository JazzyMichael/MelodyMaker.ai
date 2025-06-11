-- Create track_updates table for realtime notifications
CREATE TABLE IF NOT EXISTS track_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add any additional fields needed for notifications
  seen BOOLEAN DEFAULT FALSE,
  data JSONB
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_track_updates_track_id ON track_updates(track_id);
CREATE INDEX IF NOT EXISTS idx_track_updates_updated_at ON track_updates(updated_at DESC);

-- Enable row level security
ALTER TABLE track_updates ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (read-only)
CREATE POLICY "Allow public read access" ON track_updates
  FOR SELECT USING (true);

-- Enable realtime for this table
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE tracks, track_updates;
COMMIT;
