import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, MessageSquare } from '@appdotbuild/design/base/icons';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const sections = [
  {
    title: 'Apps',
    description: 'Get the apps list',
    href: '/dashboard/apps',
    icon: MessageSquare,
    secondary: false,
  },
];

function HomePage() {
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
                <Link to={section.href}>
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

export const Route = createFileRoute('/')({
  component: HomePage,
});
