import {
  brandedConfig,
  defaultBackgroundImageSettings,
  templates,
  type BrandProfile,
} from "@repo/portal";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DESIGNS_KEY,
  designStatus,
  LocalStorageDesignRepository,
} from "./designs";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

let storage: ReturnType<typeof memoryStorage>;
let repository: LocalStorageDesignRepository;

beforeEach(() => {
  storage = memoryStorage();
  repository = new LocalStorageDesignRepository(storage);
});

describe("LocalStorageDesignRepository", () => {
  it("starts empty", async () => {
    expect(await repository.list()).toEqual([]);
  });

  it("creates a design from a template", async () => {
    const design = await repository.create("event", "Event");

    expect(design).toMatchObject({
      name: "Event",
      templateId: "event",
      config: templates.event.config,
    });
    expect(await repository.get(design.id)).toEqual(design);
    expect(await repository.list()).toEqual([design]);
  });

  it("returns nothing for an unknown id", async () => {
    await repository.create("minimal", "Minimal");

    expect(await repository.get("missing")).toBeUndefined();
  });

  it("round-trips rename, duplicate, save and remove", async () => {
    const original = await repository.create("minimal", "Minimal");

    const renamed = await repository.rename(original.id, "Lobby");
    expect(renamed.name).toBe("Lobby");

    const copy = await repository.duplicate(original.id);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("Lobby copy");
    expect(copy.config).toEqual(original.config);

    const saved = await repository.save(original.id, {
      config: templates.corporate.config,
      templateId: "corporate",
      brand: null,
    });
    expect(await repository.get(original.id)).toEqual(saved);
    expect(saved).toMatchObject({ name: "Lobby", templateId: "corporate" });

    await repository.remove(copy.id);
    expect(await repository.list()).toEqual([saved]);
  });

  it("keeps designs across instances on the same storage", async () => {
    const design = await repository.create("event", "Event");

    const reopened = new LocalStorageDesignRepository(storage);

    expect(await reopened.get(design.id)).toEqual(design);
  });

  it("lists the most recently edited design first", async () => {
    const first = await repository.create("minimal", "First");
    const second = await repository.create("event", "Second");
    storage.setItem(
      DESIGNS_KEY,
      JSON.stringify([
        { ...second, updatedAt: "2026-01-01T00:00:00.000Z" },
        { ...first, updatedAt: "2026-01-02T00:00:00.000Z" },
      ]),
    );

    const names = (await repository.list()).map((design) => design.name);

    expect(names).toEqual(["First", "Second"]);
  });

  it("keeps the brand a design was saved with", async () => {
    const brand: BrandProfile = {
      sourceUrl: "https://acme.example/",
      name: "Acme Coffee",
      logo: null,
      image: null,
      imageRecommended: null,
      colors: [],
      primaryColor: null,
      missing: ["logo", "image", "colors"],
    };
    const design = await repository.create("minimal", "Minimal");
    expect(design.brand).toBeNull();

    await repository.save(design.id, {
      config: brandedConfig("event", brand),
      templateId: "event",
      brand,
    });

    expect((await repository.get(design.id))?.brand).toEqual(brand);
  });

  it("reads a design saved before branding as unbranded", async () => {
    const design = await repository.create("minimal", "Older");
    // JSON drops undefined, so the stored record has no brand key at all
    storage.setItem(
      DESIGNS_KEY,
      JSON.stringify([{ ...design, brand: undefined }]),
    );

    expect(await repository.get(design.id)).toEqual(design);
  });

  it("rejects changes to an unknown design", async () => {
    await expect(repository.rename("missing", "Name")).rejects.toThrow();
    await expect(repository.duplicate("missing")).rejects.toThrow();
  });

  it("ignores malformed stored data", async () => {
    storage.setItem(DESIGNS_KEY, "not json");
    expect(await repository.list()).toEqual([]);

    storage.setItem(DESIGNS_KEY, JSON.stringify([{ id: 1 }]));
    expect(await repository.list()).toEqual([]);
  });

  it("saves uploaded images as data URLs so they survive a reload", async () => {
    const design = await repository.create("minimal", "Minimal");
    const logoUrl = URL.createObjectURL(
      new Blob(["logo"], { type: "image/png" }),
    );
    const backgroundUrl = URL.createObjectURL(
      new Blob(["background"], { type: "image/jpeg" }),
    );
    const { config } = templates.minimal;

    await repository.save(design.id, {
      templateId: "minimal",
      brand: null,
      config: {
        ...config,
        branding: { ...config.branding, logo: { src: logoUrl, alt: "Logo" } },
        background: {
          ...config.background,
          image: { ...defaultBackgroundImageSettings, src: backgroundUrl },
        },
      },
    });
    URL.revokeObjectURL(logoUrl);
    URL.revokeObjectURL(backgroundUrl);

    const reopened = new LocalStorageDesignRepository(storage);
    const saved = await reopened.get(design.id);
    expect(saved?.config.branding.logo?.src).toBe(
      `data:image/png;base64,${btoa("logo")}`,
    );
    expect(saved?.config.background.image?.src).toBe(
      `data:image/jpeg;base64,${btoa("background")}`,
    );
  });

  it("returns a full storage as a save failure", async () => {
    const design = await repository.create("minimal", "Minimal");
    const full = new LocalStorageDesignRepository({
      ...storage,
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
    });

    await expect(
      full.save(design.id, {
        config: templates.corporate.config,
        templateId: "corporate",
        brand: null,
      }),
    ).rejects.toThrow("Storage is full");
    expect(await repository.get(design.id)).toEqual(design);
  });
});

