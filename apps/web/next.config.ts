import type { NextConfig } from "next";

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
  webpack(config) {
    // Prevent bundling Node-only canvas in client-side bundle
    config.externals = [
      ...(config.externals || []),
      { canvas: "commonjs canvas" },
    ];
    return config;
  },
  // Ensure `canvas` stays server-only in Server Components
  serverExternalPackages: ["canvas"],
};

export default nextConfig;
