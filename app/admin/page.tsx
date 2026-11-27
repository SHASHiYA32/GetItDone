"use client";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Theme from "@/components/Theme.tsx";
import { Head } from "@/components/ui.tsx";
import { can, commissionOf, day } from "@/lib/engine.ts";
import { lookup, money, STATUS } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";
import type { Booking } from "@/lib/types.ts";

const count = (keys: string[]) => Object.entries(keys.reduce<Record<string, number>>((m, k) => ({ ...m, [k]: (m[k] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
const earned = (b: Booking) => (b.status === "confirmed" ? commissionOf(b) : 0) + b.cancelFee;
const when_ = (b: Booking) => day(b.completedAt ?? b.cancelledAt ?? b.createdAt);

function Bars({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return <section className="card"><h3>{title}</h3>{rows.length === 0 && <p className="muted">No data yet.</p>}
    <ul className="bars">{rows.slice(0, 7).map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b><i style={{ width: `${(v / max) * 100}%` }} /></li>)}</ul></section>;
}

export default function Overview() {
  const { state } = useApp();
  const s = state!, l = lookup(s);
  const [now] = useState(() => Date.now());
  const finance = can(s.me, "finance");
  // Last six calendar months, oldest first
  const today = day(now);
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 6 + i, 1)); return d.toISOString().slice(0, 7); });
  const series = months.map((m) => ({ m, v: finance ? s.bookings.filter((b) => when_(b).startsWith(m)).reduce((t, b) => t + earned(b), 0) : s.bookings.filter((b) => day(b.createdAt).startsWith(m)).length }));
  const top = Math.max(1, ...series.map((x) => x.v));
  const rated = s.reviews.length ? (s.reviews.reduce((t, r) => t + r.rating, 0) / s.reviews.length).toFixed(1) : "None";
  const stats: [string, string | number, string?][] = [
    ["Customers", s.users.filter((u) => u.role === "customer").length], ["Workers", s.workers.length],
    ["Active workers", s.workers.filter((w) => w.status === "approved" && !w.blocked).length], ["Total bookings", s.bookings.length, "dark"],
    ["Completed", s.bookings.filter((b) => b.status === "confirmed").length], ["Cancelled", s.bookings.filter((b) => b.status === "cancelled").length],
    ["Average rating", rated], ["Waiting for verification", s.workers.filter((w) => w.status === "pending").length, "amber"],
  ];
  const todo = ([
    ["verify", "/admin/workers", "Workers to verify", s.workers.filter((w) => w.status === "pending").length],
    ["bookings", "/admin/bookings", "Open disputes", s.complaints.filter((c) => c.status === "open").length],
    ["finance", "/admin/finance", "Bank slips to check", s.settlements.filter((x) => x.status === "pending").length],
    ["bookings", "/admin/bookings", "Jobs unconfirmed for 48 hours", s.bookings.filter((b) => b.status === "completed" && now - Date.parse(b.completedAt!) > 48 * 3600e3).length],
  ] as const).filter((t) => can(s.me, t[0]));
  return (
    <>
      <Head title="Overview"><button className="btn soft print-hide" onClick={() => window.print()}>Print report</button><Theme /></Head>
      <div className="dash">
        <section className="earn chart">
          <p>{finance ? "Platform revenue this month" : "Bookings this month"}</p>
          <strong>{finance ? money(series[5].v) : series[5].v}</strong>
          <ol className="columns" aria-label={finance ? "Revenue by month" : "Bookings by month"}>{series.map(({ m, v }) => (
            <li key={m}><b>{finance ? v.toLocaleString("en-LK") : v}</b><i style={{ height: `${(v / top) * 100}%` }} /><span>{new Date(`${m}-15`).toLocaleDateString("en-GB", { month: "short" })}</span></li>
          ))}</ol>
          {finance && <small>Commission on completed jobs plus cancellation fees. Cash commission counts when charged, even if not yet collected.</small>}
        </section>
        <section className="card todo"><h3>Needs attention</h3>
          {todo.map(([, href, label, n]) => <Link key={label} href={href} className={n ? "hot" : ""}><b>{n}</b><span>{label}</span><ChevronRight /></Link>)}
          {!todo.length && <p className="muted">Nothing for your role.</p>}</section>
      </div>
      <div className="tiles">{stats.map(([k, v, c]) => <div className={`tile ${c ?? ""}`} key={k}><strong>{v}</strong><span>{k}</span></div>)}</div>
      <div className="grid">
        <Bars title="Most requested services" rows={count(s.bookings.map((b) => l.service(b.serviceId).name))} />
        <Bars title="Demand by location" rows={count(s.bookings.map((b) => b.city))} />
        <Bars title="Booking status" rows={count(s.bookings.map((b) => STATUS[b.status]))} />
        <Bars title="Top workers by completed jobs" rows={s.workers.filter((w) => w.jobs).map((w) => [l.name(w.userId), w.jobs] as [string, number]).sort((a, b) => b[1] - a[1])} />
        <Bars title="Worker cancellation rate (%)" rows={s.workers.map((w) => { const all = s.bookings.filter((b) => b.workerId === w.userId); return [l.name(w.userId), all.length ? Math.round(100 * all.filter((b) => b.cancelledBy === "worker").length / all.length) : 0] as [string, number]; }).filter((r) => r[1])} />
        <Bars title="Customer satisfaction (reviews by stars)" rows={[5, 4, 3, 2, 1].map((n) => [`${n} stars`, s.reviews.filter((r) => r.rating === n).length])} />
      </div>
    </>
  );
}
