"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { sileo } from "sileo";
import { SERVICES } from "./catalog.ts";
import { apply, day, view, type DB } from "./engine.ts";
import { sampleData } from "./sample.ts";
import type { Args, Role, State } from "./types.ts";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const DEMO = !URL_ || !KEY;
const sb: SupabaseClient | null = DEMO ? null : createClient(URL_!, KEY!);
const STORE = "getitdone-demo-v2";

interface Api {
  state: State | null; offline: boolean;
  act: (action: string, args?: Args, success?: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (v: { name: string; phone: string; email: string; password: string; role: Role }) => Promise<boolean>;
  signOut: () => Promise<void>; pickDemo: (userId: string) => void; resetDemo: () => void;
  upload: (file: File) => Promise<string | null>; fileUrl: (path: string) => Promise<string | null>;
  payByCard: (bookingId: string) => Promise<boolean>;
  mfa: { start: () => Promise<{ factorId: string; qr: string | null; secret: string | null } | null>; verify: (factorId: string, code: string) => Promise<boolean> };
}
const Ctx = createContext<Api | null>(null);
export const useApp = () => useContext(Ctx)!;
export const showError = (e: unknown) => sileo.error({ title: "That didn't work", description: (e as { message?: string })?.message ?? "Try again." });

const shrink = (file: File) => new Promise<string>((resolve, reject) => {
  const img = new Image(), src = URL.createObjectURL(file);
  img.onload = () => {
    const k = Math.min(1, 640 / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = img.width * k; c.height = img.height * k;
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(src); resolve(c.toDataURL("image/jpeg", 0.7));
  };
  img.onerror = () => reject(new Error("That image could not be read"));
  img.src = src;
});

export function Provider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [offline, setOffline] = useState(false);
  const demo = useRef<{ db: DB; user: string | null; day: string } | null>(null);
  const seen = useRef<{ user: string; ids: Set<string> } | null>(null);

  const publish = useCallback((next: State) => {
    // Toast notifications that arrived since the last refresh
    const id = next.me?.id ?? "";
    if (seen.current?.user === id) next.notifications.filter((n) => !n.read && !seen.current!.ids.has(n.id)).slice(0, 2)
      .forEach((n) => sileo.info({ title: n.title, description: n.body }));
    seen.current = { user: id, ids: new Set(next.notifications.map((n) => n.id)) };
    setState(next);
  }, []);

  const saveDemo = useCallback(() => {
    const d = demo.current!;
    try { localStorage.setItem(STORE, JSON.stringify(d)); } catch { /* storage full or blocked: keep in memory */ }
    publish(view(d.db, d.user));
  }, [publish]);

  const refresh = useCallback(async () => {
    if (!sb) return;
    const { data, error } = await sb.rpc("app_state");
    setOffline(!!error);
    if (!error) publish(data as State);
    // Show the shell even if the first load fails, so the error is visible
    else setState((s) => s ?? view({ services: SERVICES, users: [], workers: [], addresses: [], bookings: [], messages: [], reviews: [], locations: [], notifications: [], complaints: [], ledger: [], settlements: [] }, null));
  }, [publish]);

  useEffect(() => {
    if (!sb) {
      const load = (user: string | null) => {
        try {
          const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
          // Sample appointments are dated "today", so start fresh each day
          if (saved?.day === day(Date.now())) return saved;
        } catch { /* ignore unreadable storage */ }
        return { db: sampleData(), user, day: day(Date.now()) };
      };
      demo.current = load(null); saveDemo();
      // Keep two open tabs (customer and worker) in step. Each tab keeps its own signed-in person.
      const sync = (e: StorageEvent) => {
        if (e.key !== STORE || !e.newValue) return;
        demo.current = { ...JSON.parse(e.newValue), user: demo.current!.user };
        publish(view(demo.current!.db, demo.current!.user));
      };
      try { const u = sessionStorage.getItem(STORE); if (u) { demo.current!.user = u; saveDemo(); } } catch { /* blocked */ }
      window.addEventListener("storage", sync);
      return () => window.removeEventListener("storage", sync);
    }
    refresh();
    const timer = setInterval(() => document.visibilityState === "visible" && refresh(), 5000);
    const { data } = sb.auth.onAuthStateChange(() => { setTimeout(refresh, 0); });
    return () => { clearInterval(timer); data.subscription.unsubscribe(); };
  }, [refresh, saveDemo, publish]);

  const api = useMemo<Omit<Api, "state" | "offline">>(() => ({
    act: async (action, args = {}, success) => {
      try {
        if (sb) {
          const params = Object.fromEntries(Object.entries(args).map(([k, v]) => [`p_${k}`, v]));
          const { error } = await sb.rpc(action, params);
          if (error) throw error;
          await refresh();
        } else {
          const d = demo.current!;
          d.db = apply(d.db, d.user!, action, args);
          saveDemo();
        }
        if (success) sileo.success({ title: success });
        return true;
      } catch (e) { showError(e); return false; }
    },
    signIn: async (email, password) => {
      const { error } = await sb!.auth.signInWithPassword({ email, password });
      if (error) { showError(error); return false; }
      await refresh(); return true;
    },
    signUp: async ({ email, password, ...data }) => {
      const { data: res, error } = await sb!.auth.signUp({ email, password, options: { data, emailRedirectTo: window.location.origin } });
      if (error) { showError(error); return false; }
      if (!res.session) sileo.success({ title: "Check your email", description: "Open the link we sent, then sign in." });
      await refresh(); return true;
    },
    signOut: async () => {
      if (sb) { await sb.auth.signOut(); await refresh(); return; }
      demo.current!.user = null;
      try { sessionStorage.removeItem(STORE); } catch { /* blocked */ }
      saveDemo();
    },
    pickDemo: (user) => {
      demo.current!.user = user;
      try { sessionStorage.setItem(STORE, user); } catch { /* blocked */ }
      saveDemo();
    },
    resetDemo: () => { demo.current = { db: sampleData(), user: demo.current!.user, day: day(Date.now()) }; saveDemo(); sileo.success({ title: "Sample data reset" }); },
    upload: async (file) => {
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error("Files must be 5 MB or smaller");
        if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)) throw new Error("Use a JPG, PNG, WebP or PDF file");
        if (!sb) return file.type === "application/pdf" ? `demo:${file.name}` : await shrink(file);
        const uid = (await sb.auth.getUser()).data.user!.id;
        const path = `${uid}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
        const { error } = await sb.storage.from("private").upload(path, file, { contentType: file.type });
        if (error) throw error;
        return path;
      } catch (e) { showError(e); return null; }
    },
    fileUrl: async (path) => {
      if (!sb) return path.startsWith("data:image/") ? path : null;
      const { data } = await sb.storage.from("private").createSignedUrl(path, 300);
      return data?.signedUrl ?? null;
    },
    // Hands the customer to PayHere's own page. Card details never touch this app.
    payByCard: async (bookingId) => {
      try {
        const token = (await sb!.auth.getSession()).data.session?.access_token;
        const res = await fetch("/api/payments/checkout", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ bookingId }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const form = Object.assign(document.createElement("form"), { method: "POST", action: data.action });
        for (const [name, value] of Object.entries(data.fields)) form.append(Object.assign(document.createElement("input"), { type: "hidden", name, value }));
        document.body.append(form); form.submit(); return true;
      } catch (e) { showError(e); return false; }
    },
    mfa: {
      start: async () => {
        const list = await sb!.auth.mfa.listFactors();
        if (list.error) { showError(list.error); return null; }
        const done = list.data.totp[0];
        if (done) return { factorId: done.id, qr: null, secret: null };
        // Remove half-finished setups so a new code can be issued
        for (const f of list.data.all.filter((f) => f.status !== "verified")) await sb!.auth.mfa.unenroll({ factorId: f.id });
        const { data, error } = await sb!.auth.mfa.enroll({ factorType: "totp" });
        if (error) { showError(error); return null; }
        return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
      },
      verify: async (factorId, code) => {
        const { error } = await sb!.auth.mfa.challengeAndVerify({ factorId, code });
        if (error) { showError(error); return false; }
        await refresh(); return true;
      },
    },
  }), [refresh, saveDemo]);

  return <Ctx.Provider value={{ state, offline, ...api }}>{children}</Ctx.Provider>;
}
