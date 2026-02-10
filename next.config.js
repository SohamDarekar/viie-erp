/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Disable image optimization for self-hosted deployment
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
