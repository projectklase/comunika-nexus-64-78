/**
 * Responsive Utility Classes for Mobile-First Design
 * 
 * Standard classes to be used across all pages for consistent mobile experience
 */

export const RESPONSIVE_CLASSES = {
  /**
   * Container with responsive padding
   * Mobile: 16px, Tablet: 24px, Desktop: 32px
   */
  pageContainer: "container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6",
  
  /**
   * Page header: stack on mobile, row on desktop
   * Includes proper gap and alignment
   */
  pageHeader: "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
  
  /**
   * Page title: responsive font sizes
   * Mobile: 24px (text-2xl), Desktop: 30px (text-3xl)
   */
  pageTitle: "text-2xl sm:text-3xl font-bold",
  
  /**
   * Page subtitle: responsive muted text
   */
  pageSubtitle: "text-sm sm:text-base text-muted-foreground",
  
  /**
   * Header actions: responsive spacing
   */
  headerActions: "flex items-center gap-2 sm:gap-3",
  
  /**
   * Button with icon - hide text on mobile, show on desktop
   * Use with: <Button className={RESPONSIVE_CLASSES.iconButton}>
   *   <Icon /> <span>Text</span>
   * </Button>
   */
  iconButton: "[&>span]:hidden sm:[&>span]:inline",
  
  /**
   * Responsive grid for cards
   * Mobile: 1 col, Tablet: 2 cols, Desktop: 3-4 cols
   */
  cardGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
  
  /**
   * Filters wrapper - hidden on mobile (use Sheet instead)
   */
  filtersWrapper: "hidden sm:flex flex-wrap items-center gap-3",
  
  /**
   * Mobile-only filters trigger button
   */
  mobileFiltersButton: "sm:hidden flex items-center gap-2",
  
  /**
   * Content spacing between sections
   */
  sectionSpacing: "space-y-4 sm:space-y-6",
  
  /**
   * Responsive button sizes
   */
  responsiveButton: "text-sm sm:text-base px-3 sm:px-4 py-2",
  
  /**
   * Compact header for mobile (smaller icon sizes)
   */
  mobileCompactIcon: "h-4 w-4 sm:h-5 sm:w-5",
} as const;

/**
 * Helper function to combine responsive classes with custom classes
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
