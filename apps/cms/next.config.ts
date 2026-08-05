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
        destination: "/api/cms/site",
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
      {
        source: "/cms/login",
        destination: "/api/cms/login",
      },
      {
        source: "/cms/logout",
        destination: "/api/cms/logout",
      },
      {
        source: "/cms/session/refresh",
        destination: "/api/cms/session/refresh",
      },
      {
        source: "/cms/editor/save",
        destination: "/api/cms/editor/save",
      },
      {
        source: "/cms/editor/upload-image",
        destination: "/api/cms/editor/upload-image",
      },
      {
        source: "/cms/preview",
        destination: "/api/cms/preview",
      },
      {
        source: "/cms/site",
        destination: "/api/cms/site",
      },
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
