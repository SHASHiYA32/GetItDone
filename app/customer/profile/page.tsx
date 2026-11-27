"use client";
import { Trash2 } from "lucide-react";
import AddressForm from "@/components/AddressForm.tsx";
import Install from "@/components/Install.tsx";
import ProfileForm from "@/components/ProfileForm.tsx";
import Theme from "@/components/Theme.tsx";
import { Head } from "@/components/ui.tsx";
import { useApp } from "@/lib/store.tsx";

export default function Profile() {
  const { state, act, signOut } = useApp();
  return (
    <>
      <Head title="Profile"><Theme /></Head>
      <ProfileForm />
      <h3 className="section">Saved addresses</h3>
      {state!.addresses.map((a) => (
        <div className="row card" key={a.id}><span><b>{a.label}</b><small>{a.line}, {a.city}</small></span>
          <button className="round" aria-label={`Delete ${a.label}`} onClick={() => act("delete_address", { id: a.id }, "Address deleted")}><Trash2 /></button></div>
      ))}
      <details className="card"><summary>Add an address</summary><AddressForm /></details>
      <Install />
      <button className="btn soft wide mobile-only" onClick={signOut}>Sign out</button>
    </>
  );
}
