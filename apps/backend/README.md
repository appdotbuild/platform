# platform

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.26. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Deployment

1. Create a `fly.toml` file in the root of the `/platform` directory - ask for the config file from the team.
2. Run `fly deploy` to deploy the backend.
