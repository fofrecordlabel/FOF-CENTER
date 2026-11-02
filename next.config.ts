import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  async redirects() {
    return [{ source: "/finance", destination: "/catalog", permanent: false }];
  },
  serverExternalPackages: ["node:sqlite"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      const current = config.externals;
      const mark = "node:sqlite";
      if (Array.isArray(current)) {
        current.push(mark);
      } else if (current) {
        config.externals = [current, mark];
      } else {
        config.externals = [mark];
      }
    }
    return config;
  },
};

export default nextConfig;
