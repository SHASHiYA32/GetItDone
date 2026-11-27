"use client";
import "sileo/styles.css";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sileo";
import { Provider } from "@/lib/store.tsx";

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") navigator.serviceWorker?.register("/sw.js").catch(() => { /* app works without it */ });
  }, []);
  return <Provider><Toaster position="top-center" theme="light" options={{ fill: "#222129" }} />{children}</Provider>;
}
