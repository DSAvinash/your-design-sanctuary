-- Create analytics_events table to track user interactions
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  page_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert events (anonymous users can trigger analytics)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
TO public
WITH CHECK (true);

-- Allow anyone to read analytics (so dashboards can display stats)
CREATE POLICY "Analytics events are readable by everyone"
ON public.analytics_events
FOR SELECT
TO public
USING (true);

-- Create an index on event_type and created_at for faster queries
CREATE INDEX idx_analytics_events_type_time
ON public.analytics_events(event_type, created_at DESC);