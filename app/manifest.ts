import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "GetItDone", short_name: "GetItDone", description: "Book skilled workers for electrical, plumbing, building and repair jobs.",
    start_url: "/login", scope: "/", display: "standalone", background_color: "#5b45c8", theme_color: "#5b45c8", lang: "en",
    categories: ["business", "lifestyle", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
