import { prepareRelease } from './prepare-release';

async function build() {
  await Bun.build({
    entrypoints: ['./src/cli.tsx', './src/entrypoint.ts'],
    outdir: './tmp/dist',
    target: 'node',
    define: {
      'process.env.PUBLIC_STACK_PROJECT_ID': JSON.stringify(
        process.env.PUBLIC_STACK_PROJECT_ID!,
      ),
      'process.env.PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY': JSON.stringify(
        process.env.PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
      ),
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  });
}

build()
  .then(prepareRelease)
  .then(() => {
    console.log('Build successful');
  })
  .catch(console.error);
