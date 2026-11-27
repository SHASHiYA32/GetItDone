"use client";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type Prompt = Event & { prompt: () => Promise<void> };
let saved: Prompt | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); saved = e as Prompt; listeners.forEach((f) => f()); });

export default function Install() {
  const [ready, setReady] = useState(false), [help, setHelp] = useState(false), [installed, setInstalled] = useState(false);
  useEffect(() => {
    const update = () => setReady(!!saved);
    update(); listeners.add(update);
    setInstalled(matchMedia("(display-mode: standalone)").matches);
    return () => { listeners.delete(update); };
  }, []);
  if (installed) return null;
  return (
    <div className="install">
      <button type="button" className="btn dark" onClick={async () => { if (ready && saved) { await saved.prompt(); saved = null; setReady(false); } else setHelp(!help); }}><Download />Install the app</button>
      {help && <p role="status">On Android or a computer, open this site in Chrome or Edge, then choose “Install app” from the browser menu. On iPhone, open it in Safari, tap Share, then “Add to Home Screen”.</p>}
    </div>
  );
}
