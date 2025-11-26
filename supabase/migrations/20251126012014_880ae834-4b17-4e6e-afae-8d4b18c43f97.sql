-- Enable Realtime for notifications table (skip if already added to publication)
ALTER TABLE notifications REPLICA IDENTITY FULL;