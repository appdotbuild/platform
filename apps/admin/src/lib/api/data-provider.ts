import type {
  CreateParams,
  CreateResult,
  DataProvider,
  DeleteManyParams,
  DeleteManyResult,
  DeleteParams,
  DeleteResult,
  GetListParams,
  GetListResult,
  GetManyParams,
  GetManyResult,
  GetManyReferenceParams,
  GetManyReferenceResult,
  GetOneParams,
  GetOneResult,
  UpdateManyParams,
  UpdateManyResult,
  UpdateParams,
  UpdateResult,
  RaRecord,
} from 'ra-core';
import type { App, Paginated } from '@appdotbuild/core/types/api';
import axios, { type AxiosInstance } from 'axios';
import { stackClientApp } from '../auth';

const PLATFORM_API_URL = import.meta.env.VITE_PLATFORM_API_URL;

// React-admin compatible App type with string dates
type AppRecord = Omit<App, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: PLATFORM_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const user = await stackClientApp.getUser();
    if (user) {
      const { accessToken } = await user.getAuthJson();
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      throw new Error('User not authenticated');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      throw new Error('User not authenticated');
    }
    if (error.response?.data?.message) {
      throw new Error(`API Error: ${error.response.data.message}`);
    }
    throw new Error(`API Error: ${error.message}`);
  },
);

// Helper function to convert App to AppRecord
function convertAppToRecord(app: App): AppRecord {
  return {
    ...app,
    createdAt: new Date(app.createdAt).toISOString(),
    updatedAt: new Date(app.updatedAt).toISOString(),
  };
}

// Resource-specific implementations
const resourceHandlers = {
  apps: {
    getList: async (
      params: GetListParams,
    ): Promise<GetListResult<AppRecord>> => {
      const { page, perPage } = params.pagination || { page: 1, perPage: 10 };
      const { field, order } = params.sort || {
        field: 'createdAt',
        order: 'DESC',
      };
      const { q: search } = params.filter || {};

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
        ...(search && { search }),
        ...(field && { sort: field }),
        ...(order && { order: order.toLowerCase() }),
      });

      const response = await apiClient.get<Paginated<App>>(
        `/admin/apps?${queryParams}`,
      );

      return {
        data: response.data.data.map(convertAppToRecord),
        total: response.data.pagination.total,
      };
    },

    getOne: async (params: GetOneParams): Promise<GetOneResult<AppRecord>> => {
      const response = await apiClient.get<App>(`/apps/${params.id}`);
      return {
        data: convertAppToRecord(response.data),
      };
    },

    getMany: async (
      params: GetManyParams,
    ): Promise<GetManyResult<AppRecord>> => {
      // For apps, we'll need to make individual requests since there's no bulk endpoint
      const responses = await Promise.all(
        params.ids.map((id) => apiClient.get<App>(`/apps/${id}`)),
      );

      return {
        data: responses.map((response) => convertAppToRecord(response.data)),
      };
    },

    getManyReference: async (
      params: GetManyReferenceParams,
    ): Promise<GetManyReferenceResult<AppRecord>> => {
      // For apps, we'll use the same as getList but with reference filtering
      const { page, perPage } = params.pagination || { page: 1, perPage: 10 };
      const { field, order } = params.sort || {
        field: 'createdAt',
        order: 'DESC',
      };
      const { q: search, ...otherFilters } = params.filter || {};

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
        ...(search && { search }),
        ...(field && { sort: field }),
        ...(order && { order: order.toLowerCase() }),
        [params.target]: params.id.toString(),
        ...Object.entries(otherFilters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = value.toString();
          }
          return acc;
        }, {} as Record<string, string>),
      });

      const response = await apiClient.get<Paginated<App>>(
        `/admin/apps?${queryParams}`,
      );

      return {
        data: response.data.data.map(convertAppToRecord),
        total: response.data.pagination.total,
      };
    },

    create: async (params: CreateParams): Promise<CreateResult<AppRecord>> => {
      const response = await apiClient.post<App>('/apps', params.data);
      return {
        data: convertAppToRecord(response.data),
      };
    },

    update: async (params: UpdateParams): Promise<UpdateResult<AppRecord>> => {
      const response = await apiClient.put<App>(
        `/apps/${params.id}`,
        params.data,
      );
      return {
        data: convertAppToRecord(response.data),
      };
    },

    updateMany: async (params: UpdateManyParams): Promise<UpdateManyResult> => {
      const responses = await Promise.all(
        params.ids.map((id) => apiClient.put<App>(`/apps/${id}`, params.data)),
      );

      return {
        data: responses.map((response: { data: App }) => response.data.id),
      };
    },

    delete: async (params: DeleteParams): Promise<DeleteResult<AppRecord>> => {
      const response = await apiClient.delete<App>(`/apps/${params.id}`);
      return {
        data: convertAppToRecord(response.data),
      };
    },

    deleteMany: async (params: DeleteManyParams): Promise<DeleteManyResult> => {
      await Promise.all(
        params.ids.map((id) => apiClient.delete(`/apps/${id}`)),
      );

      return {
        data: params.ids,
      };
    },
  },
};

