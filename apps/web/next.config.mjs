/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    return [{ source: '/api/:path*', destination: `${api}/:path*` }];
  },
};

export default nextConfig;
