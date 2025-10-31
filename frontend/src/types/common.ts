/**
 * Common shared types
 */

export interface BaseProps {
  testID?: string;
}

export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
