/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Re-enable TypeScript type checking for better security
  typescript: {
    // Only ignore build errors in development or when explicitly needed
    ignoreBuildErrors: process.env.NODE_ENV === "development" && process.env.IGNORE_BUILD_ERRORS === "true",
  },

  // Re-enable ESLint checking for better code quality
  eslint: {
    // Allow build to succeed with ESLint warnings, but still show them
    ignoreDuringBuilds: true,
  },

  images: {
    domains: [
      "ilaomq0v0xxpqlmj.public.blob.vercel-storage.com"
    ],
  },
};

export default config;
