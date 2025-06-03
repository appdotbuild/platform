import { useMemo } from 'react';
import { Static } from 'ink';
import { Banner } from './ui/Banner';

export function WelcomeBanner() {
  const bannerContent = useMemo(
    () => [
      {
        id: 'app-banner',
        title: 'Welcome to app.build CLI',
        subtitle: 'Create, deploy, and manage your applications with ease',
      },
    ],
    [],
  );

  return (
    <Static items={bannerContent}>
      {(item) => (
        <Banner key={item.id} title={item.title}>
          {item.subtitle}
        </Banner>
      )}
    </Static>
  );
}
