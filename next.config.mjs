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
        stream: false,  // Example, handle Node.js streams if needed
        buffer: false,  // Example, handle buffer if needed
      };
      return config;
    },
  };
  
  export default nextConfig;
  