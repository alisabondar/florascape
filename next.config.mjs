/** @type {import('next').NextConfig} */
const nextConfig = {
  // Separate build folders let `bun run dev`, the e2e server, and previews run side by side
  // without overwriting each other's compiled files.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
