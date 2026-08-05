import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["ssh2-sftp-client", "ssh2", "cpu-features", "bcrypt-pbkdf"],
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/site-dist/index.html",
      },
      {
        source: "/assets/:path*",
        destination: "/site-dist/assets/:path*",
      },
      {
        source: "/logodark.webp",
        destination: "/site-dist/logodark.webp",
      },
      {
        source: "/tailwind-browser.js",
        destination: "/site-dist/tailwind-browser.js",
      },
    ];
  },
};

export default nextConfig;
