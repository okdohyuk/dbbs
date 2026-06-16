import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output so the Docker image stays small (server + traced deps only).
  output: "standalone",
  // Native / Node-only DB drivers must not be bundled by the server compiler.
  serverExternalPackages: ["mysql2", "postgres"],
};

export default nextConfig;
