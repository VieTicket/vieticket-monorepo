import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Performance optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  // Image optimizations
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
  
  // Webpack optimizations
  webpack(config, { dev, isServer }) {
    // Prevent bundling Node-only canvas in client-side bundle
    config.externals = [
      ...(config.externals || []),
      { canvas: "commonjs canvas" },
    ];
    
    // Performance optimizations for production
    if (!dev && !isServer) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
      
      // Split chunks for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },
  
  // Ensure `canvas` stays server-only in Server Components
  serverExternalPackages: ["canvas"],
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'react-icons'],
  },
};

export default nextConfig;
