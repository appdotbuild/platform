import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getAllApps } from '../../../lib/api/apps';
import AppsTable from '../../../components/apps-table';

function AppsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['apps', { page: 1, pageSize: 10 }],
    queryFn: () => getAllApps({ page: 1, pageSize: 10 }),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading apps</div>;
  if (!data) return <div>No data</div>;

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Apps</h2>
          <p className="text-muted-foreground">
            Manage all organization apps (admin view)
          </p>
        </div>
        <div className="flex items-center space-x-2"></div>
      </div>
      <AppsTable
        initialData={data.data}
        initialTotalCount={data.pagination.total}
      />
    </>
  );
}

export const Route = createFileRoute('/dashboard/apps/')({
  component: AppsPage,
});
