import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parse, isValid } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants/routes';

export function useCalendarNavigation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const goToCalendarWithDate = (date: string | Date, view: 'month' | 'week' = 'month', postId?: string, classId?: string) => {
    try {
      const targetDate = typeof date === 'string' ? new Date(date) : date;
      
      if (!isValid(targetDate)) {
        console.warn('Invalid date provided to calendar navigation:', date);
        navigate(getCalendarRoute());
        return;
      }
      
      const dateString = format(targetDate, 'yyyy-MM-dd');
      const params = new URLSearchParams();
      params.set('d', dateString);
      // Open day focus modal for precise context
      params.set('modal', 'day');
      
      if (view !== 'month') {
        params.set('v', view);
      }
      
      if (postId) {
        params.set('postId', postId);
      }
      
      if (classId && classId !== 'ALL_CLASSES') {
        params.set('classId', classId);
      }
      
      const baseRoute = getCalendarRoute();
      const queryString = params.toString();
      navigate(queryString ? `${baseRoute}?${queryString}` : baseRoute);
    } catch (error) {
      console.error('Calendar navigation error:', error);
      navigate(getCalendarRoute());
    }
  };
  
  const getCalendarRoute = () => {
    try {
      switch (user?.role) {
        case 'aluno':
          return ROUTES.ALUNO.CALENDARIO;
        case 'professor':
          return ROUTES.PROFESSOR.CALENDARIO;
        case 'secretaria':
          return ROUTES.SECRETARIA.CALENDARIO;
        default:
          console.warn('Unknown user role:', user?.role);
          return ROUTES.SECRETARIA.CALENDARIO; // fallback to secretaria
      }
    } catch (error) {
      console.error('Error getting calendar route:', error);
      return '/calendario'; // Safe fallback
    }
  };

  const goToClassCalendar = (classId: string, date?: string | Date) => {
    try {
      let basePath = '/secretaria'; // default fallback
      
      switch (user?.role) {
        case 'professor':
          basePath = '/professor';
          break;
        case 'aluno':
          basePath = '/aluno';
          break;
        case 'secretaria':
          basePath = '/secretaria';
          break;
        default:
          console.warn('Unknown user role for class calendar:', user?.role);
      }
      
      let route = `${basePath}/turma/${classId}/calendario`;
      
      if (date) {
        const targetDate = typeof date === 'string' ? new Date(date) : date;
        if (isValid(targetDate)) {
          const params = new URLSearchParams();
          params.set('d', format(targetDate, 'yyyy-MM-dd'));
          params.set('modal', 'day');
          route += `?${params.toString()}`;
        }
      }
      
      navigate(route);
    } catch (error) {
      console.error('Error navigating to class calendar:', error);
      navigate('/dashboard'); // Safe fallback
    }
  };
  
  const goToCalendarWithEvent = (eventStartAt: string, postId?: string, classId?: string) => {
    goToCalendarWithDate(eventStartAt, 'month', postId, classId);
  };
  
  const goToCalendarWithActivity = (dueAt: string, postId?: string, classId?: string) => {
    goToCalendarWithDate(dueAt, 'month', postId, classId);
  };
  
  return {
    goToCalendarWithDate,
    goToCalendarWithEvent,
    goToCalendarWithActivity,
    goToClassCalendar,
    getCalendarRoute
  };
}

export function useCalendarDateFromUrl() {
  const [searchParams] = useSearchParams();
  
  const getDateFromUrl = (): Date | null => {
    const dateParam = searchParams.get('d');
    if (!dateParam) return null;
    
    try {
      const parsedDate = parse(dateParam, 'yyyy-MM-dd', new Date());
      return isValid(parsedDate) ? parsedDate : null;
    } catch {
      return null;
    }
  };
  
  const getViewFromUrl = (): 'month' | 'week' => {
    const view = searchParams.get('v');
    return view === 'week' ? 'week' : 'month';
  };
  
  return {
    getDateFromUrl,
    getViewFromUrl
  };
}