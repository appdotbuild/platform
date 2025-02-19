"use client";

import { Button } from "@repo/design/shadcn/button";
import { Download, FileSearch2 } from "lucide-react";
import { useState } from "react";
import { getChatbotReadUrl } from "../actions";

interface ViewCodeButtonProps {
  chatbotId: string;
}

export default function ViewCodeButton({ chatbotId }: ViewCodeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleViewCode = async () => {
    setIsLoading(true);
    try {
      const { readUrl } = await getChatbotReadUrl(chatbotId);
      window.open(readUrl, "_blank");
    } catch (error) {
      console.error("Failed to get read URL:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleViewCode} disabled={isLoading}>
      <Download className="h-4 w-4 mr-2" />
      {isLoading ? "Loading..." : "Download"}
    </Button>
  );
}
