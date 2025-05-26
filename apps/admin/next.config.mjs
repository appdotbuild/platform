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
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard/apps',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
