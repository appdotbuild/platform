import {
  ArrowLeft,
  Calendar,
  User,
  ExternalLink,
  Github,
  Globe,
} from '@appdotbuild/design/base/icons';
import { ShowHide } from '@appdotbuild/design/components/show-hide/show-hide';
import { Button } from '@appdotbuild/design/shadcn/button';
import { Card, CardContent } from '@appdotbuild/design/shadcn/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@appdotbuild/design/shadcn/tabs';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApp } from '../actions';
import ViewCodeButton from '../components/view-code-button';
import CodeViewer from '../components/code-viewer';

export default async function AppPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const app = await getApp(id);

  if (!app) {
    notFound();
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild className="h-8 w-8">
              <Link href="/dashboard/apps">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h2 className="text-2xl font-bold tracking-tight truncate max-w-[300px]">
              {app.name}
            </h2>
          </div>
          <p className="text-muted-foreground">View and manage app details</p>
        </div>
        <div className="flex items-center gap-2">
          {app.flyAppId && (
            <>
              <Button variant="outline" asChild className="gap-2">
                <a
                  href={`https://fly-metrics.net/d/fly-logs/fly-logs?orgId=851271&var-app=${app.flyAppId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Logs <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <a
                  href={`https://cloud.langfuse.com/project/cm6j91sap009ux891llzvdjvi/traces`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Traces <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">App Details</h3>
                  <ShowHide
                    content={app.name}
                    className="text-sm text-muted-foreground"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created
                    </div>
                    <div className="font-medium">
                      {new Date(app.createdAt)?.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Owner ID
                    </div>
                    <div className="font-medium">{app.ownerId}</div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub Repository
                    </div>
                    <div className="font-medium">
                      {app.repositoryUrl || 'Not available'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Deployment URL
                  </div>
                  <div className="font-medium">
                    {app.appUrl ? (
                      <a
                        href={app.appUrl}
                        className="text-primary hover:underline"
                      >
                        {app.appUrl}
                      </a>
                    ) : (
                      'Not available'
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment" className="space-y-4">
          {app.flyAppId ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Deployment</h3>
                    <p className="text-sm text-muted-foreground">
                      Fly.io App ID: {app.flyAppId}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  No deployment information available
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
