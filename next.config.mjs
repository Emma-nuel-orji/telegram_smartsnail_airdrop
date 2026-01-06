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
          crypto: false,
          stream: false,
          buffer: false,
      };
      return config;
  },
  experimental: {
      serverActions: true,
  },
  env: {
      // Add any public environment variables here
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  }
};

export default nextConfig;