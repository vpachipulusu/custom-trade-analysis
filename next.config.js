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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Completely ignore undici and async_hooks for client-side bundles
      config.plugins.push(
        new (require("webpack").IgnorePlugin)({
          resourceRegExp: /^(undici|async_hooks)$/,
        })
      );

      config.resolve.fallback = {
        ...config.resolve.fallback,
        undici: false,
        async_hooks: false,
        fs: false,
        net: false,
        tls: false,
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
