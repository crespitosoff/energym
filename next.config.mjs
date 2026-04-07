/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Optimize for Vercel serverless
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig