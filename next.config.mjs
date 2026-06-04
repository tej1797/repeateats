/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Serve the AASA file with correct content-type so iOS parses it
        source: '/.well-known/apple-app-site-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
};

export default nextConfig;
