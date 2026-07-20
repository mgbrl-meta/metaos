import { useMemo, useState, useCallback } from "react";

interface UsePaginationOptions {
  pageSize?: number;
}

export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
) {
  const { pageSize = 50 } = options;
  const [page, setPage] = useState(1);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, page, pageSize]);

  const totalPages = Math.ceil(items.length / pageSize);

  const nextPage = useCallback(() => {
    setPage(p => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage(p => Math.max(1, p - 1));
  }, []);

  const goToPage = useCallback((pageNum: number) => {
    const validPage = Math.max(1, Math.min(pageNum, totalPages));
    setPage(validPage);
  }, [totalPages]);

  return {
    paginatedItems,
    page,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    totalItems: items.length,
    startIndex: (page - 1) * pageSize,
    endIndex: Math.min(page * pageSize, items.length),
  };
}
