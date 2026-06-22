import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useLocalStorage } from "../useLocalStorage";

function Demo({ k, fallback }: { k: string; fallback: unknown }) {
  const [v, setV] = useLocalStorage<number>(k, fallback as number);
  return <button onClick={() => setV(prev => prev + 1)}>{v}</button>;
}

describe("useLocalStorage", () => {
  beforeEach(() => localStorage.clear());

  it("returns fallback when storage is empty", () => {
    render(<Demo k="n" fallback={0} />);
    expect(screen.getByRole("button").textContent).toBe("0");
  });

  it("persists writes to localStorage", () => {
    render(<Demo k="n" fallback={0} />);
    act(() => { fireEvent.click(screen.getByRole("button")); });
    expect(localStorage.getItem("sentinel-stack:v1:n")).toBe("1");
  });

  it("rehydrates from localStorage on mount", () => {
    localStorage.setItem("sentinel-stack:v1:n", JSON.stringify(7));
    render(<Demo k="n" fallback={0} />);
    expect(screen.getByRole("button").textContent).toBe("7");
  });

  it("accepts a function updater", () => {
    localStorage.setItem("sentinel-stack:v1:n", JSON.stringify(5));
    render(<Demo k="n" fallback={0} />);
    act(() => { fireEvent.click(screen.getByRole("button")); });
    expect(screen.getByRole("button").textContent).toBe("6");
  });
});
