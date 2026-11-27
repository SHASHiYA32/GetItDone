"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store.tsx";
import Logo from "./Logo.tsx";

export default function Mfa() {
  const { mfa, signOut } = useApp();
  const [setup, setSetup] = useState<Awaited<ReturnType<typeof mfa.start>>>(null);
  const [code, setCode] = useState("");
  useEffect(() => { mfa.start().then(setSetup); /* eslint-disable-next-line */ }, []);
  return (
    <main className="auth">
      <Logo word />
      <h1>Two-step sign in</h1>
      <p>{setup?.qr ? "Scan this code with an authenticator app, then enter the 6 digits it shows." : "Enter the 6 digits from your authenticator app."}</p>
      {setup?.qr && <><img className="qr" src={setup.qr} alt="Authenticator setup code" /><p className="muted">Or type this key: <code>{setup.secret}</code></p></>}
      <form onSubmit={(e) => { e.preventDefault(); if (setup) mfa.verify(setup.factorId, code); }}>
        <label className="field">6-digit code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /></label>
        <button className="btn wide" disabled={!setup}>Verify</button>
        <button type="button" className="link" onClick={signOut}>Sign out</button>
      </form>
    </main>
  );
}
