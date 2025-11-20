// Validate environment variables on build
if (process.env.NODE_ENV !== "development") {
  try {
    const { validateEnv } = require("./lib/utils/validateEnv");
    validateEnv();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Completely ignore server-only modules for client-side bundles
      config.plugins.push(
        new (require("webpack").IgnorePlugin)({
          resourceRegExp: /^(undici|async_hooks)$/,
        })
      );

      // Ignore winston and colors for client-side
      config.plugins.push(
        new (require("webpack").IgnorePlugin)({
          resourceRegExp: /^(winston|@colors\/colors)$/,
        })
      );

      config.resolve.fallback = {
        ...config.resolve.fallback,
        undici: false,
        async_hooks: false,
        fs: false,
        net: false,
        tls: false,
        os: false,
        path: false,
        stream: false,
        util: false,
        crypto: false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.chart-img.com",
      },
      {
        protocol: "https",
        hostname: "chart-img.com",
      },
    ],
  },
  async headers() {
    return [
      // Security headers for all routes
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
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
      // Cache static assets
      {
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache images for 1 day
      {
        source: "/:path*.{jpg,jpeg,png,gif,webp,svg,ico}",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, must-revalidate",
          },
        ],
      },
    ];
  },
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
