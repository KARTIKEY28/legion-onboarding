import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright builds into its own folder so it never overwrites a running dev server.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // The journey begins at /start. Query strings (UTM parameters) carry through.
  async redirects() {
    return [{ source: "/", destination: "/start", permanent: false }];
  },
};

export default nextConfig;
