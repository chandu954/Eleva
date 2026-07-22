/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NextConfig } from "next";
import remarkGfm from "remark-gfm";
import mdx from "@next/mdx";

const withMDX = mdx({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
});

const nextConfig: NextConfig = {
  // Enable standalone output for Docker builds
  output: "standalone",

  // Support serving the app at a path prefix
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",

  // Custom image loader
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },

  experimental: {
    turbo: {},
  },

  // Allow MDX pages
  pageExtensions: ["ts", "tsx", "mdx"],

  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  poweredByHeader: false,
};

const config = withMDX(nextConfig);

export default config;