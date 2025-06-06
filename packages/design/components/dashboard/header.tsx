import { useRouter } from 'next/navigation';

import Image from 'next/image';

export function DashboardHeader({ userMenu }: { userMenu: React.ReactNode }) {
  const router = useRouter();

  return (
    <header className="sticky z-50 top-0 flex h-16 items-center border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-3 flex-1">
        <Image
          src="/app-icon.svg"
          alt="App.Build Icon"
          width={48}
          height={48}
          className="inline-block mr-4"
        />
        <h1 className="text-3xl font-bold text-[#56A101]">App.Build Admin</h1>
      </div>
      <div className="ml-auto">{userMenu}</div>
    </header>
  );
}
