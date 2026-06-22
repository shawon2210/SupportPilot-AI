/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:8000/api/v1/:path*",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.vercel.app https://*.vercel-scripts.com https://accounts.google.com https://*.google.com https://*.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com https://*.google.com https://*.gstatic.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://*.gstatic.com",
              "connect-src 'self' https://*.vercel.app http://localhost:8000 http://localhost:3000 wss://*.vercel.app https://accounts.google.com https://*.google.com https://*.gstatic.com https://*.googleapis.com",
              "frame-src 'self' https://accounts.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          {
            key: "X-Content-Security-Policy",
            value: "block-all-mixed-content",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
