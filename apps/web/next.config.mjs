/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployments.
  // Produces .next/standalone/ with a minimal self-contained Node.js server.
  output: 'standalone',
}

export default nextConfig
