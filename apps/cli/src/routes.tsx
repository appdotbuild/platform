import {
  createSearchParams,
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
  type URLSearchParamsInit,
} from 'react-router';
import queryString from 'query-string';
import { AppHomeScreen } from './app/app-home-screen.js';
import { CreateAppScreen } from './app/create-app-screen.js';
import { AppsListScreen } from './app/apps-list-screen.js';
import { AppDetails } from './app/app-details.js';
import { z, ZodObject, ZodType } from 'zod';
import {
  steps as appSteps,
  type StepType as AppStepType,
} from './app/steps/steps.js';
import { useCallback, useMemo } from 'react';
import { ShortcutHints } from './components/ui/shortcut-hints.js';
import { AppBuildScreen } from './app/app-build-screen.js';

export type RoutePath = RouterDefinition[number]['path'];
type RouterDefinition = typeof ROUTES_DEFINITIONS;

type RouteType = {
  path: string;
  element: React.ReactNode;
  searchParams?: Record<string, ZodType>;
};

type RouteDefinition<T extends RoutePath> = Extract<
  RouterDefinition[number],
  { path: T }
>;

type RouteWithSearchParams<T extends RoutePath> = Extract<
  RouteDefinition<T>,
  { searchParams: any }
>;

type SearchParamsObject<T extends RoutePath> = z.infer<
  ZodObject<RouteWithSearchParams<T>['searchParams']>
>;

type ExtractRouteParams<
  T extends string,
  RouteParams extends Array<any> = [],
> = T extends `${string}/:${infer Param}/${infer Rest}`
  ? // string/:orgID/string
    [...RouteParams, Param, ...ExtractRouteParams<Rest>]
  : // string/:workspaceID | :workspaceID
  T extends `${string}:${infer Param2}`
  ? [...RouteParams, Param2]
  : RouteParams;

type RouteParams<T extends RoutePath> = Record<
  ExtractRouteParams<T>[number],
  string
>;

const ROUTES_DEFINITIONS = [
  {
    path: '/' as const,
    element: <AppHomeScreen />,
  },
  {
    // TODO: let's remove this once we have a proper AppBuild screen
    path: '/app/create' as const,
    element: <CreateAppScreen />,
    searchParams: {
      step: z
        .enum(Object.keys(appSteps) as [AppStepType, ...AppStepType[]])
        .default('environment'),
      appId: z.string().optional(),
    },
  },
  {
    path: '/app/build' as const,
    element: <AppBuildScreen />,
    searchParams: {
      step: z
        .enum(Object.keys(appSteps) as [AppStepType, ...AppStepType[]])
        .default('environment'),
      appId: z.string().optional(),
    },
  },
  {
    path: '/apps' as const,
    element: <AppsListScreen />,
  },
  {
    path: '/apps/:appId' as const,
    element: <AppDetails />,
  },
] satisfies Array<RouteType>;

export function useSafeNavigate() {
  const navigate = useNavigate();

  const safeNavigate = useCallback(
    <T extends RoutePath>({
      path,
      params,
      searchParams,
    }: {
      path: T;
      params?: RouteParams<T>;
      searchParams?: SearchParamsObject<T>;
    }) => {
      const pathWithParams = path.replace(
        /:(\w+)/g,

        // @ts-expect-error - not worth it to fix
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (match, param) => params?.[param] ?? match,
      );

      void navigate({
        pathname: pathWithParams,
        search: searchParams
          ? createSearchParams(searchParams as URLSearchParamsInit).toString()
          : undefined,
      });
    },
    [navigate],
  );

  const goBack = useCallback(() => {
    void navigate(-1);
  }, [navigate]);

  return { safeNavigate, goBack };
}

export function getRouteSearchParams<T extends RoutePath>(
  routePath: T,
): RouteWithSearchParams<T>['searchParams'] {
  const route = ROUTES_DEFINITIONS.find(
    (routeInfo): routeInfo is RouteWithSearchParams<T> =>
      routeInfo.path === routePath && 'searchParams' in routeInfo,
  );

  if (!route) {
    throw new Error(
      'Invalid route or route does not have search params defined',
    );
  }

  return route.searchParams;
}

function cleanupSearchParams(searchParams: Record<string, unknown>) {
  return Object.entries(searchParams).reduce((acc, [key, value]) => {
    if (value === undefined || value === '') {
      return acc;
    }

    return { ...acc, [key]: value };
  }, {});
}

export function useSafeSearchParams<T extends RoutePath>(route: T) {
  const [URLsearchParams, setURLSearchParams] = useSearchParams();

  const safeSearchParams = useMemo(() => {
    const routeDefinitionSearchParams = getRouteSearchParams(route);

    return z
      .object(routeDefinitionSearchParams)
      .parse(Object.fromEntries(URLsearchParams));
  }, [route, URLsearchParams]);

  const setSafeSearchParams = useCallback(
    (
      searchParamsArg:
        | SearchParamsObject<T>
        | ((currentParams: SearchParamsObject<T>) => SearchParamsObject<T>),
    ) => {
      let searchParamsObj: SearchParamsObject<T>;
      if (typeof searchParamsArg === 'function') {
        searchParamsObj = searchParamsArg(safeSearchParams);
      } else {
        searchParamsObj = searchParamsArg;
      }

      const cleanSearchParams = cleanupSearchParams(searchParamsObj);
      setURLSearchParams(queryString.stringify(cleanSearchParams));
    },
    [safeSearchParams, setURLSearchParams],
  );

  return [safeSearchParams, setSafeSearchParams] as const;
}

// just for type inference
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useRouteParams<T extends RoutePath>(_route: T) {
  return useParams<RouteParams<T>>();
}

export function AppRouter() {
  return (
    <MemoryRouter>
      <Routes>
        {ROUTES_DEFINITIONS.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
      </Routes>
      <ShortcutHints />
    </MemoryRouter>
  );
}
