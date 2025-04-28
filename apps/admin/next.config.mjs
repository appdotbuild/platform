/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    tsconfigPath: './tsconfig.build.json',
    ignoreBuildErrors: true,
  },
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
