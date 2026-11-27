"use client";
import "leaflet/dist/leaflet.css";
import type * as L from "leaflet";
import { useEffect, useRef, useState } from "react";

export default function TrackMap({ home, worker }: { home: [number, number]; worker: [number, number] | null }) {
  const box = useRef<HTMLDivElement>(null);
  const ref = useRef<{ L: typeof L; map: L.Map; layer: L.LayerGroup } | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let gone = false;
    import("leaflet").then((m) => {
      if (gone || !box.current) return;
      const Lf = (m.default ?? m) as typeof L;
      const map = Lf.map(box.current, { zoomControl: false }).setView(home, 13);
      Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
      ref.current = { L: Lf, map, layer: Lf.layerGroup().addTo(map) }; setReady(true);
    });
    return () => { gone = true; ref.current?.map.remove(); ref.current = null; setReady(false); };
    // eslint-disable-next-line
  }, []);
  const key = `${home}|${worker}`;
  useEffect(() => {
    const r = ref.current; if (!r) return;
    r.layer.clearLayers();
    const pin = (p: [number, number], cls: string, label: string) =>
      r.L.marker(p, { icon: r.L.divIcon({ className: "", html: `<span class="pin ${cls}">${label}</span>`, iconSize: [64, 32], iconAnchor: [32, 16] }) }).addTo(r.layer);
    pin(home, "home", "Job");
    if (worker) {
      pin(worker, "van", "Worker");
      r.L.polyline([worker, home], { className: "route", dashArray: "2 10", weight: 5 }).addTo(r.layer);
      r.map.fitBounds([home, worker], { padding: [60, 60], maxZoom: 15 });
    } else r.map.setView(home, 13);
    // eslint-disable-next-line
  }, [key, ready]);
  return <div ref={box} className="map" role="img" aria-label="Map showing the job location and the worker" />;
}
