import { useUser } from '@stackframe/react';
import { createLazyRoute } from '@tanstack/react-router';
import { AuthenticatedHome } from './authenticated-home';
import { PublicHome } from './public-home';

export const HomePageRoute = createLazyRoute('/')({
  component: HomePage,
});

export function HomePage() {
  const user = useUser();

  return user ? <AuthenticatedHome /> : <PublicHome />;
}
