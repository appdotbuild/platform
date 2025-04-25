import type { Config } from "tailwindcss";
import baseConfig from "@appdotbuild/design/tailwind.config";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/design/base/**/*.{ts,tsx}",
    "../../packages/design/components/**/*.{ts,tsx}",
    "../../packages/design/hooks/**/*.{ts,tsx}",
    "../../packages/design/lib/**/*.{ts,tsx}",
    "../../packages/design/shadcn/**/*.{ts,tsx}",
  ],
  presets: [baseConfig],
} satisfies Config as any;
