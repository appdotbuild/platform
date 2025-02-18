import { Metadata } from "next";
import { authOrLogin } from "@repo/auth";
import { Separator } from "@repo/design/shadcn/separator";
import ChatbotsTable from "./components/chatbots-table";
import { getAllChatbots } from "./actions";

export const metadata: Metadata = {
  title: "Chatbots",
  description: "Manage your organization's chatbots.",
};

export default async function ChatbotsPage() {
  const session = await authOrLogin();
  const { data: chatbots } = await getAllChatbots({});

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chatbots</h2>
          <p className="text-muted-foreground">Manage your organization's chatbots</p>
        </div>
        <div className="flex items-center space-x-2">
        </div>
      </div>
      <ChatbotsTable initialData={chatbots} />
    </>
  );
}
