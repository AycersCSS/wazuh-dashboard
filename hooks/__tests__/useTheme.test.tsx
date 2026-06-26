import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useTheme } from "../useTheme";

function Demo() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} data-testid="btn">
      {theme}
    </button>
  );
}

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "dark";
  });

  it("defaults to dark and applies the dark class on mount", () => {
    render(<Demo />);
    expect(screen.getByTestId("btn").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("toggles to light, swaps the html class, and persists", () => {
    render(<Demo />);
    act(() => { fireEvent.click(screen.getByTestId("btn")); });
    expect(screen.getByTestId("btn").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("sentinel-stack:v1:theme")).toBe(JSON.stringify("light"));
  });

  it("toggles back to dark on a second click", () => {
    render(<Demo />);
    act(() => { fireEvent.click(screen.getByTestId("btn")); });
    act(() => { fireEvent.click(screen.getByTestId("btn")); });
    expect(screen.getByTestId("btn").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("rehydrates from localStorage when a light theme is persisted", () => {
    localStorage.setItem("sentinel-stack:v1:theme", JSON.stringify("light"));
    render(<Demo />);
    expect(screen.getByTestId("btn").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
