// @ts-check
/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  poweredByHeader: false,
  reactStrictMode: true,
  webpack(config, { dev }) {
    // Hostinger builds from a fresh checkout, so a persistent webpack cache only
    // consumes the limited build volume without speeding up later deployments.
    if (!dev) {
      config.cache = false;
    }

    return config;
  },
  async headers() {
    return [
      {
        source:
          "/:path(admin|login|account|cart|checkout|orders|request|api)/:rest*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
  experimental: {
    authInterrupts: true,
    // Bound build-time workers on memory-limited development and hosting machines.
    cpus: 2,
  },
};

export default nextConfig;
