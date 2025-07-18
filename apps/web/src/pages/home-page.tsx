import { AuthenticatedHome } from './home/authenticated-home';
import { PublicHome } from './home/public-home';
import { useUser } from '@stackframe/react';
import { createLazyRoute } from '@tanstack/react-router';

export const HomePageRoute = createLazyRoute('/')({
  component: HomePage,
});

export function HomePage() {
  const user = useUser();
  if (user) {
    return <AuthenticatedHome />;
  }

  return <PublicHome />;
}
