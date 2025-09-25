import { format } from 'date-fns';
import { ROUTES } from '@/constants/routes';

interface CalendarNavigationParams {
  date?: string | Date;
  classId?: string;
  postId?: string;
  view?: 'month' | 'week';
}

export function buildAlunoCalendarUrl({
  date,
  classId,
  postId,
  view = 'month'
}: CalendarNavigationParams = {}): string {
  const baseUrl = ROUTES.ALUNO.CALENDARIO;
  const params = new URLSearchParams();

  // Add date parameter
  if (date) {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    if (!isNaN(targetDate.getTime())) {
      params.set('d', format(targetDate, 'yyyy-MM-dd'));
    }
  }

  // Add class filter
  if (classId && classId !== 'ALL_CLASSES') {
    params.set('classId', classId);
  }

  // Add post highlight
  if (postId) {
    params.set('postId', postId);
  }

  // Add view if not default
  if (view !== 'month') {
    params.set('v', view);
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function navigateToAlunoCalendar(
  navigate: (url: string) => void,
  params: CalendarNavigationParams = {}
) {
  const url = buildAlunoCalendarUrl(params);
  navigate(url);
}