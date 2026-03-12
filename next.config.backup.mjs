/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    experimental: {
        serverActions: true
    },
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            crypto: false,  // Handle crypto dependency
        };
        return config;
    }
};

module.exports = nextConfig;