import { useState, useEffect } from 'react';

// Layout tokens for responsive design
export const LAYOUT_TOKENS = {
  MOBILE_BREAKPOINT: 640,
  TABLET_BREAKPOINT: 1024,
  MOBILE_PILLS_PER_DAY: 2,
  TABLET_PILLS_PER_DAY: 3,
  DESKTOP_PILLS_PER_DAY: 4,
  EXPANDED_PILLS_MULTIPLIER: 1.5,
  CELL_MIN_HEIGHT: 80,
  CELL_MAX_HEIGHT: 140,
} as const;

interface CalendarLayoutConfig {
  pillHeight: number;
  maxCellHeight: number;
  visiblePerDay: number;
  gridColumns: number;
  containerPadding: string;
}

export function useCalendarLayout() {
  const [screenSize, setScreenSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < LAYOUT_TOKENS.MOBILE_BREAKPOINT) setScreenSize('xs');
      else if (width < 768) setScreenSize('sm');
      else if (width < LAYOUT_TOKENS.TABLET_BREAKPOINT) setScreenSize('md');
      else if (width < 1280) setScreenSize('lg');
      else setScreenSize('xl');
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const getLayoutConfig = (): CalendarLayoutConfig => {
    const isMobile = ['xs', 'sm'].includes(screenSize);
    const isTablet = screenSize === 'md';
    const isDesktop = ['lg', 'xl'].includes(screenSize);
    
    if (isMobile) {
      return {
        pillHeight: 24,
        maxCellHeight: LAYOUT_TOKENS.CELL_MIN_HEIGHT,
        visiblePerDay: LAYOUT_TOKENS.MOBILE_PILLS_PER_DAY,
        gridColumns: 1,
        containerPadding: 'var(--mobile-padding)'
      };
    }
    
    if (isTablet) {
      return {
        pillHeight: 26,
        maxCellHeight: LAYOUT_TOKENS.CELL_MAX_HEIGHT * 0.8,
        visiblePerDay: LAYOUT_TOKENS.TABLET_PILLS_PER_DAY,
        gridColumns: 2,
        containerPadding: 'var(--tablet-padding)'
      };
    }
    
    // Desktop
    return {
      pillHeight: 28,
      maxCellHeight: LAYOUT_TOKENS.CELL_MAX_HEIGHT,
      visiblePerDay: LAYOUT_TOKENS.DESKTOP_PILLS_PER_DAY,
      gridColumns: 3,
      containerPadding: 'var(--desktop-padding)'
    };
  };

  const getVisiblePerDay = (weekIndex: number): number => {
    const config = getLayoutConfig();
    return config.visiblePerDay;
  };

  const config = getLayoutConfig();

  return {
    ...config,
    getVisiblePerDay,
    screenSize,
    isMobile: ['xs', 'sm'].includes(screenSize),
    isTablet: screenSize === 'md',
    isDesktop: ['lg', 'xl'].includes(screenSize)
  };
}