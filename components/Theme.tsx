"use client";
import { Moon, Sun } from "lucide-react";
export default function Theme() {
  return (
    <button className="round" aria-label="Switch between light and dark" onClick={() => {
      const el = document.documentElement;
      const dark = el.dataset.theme ? el.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      el.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem("gid-theme", el.dataset.theme); } catch { /* blocked */ }
    }}><Sun className="sun" /><Moon className="moon" /></button>
  );
}
