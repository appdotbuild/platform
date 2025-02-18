import { CircleUser } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@repo/design/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design/shadcn/dropdown-menu";
import Image from "next/image";

export function DashboardHeader({ signOut }: { signOut: () => Promise<void> }) {
  const router = useRouter();

  return (
    <header className="sticky z-50 top-0 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      <Image
        src="/favicon.ico"
        alt="Bot"
        width={0}
        height={0}
        className="inline-block w-8 h-8 align-text-bottom mb-[-1px]"
      />
      <h1 className="text-2xl font-bold text-[#56A101]">Chatbots</h1>
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <CircleUser className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/user/profile")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
