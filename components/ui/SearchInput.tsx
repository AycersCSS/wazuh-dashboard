"use client";
import { X } from "lucide-react";
import { Input } from "./Input";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: Props) {
  return (
    <div className="relative w-full">
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
