import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    unoptimized: !isProduction,
    // loader: 'custom',
    // loaderFile: './src/lib/image-loader.ts',
    remotePatterns: isProduction
      ? [
          { protocol: "https", hostname: "**.luxerent.shop" },
          { protocol: "https", hostname: "luxerent.shop" },
          {
            protocol: "https",
            hostname: "res.cloudinary.com",
          },
        ]
      : [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: 4 * 1024 * 1024,
    },
  },
  // Ensure `canvas` stays server-only in Server Components
  serverExternalPackages: ["canvas", "jsdom"],
  allowedDevOrigins: ["**.lo.vtk.io.vn", "lo.vtk.io.vn"],
};

export default withNextIntl(nextConfig);
