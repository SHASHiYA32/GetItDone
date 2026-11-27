"use client";
import { ChevronDown } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";

export interface Column<T> { title: string; cell: (row: T) => ReactNode; num?: boolean }

/** A table on wide screens, stacked cards on phones. The first column opens the row. */
export default function Table<T>({ rows, columns, id, detail, empty }: { rows: T[]; columns: Column<T>[]; id: (r: T) => string; detail?: (r: T) => ReactNode; empty: string }) {
  const [open, setOpen] = useState("");
  if (!rows.length) return <div className="empty"><h3>{empty}</h3></div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((c) => <th key={c.title} className={c.num ? "num" : ""} scope="col">{c.title}</th>)}</tr></thead>
        <tbody>{rows.map((r) => {
          const key = id(r), on = open === key;
          return <Fragment key={key}>
            <tr className={on ? "open" : ""}>{columns.map((c, i) => <td key={c.title} data-label={c.title} className={c.num ? "num" : ""}>
              {i === 0 && detail ? <button className="rowbtn" aria-expanded={on} onClick={() => setOpen(on ? "" : key)}><ChevronDown /><span>{c.cell(r)}</span></button> : c.cell(r)}
            </td>)}</tr>
            {on && detail && <tr className="detail"><td colSpan={columns.length}>{detail(r)}</td></tr>}
          </Fragment>;
        })}</tbody>
      </table>
    </div>
  );
}
export function Search({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <label className="search"><input type="search" aria-label={label} placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}
