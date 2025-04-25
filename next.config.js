/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
     // Disable TypeScript type checking during build
  typescript: {
    // !! WARN !!
    // Dangerously allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },

  // If you also have ESLint errors, you can disable those too
  eslint: {
    // Similarly, this allows production builds with ESLint errors
    ignoreDuringBuilds: true,
  },
};

export default config;
