import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    experimental: { optimizePackageImports: ['lucide-react', '@radix-ui/react-label'] },
    reactStrictMode: true,
    typedRoutes: true,
};

export default nextConfig;
