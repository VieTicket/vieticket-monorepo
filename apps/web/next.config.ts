import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: 4 * 1024 * 1024,
    },
  },
  allowedDevOrigins: ["**.lo.vtk.io.vn", "lo.vtk.io.vn"],
};

export default withNextIntl(nextConfig);
