const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.tile.openstreetmap.org ${supabase}`,
  "font-src 'self'",
  `connect-src 'self' ${supabase}${dev ? " ws:" : ""}`,
  "frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'", "worker-src 'self'", "manifest-src 'self'",
  "form-action 'self' https://sandbox.payhere.lk https://www.payhere.lk",
].join("; ");

export default {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] }, { source: "/:path*", headers: [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=()" },
    ] }];
  },
};
