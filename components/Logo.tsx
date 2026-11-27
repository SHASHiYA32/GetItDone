"use client";
import { useId } from "react";

/** A tick whose long arm ends in a spanner jaw. Keep in step with scripts/gen-icons.mjs. */
export default function Logo({ size = 40, word = false }: { size?: number; word?: boolean }) {
  const id = useId();
  return (
    <span className="mark">
      <svg width={size} height={size} viewBox="0 0 64 64" role={word ? undefined : "img"} aria-label={word ? undefined : "GetItDone"} aria-hidden={word || undefined}>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff" /><path d="M45.5 18.5 47 14.5 57 2 64 9 51.5 19 47.5 20.5Z" fill="#000" /></mask>
        <rect width="64" height="64" rx="18" fill="#5b45c8" />
        <g transform="translate(32 32) scale(.92) translate(-32.5 -30)"><g mask={`url(#${id})`} fill="#c6f432">
          <path d="M13 34 25 46 45 22" fill="none" stroke="#c6f432" strokeWidth="10.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="46" cy="19.5" r="11.5" /></g></g>
      </svg>
      {word && <span className="word">GetItDone</span>}
    </span>
  );
}
