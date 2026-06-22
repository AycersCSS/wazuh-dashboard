import { describe, it, expect } from "vitest";
import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Drawer } from "../Drawer";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button data-testid="open" onClick={() => setOpen(true)}>Open</button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Test">
        <div>Body content</div>
      </Drawer>
    </>
  );
}

describe("Drawer", () => {
  it("does not render body when closed", () => {
    render(<Harness />);
    expect(screen.queryByText("Body content")).toBeNull();
  });

  it("renders body when open", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("open"));
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("closes on ESC", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("open"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Body content")).toBeNull();
  });

  it("closes on backdrop click", () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId("open"));
    fireEvent.click(screen.getByTestId("backdrop"));
    expect(screen.queryByText("Body content")).toBeNull();
  });
});
