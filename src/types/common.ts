/** Paginated API response wrapper */
type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

type SortDirection = 'asc' | 'desc';

type SortConfig = {
  field: string;
  direction: SortDirection;
};

type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'starts_with'
  | 'in'
  | 'between';

type FilterConfig = {
  field: string;
  operator: FilterOperator;
  value: unknown;
};

type DateRange = {
  from: string;
  to: string;
};

/**
 * Represents a monetary value in the base currency (USD).
 * Stored as a number; consumers should apply formatting/rounding at the display layer.
 */
type Currency = number;

/**
 * Represents a percentage value as a decimal (e.g., 0.05 = 5%).
 * Functions expecting display-ready percentages should document that separately.
 */
type Percentage = number;

type ApiError = {
  code: string;
  message: string;
};

export type {
  PaginatedResponse,
  SortDirection,
  SortConfig,
  FilterOperator,
  FilterConfig,
  DateRange,
  Currency,
  Percentage,
  ApiError,
};
