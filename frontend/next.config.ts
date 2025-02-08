import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config, { isServer }) {
    // Workaround for canvas module
    if (!isServer) {
      config.node = {
        fs: 'empty',  // Fix for fs module missing in client-side
        canvas: 'empty',  // Add canvas empty stub in client-side
      };
    }
    return config;
  },
};

export default nextConfig;
