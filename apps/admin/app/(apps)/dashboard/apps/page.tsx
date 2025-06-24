import { Metadata } from 'next';
import AppsTable from './components/apps-table';
import { getAllApps, isNeonEmployee } from './actions';
import { Badge } from '@appdotbuild/design/shadcn/badge';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Apps',
  description: 'Manage generated apps.',
};

export default async function AppsPage() {
  const { data: apps, pagination } = await getAllApps({
    page: 1,
    pageSize: 10,
  });

  const isNeon = await isNeonEmployee();

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Apps</h2>
            {isNeon && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Admin Mode
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {isNeon
              ? 'Manage all organization apps (admin view)'
              : "Manage your organization's apps"}
          </p>
        </div>
        <div className="flex items-center space-x-2"></div>
      </div>
      <AppsTable initialData={apps} initialTotalCount={pagination.total} />
    </>
  );
}
