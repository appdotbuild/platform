import type { Config } from "tailwindcss";
import baseConfig from "@appdotbuild/design/tailwind.config";

export default {
  darkMode: ["class"],
  content: [
    // Local components:
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",

    // Design library:
    "../design/base/**/*.{js,ts,jsx,tsx,mdx}",
    "../design/components/**/*.{js,ts,jsx,tsx,mdx}",
    "../design/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "../design/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "../design/shadcn/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  presets: [baseConfig],
} satisfies Config;
