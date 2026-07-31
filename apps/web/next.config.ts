import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@chatter/ui", "@chatter/contracts", "@chatter/realtime"],
};

export default nextConfig;
