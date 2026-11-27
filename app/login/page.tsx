"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Backdrop from "@/components/Backdrop.tsx";
import Logo from "@/components/Logo.tsx";
import Theme from "@/components/Theme.tsx";
import { Avatar } from "@/components/ui.tsx";
import { DEMO, useApp } from "@/lib/store.tsx";
import type { Role } from "@/lib/types.ts";

const DEMO_PEOPLE = [
  ["nimali", "Nimali Perera", "Customer with a job today"], ["kasun", "Kasun Silva", "Electrician"],
  ["dinesh", "Dinesh Bandara", "Painter awaiting approval"], ["admin", "Tharushi Wickrama", "Super admin"],
];

export default function Login() {
  const { state, signIn, signUp, pickDemo } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [role, setRole] = useState<Role>("customer");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("role") === "worker") setRole("worker");
    if (q.get("mode") === "up") setMode("up");
  }, []);
  useEffect(() => { if (state?.me) router.replace(`/${state.me.role}`); }, [state?.me, router]);
  return (
    <main className="login">
      <Backdrop />
      <div className="login-top"><Link href="/" className="chip-brand"><Logo word /></Link><Theme /></div>
      <section className="sheet">
        <h1>{DEMO ? "Pick someone to try" : mode === "in" ? "Welcome back" : role === "worker" ? "Join as a worker" : "Create your account"}</h1>
        {DEMO ? (
          <>
            <p className="muted">No account needed in sample mode.</p>
            <div className="people">{DEMO_PEOPLE.map(([id, name, what]) => (
              <button key={id} className="row" disabled={!state} onClick={() => pickDemo(id)}><Avatar name={name} size={44} /><span><b>{name}</b><small>{what}</small></span></button>
            ))}</div>
          </>
        ) : (
          <>
            <div className="tabs">
              <button aria-selected={mode === "in"} onClick={() => setMode("in")}>Sign in</button>
              <button aria-selected={mode === "up"} onClick={() => setMode("up")}>Create account</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault(); setBusy(true);
              const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              if (mode === "in") await signIn(f.email, f.password);
              else await signUp({ name: f.name, phone: f.phone, email: f.email, password: f.password, role });
              setBusy(false);
            }}>
              {mode === "up" && <>
                <div className="tabs">
                  <button type="button" aria-selected={role === "customer"} onClick={() => setRole("customer")}>I need work done</button>
                  <button type="button" aria-selected={role === "worker"} onClick={() => setRole("worker")}>I am a worker</button>
                </div>
                <label className="field">Full name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
                <label className="field">Phone number<input name="phone" required type="tel" pattern="\+?[0-9 ]{9,15}" autoComplete="tel" placeholder="07X XXX XXXX" /></label>
              </>}
              <label className="field">Email<input name="email" type="email" required autoComplete="email" /></label>
              <label className="field">Password<input name="password" type="password" required minLength={mode === "up" ? 10 : 1} autoComplete={mode === "up" ? "new-password" : "current-password"} /></label>
              <button className="btn wide" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</button>
            </form>
          </>
        )}
        <Link className="link" href="/">How GetItDone works</Link>
      </section>
    </main>
  );
}
