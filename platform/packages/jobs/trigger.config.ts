import { defineConfig } from "@trigger.dev/sdk/v3";
import { additionalPackages } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_qsecfvmnzukgmqwippof",
  runtime: "node",
  logLevel: "log",
  // Set the maxDuration to 300 seconds for all tasks. See https://trigger.dev/docs/runs/max-duration
  // maxDuration: 300,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },

  build: {
    external: [
      /* For Llamaindex */
      "@xenova/transformers",
      "tiktoken",
      "onnxruntime-node",
      "sharp",
      /* For dbScraping */
      "canvas",
      "@crawlee/jsdom",
      "@crawlee/playwright",
      "jquery",
      /* For logging */
      "pino",
      "pino-pretty",
    ],
  },
  dirs: ["tasks/"],
});
