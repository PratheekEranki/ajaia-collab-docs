import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mammoth + pg ship Node-only code; keep them out of the bundler.
  serverExternalPackages: ["mammoth", "pg", "@prisma/adapter-pg", "html-to-docx"],
};

export default nextConfig;
