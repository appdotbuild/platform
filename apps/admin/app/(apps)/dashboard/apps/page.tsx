import { Metadata } from 'next';
import AppsTable from './components/apps-table';
import { getAllApps } from './actions';

export const metadata: Metadata = {
  title: 'Apps',
  description: 'Manage generated apps.',
};

export default async function AppsPage() {
  const { data: apps, pagination } = await getAllApps({
    page: 1,
    pageSize: 10,
  });

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Apps</h2>
          <p className="text-muted-foreground">
            Manage your organization&apos;s apps
          </p>
        </div>
        <div className="flex items-center space-x-2"></div>
      </div>
      <AppsTable initialData={apps} initialTotalCount={pagination.total} />
    </>
  );
}
