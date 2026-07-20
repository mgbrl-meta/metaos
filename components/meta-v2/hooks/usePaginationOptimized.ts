import { useState, useCallback, useMemo } from 'react';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function usePaginationOptimized<T>(
  items: T[],
  pageSize = 50
) {
  const [currentPage, setCurrentPage] = useState(1);

  const paginationState = useMemo<PaginationState>(() => {
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const page = Math.min(Math.max(1, currentPage), totalPages || 1);

    return {
      currentPage: page,
      pageSize,
      totalItems: total,
      totalPages: totalPages || 1,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }, [items.length, pageSize, currentPage]);

  const paginatedItems = useMemo(() => {
    const start = (paginationState.currentPage - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, pageSize, paginationState.currentPage]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page));
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  return {
    paginationState,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
  };
}
