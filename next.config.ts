import path from "path";
import type { NextConfig } from "next";
import remarkGfm from "remark-gfm";
import mdx from "@next/mdx";
import { withSentryConfig } from "@sentry/nextjs/config";

const withMDX = mdx({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
});

let withBundleAnalyzer = (config: NextConfig) => config;

if (process.env.ANALYZE === "true") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  withBundleAnalyzer = require("@next/bundle-analyzer").default({
    enabled: true,
  });
}

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the tracing root: a stray lockfile in a parent directory made Next
  // infer the workspace root as the home directory, which relocated the
  // standalone output folder (breaking the build script's `cp` steps).
  outputFileTracingRoot: path.join(__dirname),
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  experimental: {
    turbo: {},
  },
  pageExtensions: ["ts", "tsx", "mdx"],
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  poweredByHeader: false,
};

const config = withMDX(nextConfig);

export default withSentryConfig(withBundleAnalyzer(config), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: process.env.NODE_ENV !== "production",
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: { disable: true },
  tunnelRoute: "/monitoring",
});