// Main data provider implementation
export const dataProvider: DataProvider = {
  getList: async <RecordType extends RaRecord = any>(
    resource: string,
    params: GetListParams,
  ): Promise<GetListResult<RecordType>> => {
    const handler = resourceHandlers[resource as keyof typeof resourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${resource}`);
    }
    return handler.getList(params) as unknown as Promise<
      GetListResult<RecordType>
    >;
  },

  getOne: async <RecordType extends RaRecord = any>(
    resource: string,
    params: GetOneParams,
  ): Promise<GetOneResult<RecordType>> => {
    const handler = resourceHandlers[resource as keyof typeof resourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${resource}`);
    }
    return handler.getOne(params) as unknown as Promise<
      GetOneResult<RecordType>
    >;
  },

  getMany: async <RecordType extends RaRecord = any>(
    resource: string,
    params: GetManyParams,
  ): Promise<GetManyResult<RecordType>> => {
    const handler = resourceHandlers[resource as keyof typeof resourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${resource}`);
    }
    return handler.getMany(params) as unknown as Promise<
      GetManyResult<RecordType>
    >;
  },

  getManyReference: async <RecordType extends RaRecord = any>(
    resource: string,
    params: GetManyReferenceParams,
  ): Promise<GetManyReferenceResult<RecordType>> => {
    const handler = resourceHandlers[resource as keyof typeof resourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${resource}`);
    }
    return handler.getManyReference(params) as unknown as Promise<
      GetManyReferenceResult<RecordType>
    >;
  },

  create: async <RecordType extends RaRecord = any>(
    resource: string,
    params: CreateParams,
  ): Promise<CreateResult<RecordType>> => {
    const handler = resourceHandlers[resource as keyof typeof resourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${resource}`);
    }
    return handler.create(params) as unknown as Promise<
      CreateResult<RecordType>
    >;
  },

  update: async <RecordType extends RaRecord = any>(
    resource: string,
    params: UpdateParams,
  ): Promise<UpdateResult<RecordType>> => {
    const handler = resourceHandlers[resource as keyof typeof resourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${resource}`);
    }
    return handler.update(params) as unknown as Promise<
      UpdateResult<RecordType>
    >;
  },

  updateMany: async (
    resource: string,
    params: UpdateManyParams,
  ): Promise<UpdateManyResult> => {
    const handler = resourceHandlers[resource as keyof typeof resourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${resource}`);
    }
    return handler.updateMany(params);
  },

  delete: async <RecordType extends RaRecord = any>(
    resource: string,
    params: DeleteParams,
  ): Promise<DeleteResult<RecordType>> => {
    const handler = resourceHandlers[resource as keyof typeof resourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${resource}`);
    }
    return handler.delete(params) as unknown as Promise<
      DeleteResult<RecordType>
    >;
  },

  deleteMany: async (
    resource: string,
    params: DeleteManyParams,
  ): Promise<DeleteManyResult> => {
    const handler = resourceHandlers[resource as keyof typeof resourceHandlers];
    if (!handler) {
      throw new Error(`Unknown resource: ${resource}`);
    }
    return handler.deleteMany(params);
  },
};
