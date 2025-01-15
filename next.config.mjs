/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        domains: ['static.okx.com'], // Add other domains as needed
      },
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            crypto: false, // Handle crypto dependency
        };
        return config;
    }
};

export default nextConfig;
