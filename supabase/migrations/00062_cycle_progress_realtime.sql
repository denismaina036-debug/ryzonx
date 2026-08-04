-- Enable Supabase Realtime for cycle progress events (investor live trading feeds).
ALTER PUBLICATION supabase_realtime ADD TABLE cycle_progress_events;
