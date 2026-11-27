"use client";
import { LocateFixed } from "lucide-react";
import { useState } from "react";
import { CITIES } from "@/lib/catalog.ts";
import { showError, useApp } from "@/lib/store.tsx";

export function CityPoint({ value, onChange }: { value: { city: string; lat: number; lng: number }; onChange: (v: { city: string; lat: number; lng: number }) => void }) {
  const [gps, setGps] = useState(false);
  return <>
    <label className="field">Nearest city<select value={value.city} onChange={(e) => { setGps(false); const c = CITIES[e.target.value]; onChange({ city: e.target.value, lat: c[0], lng: c[1] }); }}>
      {Object.keys(CITIES).sort().map((c) => <option key={c}>{c}</option>)}</select></label>
    <button type="button" className="btn soft wide" onClick={() => navigator.geolocation?.getCurrentPosition(
      (p) => { setGps(true); onChange({ ...value, lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => showError(new Error("Allow location access, or just choose the nearest city")))}>
      <LocateFixed />{gps ? "Exact location added" : "Use my current location"}</button>
  </>;
}
export const defaultPoint = { city: "Colombo", lat: CITIES.Colombo[0], lng: CITIES.Colombo[1] };

export default function AddressForm({ onSaved }: { onSaved?: () => void }) {
  const { act } = useApp();
  const [point, setPoint] = useState(defaultPoint);
  return (
    <form className="card" onSubmit={async (e) => {
      e.preventDefault(); const form = e.currentTarget, f = new FormData(form);
      if (await act("save_address", { label: f.get("label"), line: f.get("line"), ...point }, "Address saved")) { form.reset(); onSaved?.(); }
    }}>
      <label className="field">Label<input name="label" required maxLength={40} placeholder="Home" /></label>
      <label className="field">Street address<input name="line" required minLength={5} maxLength={200} autoComplete="street-address" /></label>
      <CityPoint value={point} onChange={setPoint} />
      <button className="btn wide">Save address</button>
    </form>
  );
}
