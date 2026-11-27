"use client";
import { ArrowLeft, Bell, ChevronsRight, Droplets, Hammer, HardHat, PaintRoller, Snowflake, Star, Wrench, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { money, STATUS } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";
import type { Estimate, Status } from "@/lib/types.ts";
import Logo from "./Logo.tsx";

export const ICONS: Record<string, LucideIcon> = { electrical: Zap, plumbing: Droplets, construction: HardHat, painting: PaintRoller, carpentry: Hammer, ac: Snowflake, maintenance: Wrench };

export function Head({ title, back, children }: { title: string; back?: boolean; children?: ReactNode }) {
  const router = useRouter();
  const { state } = useApp();
  const unread = state?.notifications.filter((n) => !n.read).length ?? 0;
  const base = state?.me?.role ?? "customer";
  return (
    <header className="head">
      {back && <button className="round" onClick={() => router.back()} aria-label="Go back"><ArrowLeft /></button>}
      <h1>{title}</h1>
      {children}
      {base !== "admin" && (
        <Link className="round" href={`/${base}/alerts`} aria-label={`Notifications, ${unread} unread`}><Bell />{unread > 0 && <i className="dot" />}</Link>
      )}
    </header>
  );
}

export const Pill = ({ status }: { status: Status }) => <span className={`pill s-${status}`}>{STATUS[status]}</span>;

export const Avatar = ({ name, size = 48 }: { name: string; size?: number }) => (
  <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
    {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
  </span>
);

export const Rating = ({ value, count }: { value: number | null; count: number }) => (
  <span className="rating"><Star />{value === null ? "New" : `${value.toFixed(1)} (${count})`}</span>
);

export const Empty = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="empty"><h3>{title}</h3>{children}</div>
);

/** The price slip: a ticket with a torn middle and the total on a black stub. */
export function Slip({ estimate, extra, tip, fee }: { estimate: Estimate; extra?: { amount: number; reason: string } | null; tip?: number; fee?: number }) {
  const lines = [...estimate.lines, ...(extra ? [{ label: `Approved change: ${extra.reason}`, amount: extra.amount }] : [])];
  const total = estimate.total + (extra?.amount ?? 0);
  return (
    <div className="slip">
      <dl>{lines.map((l) => <div key={l.label}><dt>{l.label}</dt><i /><dd>{money(l.amount)}</dd></div>)}
        {!!tip && <div><dt>Tip</dt><i /><dd>{money(tip)}</dd></div>}
        {!!fee && <div><dt>Cancellation fee</dt><i /><dd>{money(fee)}</dd></div>}
      </dl>
      <div className="stub"><Logo size={34} /><span>{tip ? "Total with tip" : "Estimated total"}<small>about {estimate.hours} working {estimate.hours === 1 ? "hour" : "hours"}</small></span><strong>{money(total + (tip ?? 0))}</strong></div>
    </div>
  );
}

/** Drag to the end to confirm. Enter or Space also works. */
export function Slide({ label, onDone, disabled }: { label: string; onDone: () => Promise<unknown> | unknown; disabled?: boolean }) {
  const [x, setX] = useState(0), [busy, setBusy] = useState(false);
  const track = useRef<HTMLDivElement>(null), start = useRef<number | null>(null);
  const max = () => track.current!.clientWidth - 64;
  const done = async () => { if (busy || disabled) return; setBusy(true); setX(max()); try { await onDone(); } finally { setBusy(false); setX(0); } };
  return (
    <div className={`slide${disabled ? " off" : ""}`} ref={track}>
      <span>{busy ? "Working…" : label}</span><ChevronsRight aria-hidden />
      <button
        aria-label={label} disabled={disabled || busy} style={{ transform: `translateX(${x}px)` }}
        onPointerDown={(e) => { start.current = e.clientX - x; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => start.current !== null && setX(Math.max(0, Math.min(max(), e.clientX - start.current)))}
        onPointerUp={() => { start.current = null; if (x > max() * 0.85) done(); else setX(0); }}
        onPointerCancel={() => { start.current = null; setX(0); }}
        onClick={(e) => { if (e.detail === 0) done(); }}
      ><ChevronsRight /></button>
    </div>
  );
}

export function Photos({ paths }: { paths: string[] }) {
  const { fileUrl } = useApp();
  const [urls, setUrls] = useState<(string | null)[]>([]);
  const key = paths.join("|");
  useEffect(() => { Promise.all(paths.map(fileUrl)).then(setUrls); /* eslint-disable-next-line */ }, [key]);
  return <div className="photos">{paths.map((p, i) => urls[i]
    ? <a key={i} href={p.startsWith("data:") ? undefined : urls[i]!} target="_blank" rel="noreferrer"><img src={urls[i]!} alt={`Attachment ${i + 1}`} /></a>
    : <span key={i} className="file">{p.startsWith("demo:") ? p.slice(5) : "File preview not available"}</span>)}</div>;
}

export function Upload({ label, value, onChange, max = 4, accept = "image/jpeg,image/png,image/webp" }: { label: string; value: string[]; onChange: (v: string[]) => void; max?: number; accept?: string }) {
  const { upload } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <div className="field">
      <label className="drop">
        <input type="file" accept={accept} multiple={max > 1} disabled={busy || value.length >= max}
          onChange={async (e) => {
            const files = [...(e.target.files ?? [])].slice(0, max - value.length); e.target.value = ""; setBusy(true);
            const done = (await Promise.all(files.map(upload))).filter((p): p is string => !!p);
            setBusy(false); onChange([...value, ...done]);
          }} />
        <b>{busy ? "Uploading…" : label}</b><small>{value.length} of {max} added</small>
      </label>
      {value.length > 0 && <><Photos paths={value} /><button type="button" className="link" onClick={() => onChange([])}>Remove files</button></>}
    </div>
  );
}
