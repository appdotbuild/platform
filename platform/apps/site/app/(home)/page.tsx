import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bot New",
  description: "Your chatbot generating bot",
};

export default async function Home() {
  return (
    <div className="container mx-auto py-12 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Bot.New!</h1>
      </div>
    </div>
  );
}
