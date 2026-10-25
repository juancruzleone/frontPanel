export interface PageQuery {
  page: number
  limit: number
  search: string
}

export interface PaginationMetadata {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ServerPage<T> {
  data: T[]
  pagination: PaginationMetadata
}
