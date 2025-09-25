import { Post } from '@/types/post';

export function sortDesc(a: Post, b: Post) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function isUpcomingEvent(p: Post, days = 7) {
  if (p.type !== 'EVENTO' || !p.eventStartAt) return false;
  const now = new Date();
  const end = new Date(); 
  end.setDate(end.getDate() + days);
  const start = new Date(p.eventStartAt);
  return start >= now && start <= end;
}

export function recentPosts(posts: Post[], days = 7) {
  const from = new Date(); 
  from.setDate(from.getDate() - days);
  return posts.filter(p => new Date(p.createdAt) >= from).sort(sortDesc);
}

export function lastN(posts: Post[], n = 3) {
  return [...posts].sort(sortDesc).slice(0, n);
}

export function countByType(posts: Post[], type: Post['type']) {
  return posts.filter(p => p.type === type && p.status === 'PUBLISHED').length;
}

export function filterByAudience(posts: Post[], user: any) {
  // Future: filter GLOBAL vs CLASS by user's classes
  // For now, return all posts
  return posts;
}