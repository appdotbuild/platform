import { ArrowRight, MessageSquare } from '@appdotbuild/design/base/icons';
import { Button } from '@appdotbuild/design/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@appdotbuild/design/shadcn/card';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'App.build Admin',
  description: 'App.build Admin',
  icons: {
    icon: [
      {
        url: '/app-icon.svg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/app-icon.svg',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  },
};

const sections = [
  {
    title: 'Apps',
    description: 'Get the apps list',
    href: '/dashboard/apps',
    icon: MessageSquare,
    secondary: false,
  },
];

export default async function Home() {
  return (
    <div className="container mx-auto py-12 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to App.Build Admin!</h1>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.href}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={section.href}>
                  <Button
                    className="w-full"
                    variant={section.secondary ? 'secondary' : 'default'}
                  >
                    Go to {section.title}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
