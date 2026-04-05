/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Optimized for Render/Docker
  images: {
    domains: ["images.unsplash.com"],
  },
};

module.exports = nextConfig;
