/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // A DEX front-end talks to many chains/RPC endpoints and wallet relays,
    // so connect-src stays broad. Scripts and frames stay locked down.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-src https://*.walletconnect.com https://*.walletconnect.org https://verify.walletconnect.com https://verify.walletconnect.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  experimental: {
    // The wallet stack makes webpack builds memory-hungry; running the build
    // in the main process avoids the extra worker overhead on small runners.
    webpackBuildWorker: false,
    // Cut the webpack module graph on barrel-package imports.
    optimizePackageImports: ["lucide-react", "react-icons", "lodash"],
  },
  // Lint and typecheck run as dedicated CI steps (npm run lint / typecheck);
  // skipping them here keeps production builds within small-runner memory.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "green-dexifier.vercel.app",
        port: "",
        pathname: "/*",
      },
      {
        protocol: "https",
        hostname: "rango.vip",
        port: "",
        pathname: "/*/**",
      },
      {
        protocol: "https",
        hostname: "api.rango.exchange",
        port: "",
        pathname: "/*/**",
      },
      {
        protocol: "https",
        hostname: "exolix.com",
        port: "",
        pathname: "/*/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        port: "",
        pathname: "/*/**",
      },
    ],
    // Token icons from aggregators can be SVGs — serve them sandboxed so an
    // SVG can't run scripts in our origin.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
