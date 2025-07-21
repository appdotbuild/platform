import type { Paginated } from '@appdotbuild/core';
import {
  asc,
  desc,
  getTableColumns,
  ilike,
  or,
  sql,
  type SQLWrapper,
  and,
  type SQL,
} from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PgTable } from 'drizzle-orm/pg-core';
import { db } from '../db';

export interface PaginationParams {
  limit?: number;
  page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  [key: string]: unknown;
}

export interface PaginationConfig<T extends PgTable> {
  table: T;
  searchFields?: Array<keyof T['_']['columns']>;
  excludeColumns?: Array<keyof T['_']['columns']>;
  additionalFilters?: (params: PaginationParams) => SQL | undefined;
  maxLimit?: number;
}

export async function createPaginatedResponse<T extends PgTable>(
  request: FastifyRequest,
  reply: FastifyReply,
  config: PaginationConfig<T>,
): Promise<Paginated<any>> {
  const {
    limit = 10,
    page = 1,
    sort = 'createdAt',
    order = 'desc',
    search = '',
    ...additionalParams
  } = request.query as PaginationParams;

  const maxLimit = config.maxLimit || 100;

  if (limit > maxLimit) {
    return reply.status(400).send({
      error: `Limit cannot exceed ${maxLimit}`,
    });
  }

  const pagesize = Math.min(Math.max(1, Number(limit)), maxLimit);
  const pageNum = Math.max(1, Number(page));
  const offset = (pageNum - 1) * pagesize;

  // Handle sorting
  const sortBy = config.table[sort as keyof typeof config.table] as SQLWrapper;
  const orderBy = order.toUpperCase() === 'ASC' ? asc(sortBy) : desc(sortBy);

  // Get columns (excluding specified ones)
  const allColumns = getTableColumns(config.table);
  const columns = config.excludeColumns
    ? Object.fromEntries(
        Object.entries(allColumns).filter(
          ([key]) => !config.excludeColumns!.includes(key as any),
        ),
      )
    : allColumns;

  // Build filter conditions
  const filterConditions: (SQL | undefined)[] = [];

  // Add search conditions
  if (search.trim() && config.searchFields && config.searchFields.length > 0) {
    const searchTerm = `%${search.trim()}%`;
    const searchConditions = config.searchFields.map((field) => {
      const column = (config.table as any)[field as string];
      return ilike(column, searchTerm);
    });

    filterConditions.push(or(...searchConditions));
  }

  // Add additional filters
  if (config.additionalFilters) {
    const additionalFilter = config.additionalFilters({
      limit,
      page,
      sort,
      order,
      search,
      ...additionalParams,
    });
    if (additionalFilter) {
      filterConditions.push(additionalFilter);
    }
  }

  // Execute queries
  const whereClause =
    filterConditions.length > 0 ? and(...filterConditions) : undefined;

  const countQuery = db
    .select({ count: sql`count(*)` })
    .from(config.table as any)
    .where(whereClause);

  const dataQuery = db
    .select(columns)
    .from(config.table as any)
    .orderBy(orderBy)
    .limit(pagesize)
    .offset(offset)
    .where(whereClause);

  const [countResult, dataList] = await Promise.all([countQuery, dataQuery]);
  const totalCount = Number(countResult[0]?.count || 0);

  return {
    data: dataList,
    pagination: {
      total: totalCount,
      page: pageNum,
      limit: pagesize,
      totalPages: Math.ceil(totalCount / pagesize),
    },
  };
}
