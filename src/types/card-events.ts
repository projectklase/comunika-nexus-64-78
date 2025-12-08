// Card Events Types for Limited Edition System

export interface CardEvent {
  id: string;
  name: string;
  slug: string;
  description?: string;
  theme_color?: string;
  banner_url?: string;
  icon_name?: string;
  event_pack_name?: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  show_in_collection: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardEventFormData {
  name: string;
  slug: string;
  description?: string;
  theme_color?: string;
  banner_url?: string;
  icon_name?: string;
  event_pack_name?: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  show_in_collection: boolean;
}

// Helper to check if an event is currently active
export const isEventActive = (event: CardEvent): boolean => {
  const now = new Date();
  const startsAt = new Date(event.starts_at);
  const endsAt = new Date(event.ends_at);
  return event.is_active && now >= startsAt && now <= endsAt;
};

// Helper to get time remaining for an event
export const getEventTimeRemaining = (event: CardEvent): { days: number; hours: number; minutes: number } | null => {
  if (!isEventActive(event)) return null;
  
  const now = new Date();
  const endsAt = new Date(event.ends_at);
  const diff = endsAt.getTime() - now.getTime();
  
  if (diff <= 0) return null;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
};

// Event status enum
export type EventStatus = 'upcoming' | 'active' | 'ended';

export const getEventStatus = (event: CardEvent): EventStatus => {
  const now = new Date();
  const startsAt = new Date(event.starts_at);
  const endsAt = new Date(event.ends_at);
  
  if (now < startsAt) return 'upcoming';
  if (now > endsAt) return 'ended';
  return 'active';
};
