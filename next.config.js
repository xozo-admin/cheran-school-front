/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
  },
  swcMinify: true,      // SWC minifier must be enabled
  compiler: {
    removeConsole: true, // removes all console.* in production
  },
}

module.exports = nextConfig
