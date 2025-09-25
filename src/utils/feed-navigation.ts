import { NavigateFunction } from 'react-router-dom';
import { Post } from '@/types/post';

/**
 * Navigate to feed with post focus
 */
export class FeedNavigation {
  static navigateToPost(navigate: NavigateFunction, userRole: string, post: Post) {
    // Set session storage as fallback
    sessionStorage.setItem('feed:focusPostId', post.id);
    
    // Determine the correct feed route based on user role
    const feedRoute = this.getFeedRoute(userRole);
    
    // Navigate with focus query parameter
    navigate(`${feedRoute}?focus=${post.id}`);
  }

  static getFeedRoute(userRole: string): string {
    switch (userRole) {
      case 'aluno':
        return '/aluno/feed';
      case 'professor':
        return '/professor/feed';
      case 'secretaria':
        return '/secretaria/feed';
      default:
        return '/feed';
    }
  }

  /**
   * Clear all active filters to show the post
   */
  static getDefaultFilters() {
    return {
      saved: false
    };
  }

  /**
   * Get filters needed to show a specific post
   */
  static getFiltersForPost(post: Post) {
    return {
      saved: false
    };
  }

  /**
   * Create a shareable deep link
   */
  static createShareableLink(userRole: string, post: Post): string {
    const feedRoute = this.getFeedRoute(userRole);
    const baseUrl = window.location.origin;
    return `${baseUrl}${feedRoute}#post-${post.id}`;
  }

  /**
   * Navigate from dashboard "Últimas Publicações"
   */
  static navigateFromDashboard(navigate: NavigateFunction, userRole: string, post: Post) {
    this.navigateToPost(navigate, userRole, post);
  }
}