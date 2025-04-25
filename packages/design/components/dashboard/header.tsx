import { useRouter } from 'next/navigation';

import Image from 'next/image';

export function DashboardHeader({ userMenu }: { userMenu: React.ReactNode }) {
  const router = useRouter();

  return (
    <header className="sticky z-50 top-0 flex h-16 items-center border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-3 flex-1">
        <Image
          src="/favicon.ico"
          alt="Bot"
          width={0}
          height={0}
          className="inline-block w-8 h-8 mr-4"
        />
        <h1 className="text-3xl font-bold text-[#56A101]">
          Neon Chatbots Admin
        </h1>
      </div>
      <div className="ml-auto">{userMenu}</div>
    </header>
  );
}
