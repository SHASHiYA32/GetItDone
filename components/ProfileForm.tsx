"use client";
import { useApp } from "@/lib/store.tsx";

export default function ProfileForm() {
  const { state, act } = useApp();
  const me = state!.me!;
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act("update_profile", { name: f.get("name"), phone: f.get("phone") }, "Profile saved"); }}>
      <h3>Your details</h3>
      <label className="field">Full name<input name="name" defaultValue={me.name} required minLength={2} maxLength={80} /></label>
      <label className="field">Phone number<input name="phone" type="tel" defaultValue={me.phone ?? ""} required minLength={9} maxLength={20} /></label>
      <p className="muted">{me.email}</p>
      <button className="btn wide">Save changes</button>
    </form>
  );
}
