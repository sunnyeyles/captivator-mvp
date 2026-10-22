import type { KeyboardEvent, MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { clearSelectionProps, selectableProps } from "./selection";

function mouseEvent() {
  return { stopPropagation: vi.fn() } as unknown as MouseEvent<HTMLElement>;
}

function keyEvent(key: string) {
  return {
    key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as KeyboardEvent<HTMLElement>;
}

describe("selectableProps", () => {
  it("selects the element on click without bubbling to the page", () => {
    const onSelectElement = vi.fn();
    const event = mouseEvent();

    selectableProps("greeting", { mode: "edit", onSelectElement }).onClick?.(
      event,
    );

    expect(onSelectElement).toHaveBeenCalledWith("greeting");
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it.each(["Enter", " "])("selects the element with %j", (key) => {
    const onSelectElement = vi.fn();

    selectableProps("greeting", { mode: "edit", onSelectElement }).onKeyDown?.(
      keyEvent(key),
    );

    expect(onSelectElement).toHaveBeenCalledWith("greeting");
  });

  it("ignores other keys", () => {
    const onSelectElement = vi.fn();

    selectableProps("greeting", { mode: "edit", onSelectElement }).onKeyDown?.(
      keyEvent("a"),
    );

    expect(onSelectElement).not.toHaveBeenCalled();
  });

  it.each(["preview", "published"] as const)(
    "adds nothing in %s mode",
    (mode) => {
      expect(
        selectableProps("greeting", { mode, onSelectElement: vi.fn() }),
      ).toEqual({});
    },
  );
});

describe("clearSelectionProps", () => {
  it("clears the selection when empty canvas is clicked", () => {
    const onSelectElement = vi.fn();

    clearSelectionProps({ mode: "edit", onSelectElement }).onClick?.(
      mouseEvent(),
    );

    expect(onSelectElement).toHaveBeenCalledWith(null);
  });

  it("adds nothing in preview mode", () => {
    expect(
      clearSelectionProps({ mode: "preview", onSelectElement: vi.fn() }),
    ).toEqual({});
  });
});
