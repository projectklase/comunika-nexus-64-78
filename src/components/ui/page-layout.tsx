import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { RESPONSIVE_CLASSES } from "@/lib/responsive-utils";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  /**
   * Page title (e.g., "Meu Calendário")
   */
  title: string;
  
  /**
   * Optional subtitle or description
   */
  subtitle?: string;
  
  /**
   * Action buttons for header (e.g., Export, Create buttons)
   */
  actions?: React.ReactNode;
  
  /**
   * Desktop filters - displayed inline on larger screens
   */
  filters?: React.ReactNode;
  
  /**
   * Mobile filters - content for Sheet component on mobile
   */
  mobileFilters?: React.ReactNode;
  
  /**
   * Main page content
   */
  children: React.ReactNode;
  
  /**
   * Additional className for container
   */
  className?: string;
}

/**
 * PageLayout - Standardized responsive layout wrapper
 * 
 * Provides consistent mobile-first structure for all pages:
 * - Responsive padding and spacing
 * - Header with title and actions
 * - Desktop: inline filters, Mobile: Sheet filters
 * - Semantic HTML structure
 * 
 * @example
 * ```tsx
 * <PageLayout
 *   title="Alunos"
 *   subtitle="Gerencie os alunos da escola"
 *   actions={<Button>Novo Aluno</Button>}
 *   filters={<FiltersBar />}
 *   mobileFilters={<FiltersContent />}
 * >
 *   <StudentsTable />
 * </PageLayout>
 * ```
 */
export function PageLayout({
  title,
  subtitle,
  actions,
  filters,
  mobileFilters,
  children,
  className,
}: PageLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className={cn(RESPONSIVE_CLASSES.pageContainer, RESPONSIVE_CLASSES.sectionSpacing, className)}>
      {/* Header: Title + Actions */}
      <header className={RESPONSIVE_CLASSES.pageHeader}>
        <div className="flex-1">
          <h1 className={cn(RESPONSIVE_CLASSES.pageTitle, "gradient-text")}>
            {title}
          </h1>
          {subtitle && (
            <p className={RESPONSIVE_CLASSES.pageSubtitle}>
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className={RESPONSIVE_CLASSES.headerActions}>
            {actions}
          </div>
        )}
      </header>

      {/* Filters: Desktop inline, Mobile in Sheet */}
      {(filters || mobileFilters) && (
        <div>
          {/* Desktop filters - shown inline */}
          {filters && (
            <div className={RESPONSIVE_CLASSES.filtersWrapper}>
              {filters}
            </div>
          )}

          {/* Mobile filters trigger - rendered by parent component */}
          {isMobile && mobileFilters && (
            <div className={RESPONSIVE_CLASSES.mobileFiltersButton}>
              {mobileFilters}
            </div>
          )}
        </div>
      )}

      {/* Main content area */}
      <main>
        {children}
      </main>
    </div>
  );
}
