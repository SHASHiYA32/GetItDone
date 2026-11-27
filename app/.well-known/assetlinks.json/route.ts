// Proves to Android that the APK and this website belong together. See docs/ANDROID.md.
export const dynamic = "force-dynamic";
export function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME, certs = process.env.ANDROID_CERT_SHA256?.split(",").map((s) => s.trim()).filter(Boolean);
  return Response.json(pkg && certs?.length ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: certs } }] : []);
}
