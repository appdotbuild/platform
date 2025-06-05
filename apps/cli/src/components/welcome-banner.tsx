import { Static } from 'ink';
import { Banner } from './ui/Banner';

export function WelcomeBanner() {
  return (
    <Static items={['banner']}>
      {() => (
        <Banner key="banner" title="Welcome to app.build CLI">
          Create, deploy, and manage your applications with ease
        </Banner>
      )}
    </Static>
  );
}
