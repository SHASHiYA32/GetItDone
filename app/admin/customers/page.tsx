"use client";
import { useState } from "react";
import Table, { Search } from "@/components/Table.tsx";
import { Empty, Head } from "@/components/ui.tsx";
import { can } from "@/lib/engine.ts";
import { date, lookup, STATUS } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";

export default function Customers() {
  const { state, act } = useApp();
  const s = state!, l = lookup(s);
  const [q, setQ] = useState("");
  if (!can(s.me, "customers")) return <Empty title="Your staff role does not include customers" />;
  const list = s.users.filter((u) => u.role === "customer" && `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(q.toLowerCase()));
  const of = (id: string) => s.bookings.filter((b) => b.customerId === id);
  const complaints = (id: string) => s.complaints.filter((c) => c.userId === id);
  return (
    <>
      <Head title="Customers" />
      <div className="toolbar"><Search value={q} onChange={setQ} label="Search name, email or phone" /></div>
      <Table rows={list} id={(u) => u.id} empty="No customers found" columns={[
        { title: "Customer", cell: (u) => <b>{u.name}</b> },
        { title: "Phone", cell: (u) => u.phone },
        { title: "Email", cell: (u) => u.email },
        { title: "Bookings", cell: (u) => of(u.id).length, num: true },
        { title: "Cancelled by them", cell: (u) => of(u.id).filter((b) => b.cancelledBy === "customer").length, num: true },
        { title: "Complaints", cell: (u) => complaints(u.id).length, num: true },
        { title: "Account", cell: (u) => <span className={`pill ${u.suspended ? "s-disputed" : ""}`}>{u.suspended ? "Suspended" : "Active"}</span> },
      ]} detail={(u) => (
        <div className="detail-grid">
          <div><h3>Booking history</h3>{of(u.id).map((b) => <p key={b.id}>{b.code}, {date(b.createdAt)}, {l.service(b.serviceId).name}: {STATUS[b.status]}</p>)}{!of(u.id).length && <p>No bookings.</p>}</div>
          <div><h3>Complaints</h3>{complaints(u.id).map((c) => <p key={c.id}>{c.body}</p>)}{!complaints(u.id).length && <p>None.</p>}</div>
          <div className="actions"><button className={`btn ${u.suspended ? "" : "red"}`} onClick={() => act("admin_set_suspended", { user_id: u.id, suspended: !u.suspended }, u.suspended ? "Account restored" : "Account suspended")}>{u.suspended ? "Restore account" : "Suspend account"}</button></div>
        </div>
      )} />
    </>
  );
}
