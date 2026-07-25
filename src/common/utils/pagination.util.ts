export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function calculatePaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit) || 0;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
