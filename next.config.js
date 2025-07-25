/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  transpilePackages: ['@xrpl-wallet-standard/core'],
}

module.exports = nextConfig