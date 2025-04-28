import { StackHandler } from '@stackframe/stack';
import { stackServerApp } from '@appdotbuild/auth';

export default function Handler(props: unknown) {
  return <StackHandler fullPage app={stackServerApp} routeProps={props} />;
}
