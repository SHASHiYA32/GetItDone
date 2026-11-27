import "@fontsource-variable/figtree";
import "@fontsource-variable/unbounded";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./extra.css";
import Providers from "./providers.tsx";

export const metadata: Metadata = {
  title: "GetItDone", description: "Book skilled workers for electrical, plumbing, building and repair jobs.",
  applicationName: "GetItDone", appleWebApp: { capable: true, title: "GetItDone", statusBarStyle: "default" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#edecf3" }, { media: "(prefers-color-scheme: dark)", color: "#07070a" }] };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>{/* apply the saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('gid-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
