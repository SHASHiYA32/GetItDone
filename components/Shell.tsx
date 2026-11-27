"use client";
import { Banknote, BarChart3, CalendarCheck, ClipboardList, Home, LogOut, ShieldCheck, User as UserIcon, UserCog, Users, Wallet, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { can } from "@/lib/engine.ts";
import { DEMO, useApp } from "@/lib/store.tsx";
import type { Role } from "@/lib/types.ts";
import Logo from "./Logo.tsx";
import Mfa from "./Mfa.tsx";

const NAV = {
  customer: [["", "Home", Home], ["bookings", "Bookings", CalendarCheck], ["profile", "Profile", UserIcon]],
  worker: [["", "Dashboard", Home], ["jobs", "Jobs", ClipboardList], ["wallet", "Wallet", Wallet], ["profile", "Profile", UserIcon]],
  admin: [["", "Overview", BarChart3], ["workers", "Workers", Wrench, "verify"], ["customers", "Customers", Users, "customers"], ["bookings", "Bookings", ClipboardList, "bookings"], ["finance", "Payments", Banknote, "finance"], ["staff", "Staff", UserCog, "staff"]],
} as const;

export default function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const { state, offline, signOut } = useApp();
  const router = useRouter(), path = usePathname();
  const me = state?.me;
  useEffect(() => { if (state && (!me || me.role !== role)) router.replace(me ? `/${me.role}` : "/login"); }, [state, me, role, router]);
  if (!state || !me || me.role !== role) return <main className="loading"><Logo size={64} /><p>Loading…</p></main>;
  if (me.suspended) return <main className="loading"><h2>Account suspended</h2><p>Contact support to restore access.</p><button className="btn" onClick={signOut}>Sign out</button></main>;
  if (state.mfaRequired) return <Mfa />;
  const items = NAV[role].filter((i) => !i[3] || can(me, i[3]));
  return (
    <div className={`shell role-${role}${path.startsWith("/customer/book/") ? " focus" : ""}`}>
      <nav className="dock" aria-label="Main">
        <Link className="brand" href="/" aria-label="GetItDone home"><Logo word /></Link>
        {items.map(([to, label, Icon]) => {
          const href = `/${role}${to ? `/${to}` : ""}`;
          const on = to ? path.startsWith(href) : path === href;
          return <Link key={label} href={href} className={on ? "on" : ""} aria-current={on ? "page" : undefined} aria-label={label}><Icon /><span>{label}</span></Link>;
        })}
        <button className="out" aria-label="Sign out" onClick={async () => { await signOut(); router.replace("/login"); }}><LogOut /><span>Sign out</span></button>
        {role === "admin" && <span className="signed"><b>{me.name}</b><small>Staff</small></span>}
      </nav>
      <main className="page">
        {offline && <p className="banner warn" role="alert">Connection lost. Trying again.</p>}
        <div className="topline"><Logo size={30} />{DEMO && <p className="demo"><ShieldCheck />Sample data. <Link href="/login" onClick={() => signOut()}>Switch person</Link></p>}</div>
        {children}
      </main>
    </div>
  );
}
