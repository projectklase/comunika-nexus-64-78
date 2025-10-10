import { useState, useMemo } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
}

export function usePagination<T>(
  items: T[],
  initialPageSize: number = 20
): PaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, page, pageSize]);

  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const goToPage = (newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    setPage(validPage);
  };

  const nextPage = () => {
    if (hasNext) {
      setPage(page + 1);
    }
  };

  const prevPage = () => {
    if (hasPrev) {
      setPage(page - 1);
    }
  };

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setPage(1); // Reset to first page when changing page size
  };

  return {
    items: paginatedItems,
    page,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasPrev,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: handleSetPageSize
  };
}

// Hook para paginação com dados do Supabase
export function useSupabasePagination(initialPageSize: number = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / pageSize);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  // Calculate range for Supabase query
  const getRange = () => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    return { start, end };
  };

  const goToPage = (newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages || 1));
    setPage(validPage);
  };

  const nextPage = () => {
    if (hasNext) {
      setPage(page + 1);
    }
  };

  const prevPage = () => {
    if (hasPrev) {
      setPage(page - 1);
    }
  };

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasPrev,
    getRange,
    setTotal,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: handleSetPageSize
  };
}
