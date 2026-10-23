import { describe, expect, it } from "vitest";
import {
  clearDeviceOverride,
  clearOverridesFor,
  resolveForDevice,
  setDeviceOverride,
} from "./overrides";
import { devices, type TextElement } from "./schema";

const text: TextElement = {
  id: "greeting",
  text: "Hello guests",
  fontSize: 48,
  color: "#ffffff",
  fontWeight: 700,
  textAlign: "center",
};

describe("resolveForDevice", () => {
  it.each(devices)(
    "uses the shared values on %s when nothing is overridden",
    (device) => {
      expect(resolveForDevice(text, device)).toEqual(text);
    },
  );

  it("uses a device's override and falls back to the shared value for the rest", () => {
    const element: TextElement = {
      ...text,
      overrides: { mobile: { fontSize: 24 } },
    };

    expect(resolveForDevice(element, "mobile")).toEqual({
      ...text,
      fontSize: 24,
    });
    expect(resolveForDevice(element, "desktop")).toEqual(text);
  });

  it("keeps each device's overrides separate", () => {
    const element: TextElement = {
      ...text,
      overrides: {
        desktop: { textAlign: "left" },
        mobile: { fontSize: 20, textAlign: "right" },
      },
    };

    expect(resolveForDevice(element, "desktop")).toMatchObject({
      fontSize: 48,
      textAlign: "left",
    });
    expect(resolveForDevice(element, "mobile")).toMatchObject({
      fontSize: 20,
      textAlign: "right",
    });
  });

  it("ignores an override key left undefined", () => {
    const element: TextElement = {
      ...text,
      overrides: { mobile: { fontSize: undefined } },
    };

    expect(resolveForDevice(element, "mobile").fontSize).toBe(48);
  });
});

describe("setDeviceOverride", () => {
  it("adds to a device's overrides without touching the shared value", () => {
    const once = setDeviceOverride(text, "mobile", { fontSize: 24 });
    const twice = setDeviceOverride(once, "mobile", { textAlign: "left" });

    expect(twice.fontSize).toBe(48);
    expect(twice.overrides).toEqual({
      mobile: { fontSize: 24, textAlign: "left" },
    });
  });
});

describe("clearDeviceOverride", () => {
  it("removes one key and keeps the other overrides", () => {
    const element: TextElement = {
      ...text,
      overrides: {
        desktop: { fontSize: 60 },
        mobile: { fontSize: 24, textAlign: "left" },
      },
    };

    expect(
      clearDeviceOverride(element, "mobile", "fontSize").overrides,
    ).toEqual({
      desktop: { fontSize: 60 },
      mobile: { textAlign: "left" },
    });
  });

  it("returns to an element with no overrides once the last one is cleared", () => {
    const overridden = setDeviceOverride(text, "mobile", { fontSize: 24 });

    expect(clearDeviceOverride(overridden, "mobile", "fontSize")).toEqual(text);
  });

  it("does nothing when the key was not overridden", () => {
    expect(clearDeviceOverride(text, "desktop", "textAlign")).toEqual(text);
  });
});

describe("clearOverridesFor", () => {
  it("removes the keys on every device and keeps other overrides", () => {
    const element: TextElement = {
      ...text,
      overrides: {
        desktop: { fontSize: 60 },
        mobile: { fontSize: 24, textAlign: "left" },
      },
    };

    expect(clearOverridesFor(element, ["fontSize"]).overrides).toEqual({
      mobile: { textAlign: "left" },
    });
  });

  it("returns to an element with no overrides once none are left", () => {
    const overridden = setDeviceOverride(text, "tablet", { fontSize: 24 });

    expect(clearOverridesFor(overridden, ["fontSize", "text"])).toEqual(text);
  });

  it("ignores keys that are not overridden", () => {
    expect(clearOverridesFor(text, ["text"])).toEqual(text);
  });
});
