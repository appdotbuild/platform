import type { StorybookConfig } from "@storybook/nextjs";
import { glob } from "glob";

import { join, dirname, basename } from "path";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}

const apps = []; //glob.sync("../../apps/*");

const config: StorybookConfig = {
  stories: [
    {
      titlePrefix: "UI",
      directory: "../../design/",
      files: "**/*.stories.@(js|jsx|mjs|ts|tsx)",
    },
    { titlePrefix: "UI", directory: "../../design/", files: "**/*.mdx" },
    ...apps.map((app) => ({
      titlePrefix: basename(app),
      directory: "../" + app,
      files: "(app|components)/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    })),
  ],
  addons: [
    getAbsolutePath("@storybook/addon-onboarding"),
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-interactions"),
    getAbsolutePath("@storybook/addon-themes"),
  ],
  framework: {
    name: getAbsolutePath("@storybook/nextjs"),
    options: {
      appDirectory: true,
    },
  },
  staticDirs: ["../public", { from: "../../design/base/fonts", to: "/fonts" }],
};
export default config;
