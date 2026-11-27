"use client";
import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Theme from "@/components/Theme.tsx";
import Ticket from "@/components/Ticket.tsx";
import { Head, ICONS } from "@/components/ui.tsx";
import { CATEGORIES } from "@/lib/catalog.ts";
import { ACTIVE, jobValue, money } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";

export default function Home() {
  const { state } = useApp();
  const [cat, setCat] = useState("electrical"), [q, setQ] = useState("");
  const category = CATEGORIES.find((c) => c.id === cat)!, Icon = ICONS[cat];
  const found = state!.services.filter((s) => q ? `${s.name} ${s.category}`.toLowerCase().includes(q.toLowerCase()) : s.category === cat);
  const active = state!.bookings.filter((b) => ACTIVE.includes(b.status));
  const unpaid = state!.bookings.find((b) => b.status === "confirmed" && b.paymentMethod === "card" && !b.paidAt);
  return (
    <>
      <Head title={`Hey, ${state!.me!.name.split(" ")[0]}`}><Theme /></Head>
      {unpaid && <Link className="reminder" href={`/customer/bookings/${unpaid.id}`}><b>Payment due: {money(jobValue(unpaid))}</b><span>Pay for {unpaid.code} before your next booking.</span></Link>}
      <h2 className="display">What needs<br />fixing today?</h2>
      <label className="search"><Search /><input type="search" placeholder="Search services" aria-label="Search services" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <div className="cats" role="group" aria-label="Category">{CATEGORIES.map((c) => {
        const I = ICONS[c.id];
        return <button key={c.id} aria-pressed={!q && c.id === cat} onClick={() => { setCat(c.id); setQ(""); }} title={c.name}><i><I /></i><span>{c.name}</span></button>;
      })}</div>
      <section className="feature">
        <div className="feature-top">
          <div><h3>{q ? "Search results" : category.name}</h3><p>{q ? `${found.length} found` : category.blurb}</p></div>
          {!q && <span className="blob" aria-hidden><Icon /></span>}
        </div>
        <ul>{found.map((s) => (
          <li key={s.id}><Link href={`/customer/book/${s.id}`}><span><b>{s.name}</b><small>Labour and materials from {money(s.labour + s.material)}</small></span><i><ArrowUpRight /></i></Link></li>
        ))}{found.length === 0 && <li className="none">Try another word, such as paint or leak.</li>}</ul>
      </section>
      {active.length > 0 && <><h3 className="section">Your bookings</h3><div className="grid">{active.slice(0, 4).map((b) => <Ticket key={b.id} b={b} />)}</div></>}
    </>
  );
}
