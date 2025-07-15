import { useQuery } from '@tanstack/react-query';
import { getApp } from '../../../lib/api/apps';
import ViewCodeButton from '../../../components/view-code-button';
import { useParams } from 'react-router';

export function AppDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: app,
    isLoading: appLoading,
    error: appError,
  } = useQuery({
    queryKey: ['app', id],
    queryFn: () => getApp(id!),
    enabled: !!id,
  });

  if (appLoading) return <div>Loading...</div>;
  if (appError) return <div>Error loading app</div>;
  if (!app) return <div>App not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{app.name}</h1>
          <p className="text-muted-foreground">App ID: {app.id}</p>
        </div>
        <ViewCodeButton appId={id!} />
      </div>
    </div>
  );
}
