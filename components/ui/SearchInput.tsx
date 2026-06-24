"use client";
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
          className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 h-6 rounded text-[10px] text-navy-600 hover:text-cream hover:bg-navy-200"
        >
          clear
        </button>
      )}
    </div>
  );
}
