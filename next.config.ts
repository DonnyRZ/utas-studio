import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  experimental: { useTypeScriptCli: false },
};
export default config;
