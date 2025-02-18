import React from "react";
import { authOrLogin } from "@repo/auth";
import db from "@repo/db";
import { and, eq } from "@repo/db/drizzle";
import { chatbots } from "@repo/db/schema";
import {
  ArrowLeft,
  Calendar,
  User,
  Settings,
  Bot,
} from "@repo/design/base/icons";
import { Button } from "@repo/design/shadcn/button";
import { Card, CardContent } from "@repo/design/shadcn/card";
import Link from "next/link";
import { notFound } from "next/navigation";

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default async function ChatbotDetailPage({ params }: { params: { id: string } }) {
  const session = await authOrLogin();
  const { id } = params;

  // Fetch chatbot details
  const chatbot = await db
    .select()
    .from(chatbots)
    .where(eq(chatbots.id, id))
    .limit(1)
    .then(rows => rows[0]);

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
            <h2 className="text-2xl font-bold tracking-tight">
              {chatbot.name}
            </h2>
          </div>
          <p className="text-muted-foreground">View and manage chatbot details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/chatbots/${id}/settings`}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created
                </div>
                <div className="font-medium">
                  {chatbot.createdAt?.toLocaleString()}
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Owner ID
                </div>
                <div className="font-medium">{chatbot.ownerId}</div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Telegram Bot
                </div>
                <div className="font-medium">
                  {chatbot.telegramBotToken ? "Configured" : "Not configured"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {chatbot.flyAppId && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Deployment</h3>
                  <p className="text-sm text-muted-foreground">
                    Fly.io App ID: {chatbot.flyAppId}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
