import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  outputFileTracingIncludes: {
    "/api/chat": ["./src/lib/app-builder/sandbox/agent-runner.mjs"],
    "/api/projects/[projectId]/provision": [
      "./src/lib/app-builder/sandbox/agent-runner.mjs",
    ],
  },
  serverExternalPackages: ["@cursor/sdk"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
