import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx", "pdf-parse"],
  experimental: {
    // Allow uploads up to 25MB (matches client-side FileUpload maxSizeMB)
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
