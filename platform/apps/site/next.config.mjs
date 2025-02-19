import("./env.mjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    tsconfigPath: "./tsconfig.build.json",
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
