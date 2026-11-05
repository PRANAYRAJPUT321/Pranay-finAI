import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The microphone is allowed for this origin only, for the Voice Drill's speech recognition (the browser still asks the
  // learner). It has to be site-wide: the policy is fixed when a document loads, and the drill is usually reached by
  // client-side navigation from another page.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs", "pdfkit", "web-push"],
  // PDF routes read bundled Unicode fonts from disk.
  outputFileTracingIncludes: { "/api/materials/**": ["./assets/fonts/**"] },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

export default nextConfig;
