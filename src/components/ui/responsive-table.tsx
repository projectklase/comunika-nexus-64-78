import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Column<T> {
  /**
   * Column header label
   */
  header: string;
  
  /**
   * Accessor function or key to get cell value
   */
  accessor: keyof T | ((item: T) => React.ReactNode);
  
  /**
   * Optional className for column
   */
  className?: string;
  
  /**
   * Hide column on mobile (when using table fallback)
   */
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  /**
   * Data array to render
   */
  data: T[];
  
  /**
   * Column definitions (used for desktop table)
   */
  columns: Column<T>[];
  
  /**
   * Mobile card renderer - how to display each item on mobile
   * This function receives an item and should return a Card content
   */
  mobileCardRenderer: (item: T, index: number) => React.ReactNode;
  
  /**
   * Optional click handler for rows/cards
   */
  onRowClick?: (item: T, index: number) => void;
  
  /**
   * Loading state
   */
  isLoading?: boolean;
  
  /**
   * Empty state message
   */
  emptyMessage?: string;
  
  /**
   * Additional className for container
   */
  className?: string;
}

/**
 * ResponsiveTable - Adaptive table/card layout
 * 
 * Desktop: Renders traditional table with columns
 * Mobile: Renders stacked cards using custom renderer
 * 
 * @example
 * ```tsx
 * <ResponsiveTable
 *   data={students}
 *   columns={[
 *     { header: "Nome", accessor: "name" },
 *     { header: "Turma", accessor: (s) => s.class.name }
 *   ]}
 *   mobileCardRenderer={(student) => (
 *     <CardContent>
 *       <h3>{student.name}</h3>
 *       <p>{student.class.name}</p>
 *     </CardContent>
 *   )}
 *   onRowClick={(student) => openEditModal(student)}
 * />
 * ```
 */
export function ResponsiveTable<T>({
  data,
  columns,
  mobileCardRenderer,
  onRowClick,
  isLoading = false,
  emptyMessage = "Nenhum registro encontrado",
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile view: Stacked cards
  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        {data.map((item, index) => (
          <Card
            key={index}
            className={cn(
              "glass-card transition-colors",
              onRowClick && "cursor-pointer hover:bg-accent/10"
            )}
            onClick={() => onRowClick?.(item, index)}
          >
            {mobileCardRenderer(item, index)}
          </Card>
        ))}
      </div>
    );
  }

  // Desktop view: Traditional table
  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead
                key={index}
                className={cn(
                  column.className,
                  column.hideOnMobile && "hidden sm:table-cell"
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, rowIndex) => (
            <TableRow
              key={rowIndex}
              className={cn(onRowClick && "cursor-pointer")}
              onClick={() => onRowClick?.(item, rowIndex)}
            >
              {columns.map((column, colIndex) => {
                const value =
                  typeof column.accessor === "function"
                    ? column.accessor(item)
                    : item[column.accessor];

                return (
                  <TableCell
                    key={colIndex}
                    className={cn(
                      column.className,
                      column.hideOnMobile && "hidden sm:table-cell"
                    )}
                  >
                    {value as React.ReactNode}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
