import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    experimental: {
        optimizePackageImports: ['lucide-react', '@radix-ui/react-label'],
        // Tell Next.js these are server-only packages
        serverComponentsExternalPackages: ['shamela', 'sql.js'],
    },
    reactStrictMode: true,

    // For Turbopack - mark these as external
    serverExternalPackages: ['shamela', 'sql.js'],
};

export default nextConfig;
