import { ArrowLeft, Calendar, User, ExternalLink } from "@repo/design/base/icons";
import { ShowHide } from "@repo/design/components/show-hide/show-hide";
import { Button } from "@repo/design/shadcn/button";
import { Card, CardContent } from "@repo/design/shadcn/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design/shadcn/tabs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChatbot } from "../actions";
import ViewCodeButton from "../components/view-code-button";
import CodeViewer from "../components/code-viewer";

export default async function ChatbotPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const chatbot = await getChatbot(id);

  if (!chatbot) {
    notFound();
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild className="h-8 w-8">
              <Link href="/dashboard/chatbots">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h2 className="text-2xl font-bold tracking-tight truncate max-w-[300px]">{chatbot.name}</h2>
          </div>
          <p className="text-muted-foreground">View and manage chatbot details</p>
        </div>
        <div className="flex items-center gap-2">
          {chatbot.flyAppId && (
            <>
              <Button variant="outline" asChild className="gap-2">
                <a
                  href={`https://fly-metrics.net/d/fly-logs/fly-logs?orgId=851271&var-app=${chatbot.flyAppId}`}
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
          <TabsTrigger value="editor">Editor</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Chatbot Details</h3>
                  <ShowHide content={chatbot.name} className="text-sm text-muted-foreground" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created
                    </div>
                    <div className="font-medium">{new Date(chatbot.createdAt)?.toLocaleString()}</div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Owner ID
                    </div>
                    <div className="font-medium">{chatbot.ownerId}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment" className="space-y-4">
          {chatbot.flyAppId ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Deployment</h3>
                    <p className="text-sm text-muted-foreground">Fly.io App ID: {chatbot.flyAppId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No deployment information available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="editor" className="space-y-4 flex-1 min-h-0">
          <Card className="flex-1">
            <CardContent className="pt-6 h-full">
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Code Editor</h3>
                  <ViewCodeButton chatbotId={id} />
                </div>
                <div className="flex-1 min-h-0">
                  <CodeViewer chatbotId={id} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