describe("publishing", () => {
  it("has nothing live until a design is published", async () => {
    expect(await repository.getLive()).toBeUndefined();
  });

  it("publishes a snapshot of the saved design", async () => {
    const design = await repository.create("event", "Event");

    const live = await repository.publish(design.id);

    expect(live).toMatchObject({
      designId: design.id,
      designName: "Event",
      templateId: "event",
      config: design.config,
    });
    expect(await repository.getLive()).toEqual(live);
  });

  it("replaces the previous live design", async () => {
    const first = await repository.create("minimal", "First");
    const second = await repository.create("event", "Second");
    await repository.publish(first.id);

    await repository.publish(second.id);

    expect((await repository.getLive())?.designId).toBe(second.id);
  });

  it("keeps the snapshot when the design is saved later", async () => {
    const design = await repository.create("minimal", "Minimal");
    const live = await repository.publish(design.id);

    await repository.save(design.id, {
      config: templates.corporate.config,
      templateId: "corporate",
      brand: null,
    });

    expect((await repository.getLive())?.config).toEqual(live.config);
  });

  it("follows a rename of the live design", async () => {
    const design = await repository.create("minimal", "Minimal");
    await repository.publish(design.id);

    await repository.rename(design.id, "Lobby");

    expect((await repository.getLive())?.designName).toBe("Lobby");
  });

  it("refuses to delete the live design", async () => {
    const design = await repository.create("minimal", "Minimal");
    await repository.publish(design.id);

    await expect(repository.remove(design.id)).rejects.toThrow("offline");
    expect(await repository.get(design.id)).toEqual(design);
  });

  it("clears the live design when unpublished", async () => {
    const design = await repository.create("minimal", "Minimal");
    await repository.publish(design.id);

    await repository.unpublish();

    expect(await repository.getLive()).toBeUndefined();
    await repository.remove(design.id);
    expect(await repository.list()).toEqual([]);
  });
});

describe("designStatus", () => {
  it("is draft when the design isn't live", async () => {
    const design = await repository.create("minimal", "Minimal");
    const other = await repository.create("event", "Event");

    expect(designStatus(design, undefined)).toBe("draft");
    expect(designStatus(design, await repository.publish(other.id))).toBe(
      "draft",
    );
  });

  it("is live when the saved config matches the snapshot", async () => {
    const design = await repository.create("minimal", "Minimal");

    expect(designStatus(design, await repository.publish(design.id))).toBe(
      "live",
    );
  });

  it("is live-changed when the saved config differs from the snapshot", async () => {
    const design = await repository.create("minimal", "Minimal");
    const live = await repository.publish(design.id);

    const saved = await repository.save(design.id, {
      config: templates.corporate.config,
      templateId: "corporate",
      brand: null,
    });

    expect(designStatus(saved, live)).toBe("live-changed");
  });
});
