"use client";
import { Banknote, CreditCard } from "lucide-react";
import type { PaymentMethod } from "@/lib/types.ts";

const OPTIONS = [["cash", "Cash", "Pay the worker when the job is done", Banknote], ["card", "Card", "Pay online after you confirm the work", CreditCard]] as const;

export default function PaymentChoice({ value, onChange }: { value: PaymentMethod; onChange: (v: PaymentMethod) => void }) {
  return (
    <fieldset className="pay"><legend>How will you pay?</legend>
      {OPTIONS.map(([id, name, hint, Icon]) => (
        <label key={id} className={value === id ? "on" : ""}>
          <input type="radio" name="payment" value={id} checked={value === id} onChange={() => onChange(id)} />
          <Icon /><b>{name}</b><small>{hint}</small>
        </label>
      ))}
    </fieldset>
  );
}
