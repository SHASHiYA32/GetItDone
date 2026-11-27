"use client";
import Table from "@/components/Table.tsx";
import { Empty, Head } from "@/components/ui.tsx";
import { can } from "@/lib/engine.ts";
import { useApp } from "@/lib/store.tsx";

const ROLES = { super: "Super admin", verification: "Worker verification", support: "Customer support", bookings: "Booking management", finance: "Finance" };

export default function Staff() {
  const { state, act } = useApp();
  const s = state!;
  if (!can(s.me, "staff")) return <Empty title="Only a super admin can manage staff" />;
  return (
    <>
      <Head title="Staff" />
      <div className="side-layout">
        <Table rows={s.users.filter((u) => u.role === "admin")} id={(u) => u.id} empty="No staff yet" columns={[
          { title: "Name", cell: (u) => <b>{u.name}</b> }, { title: "Role", cell: (u) => ROLES[u.staffRole!] }, { title: "Email", cell: (u) => u.email },
          { title: "Access", cell: (u) => u.id === s.me!.id ? "You" : <button className="btn soft" onClick={() => act("admin_set_staff", { email: u.email, staff_role: "" }, "Staff access removed")}>Remove</button> },
        ]} />
        <form className="card" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act("admin_set_staff", { email: f.get("email"), staff_role: f.get("role") }, "Staff access saved"); }}>
          <h3>Give staff access</h3><p className="muted">The person creates an account first, using a work email.</p>
          <label className="field">Email<input name="email" type="email" required /></label>
          <label className="field">Role<select name="role">{Object.entries(ROLES).map(([v, n]) => <option value={v} key={v}>{n}</option>)}</select></label>
          <button className="btn wide">Save access</button>
        </form>
      </div>
    </>
  );
}
