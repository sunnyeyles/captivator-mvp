import {
  brandedConfig,
  brandProfileSchema,
  portalConfigSchema,
  templateIds,
  type BrandProfile,
  type PortalConfig,
  type TemplateId,
} from "@repo/portal";
import { z } from "zod";
import { isDeepEqual } from "./equal";
import { isObjectUrl, mapImageSrcs } from "./images";

const designSchema = z.object({
  id: z.string(),
  name: z.string(),
  templateId: z.enum(templateIds),
  config: portalConfigSchema,
  // Kept so template switches and resets in a reopened design stay branded, and absent on designs saved before branding existed
  brand: brandProfileSchema.nullable().default(null),
  updatedAt: z.string(),
});

const liveDesignSchema = z.object({
  designId: z.string(),
  designName: z.string(),
  templateId: z.enum(templateIds),
  config: portalConfigSchema,
  publishedAt: z.string(),
});

export type Design = z.infer<typeof designSchema>;
export type LiveDesign = z.infer<typeof liveDesignSchema>;
export type DesignContent = Pick<Design, "config" | "templateId" | "brand">;

export type DesignStatus = "draft" | "live" | "live-changed";

// The one boundary to a future backend, so the UI never touches storage directly
interface DesignRepository {
  list(): Promise<Design[]>;
  get(id: string): Promise<Design | undefined>;
  create(
    templateId: TemplateId,
    name: string,
    brand?: BrandProfile | null,
  ): Promise<Design>;
  rename(id: string, name: string): Promise<Design>;
  duplicate(id: string): Promise<Design>;
  save(id: string, changes: DesignContent): Promise<Design>;
  remove(id: string): Promise<void>;
  publish(id: string): Promise<LiveDesign>;
  unpublish(): Promise<void>;
  getLive(): Promise<LiveDesign | undefined>;
}

export const DESIGNS_KEY = "captivator.designs";
const LIVE_KEY = "captivator.live";

export function designStatus(
  design: Design,
  live: LiveDesign | undefined,
): DesignStatus {
  if (live?.designId !== design.id) return "draft";
  return isDeepEqual(design.config, live.config) ? "live" : "live-changed";
}

// Publishing a design while another is live replaces it, so callers confirm first
export function replacesOtherLive(
  design: Design,
  live: LiveDesign | undefined,
) {
  return live !== undefined && live.designId !== design.id;
}

async function blobToDataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${blob.type};base64,${btoa(binary)}`;
}

// Object URLs die with the tab, so saved images are inlined as data URLs until real asset storage exists
function withPersistentImages(config: PortalConfig) {
  return mapImageSrcs(config, (src) =>
    isObjectUrl(src) ? blobToDataUrl(src) : src,
  );
}

function isQuotaError(error: unknown) {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}

function storageFullError(error: unknown, message: string) {
  return isQuotaError(error) ? new Error(message, { cause: error }) : error;
}

function byMostRecent(a: Design, b: Design) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export class LocalStorageDesignRepository implements DesignRepository {
  constructor(
    private readonly storage: Pick<
      Storage,
      "getItem" | "setItem" | "removeItem"
    >,
  ) {}

  private read(): Design[] {
    const raw = this.storage.getItem(DESIGNS_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Storage is shared with whatever else ran in this browser, so anything malformed is dropped
      return parsed.flatMap((item: unknown) => {
        const design = designSchema.safeParse(item);
        return design.success ? [design.data] : [];
      });
    } catch {
      return [];
    }
  }

  private write(designs: Design[]) {
    this.storage.setItem(DESIGNS_KEY, JSON.stringify(designs));
  }

  private readLive() {
    const raw = this.storage.getItem(LIVE_KEY);
    if (!raw) return undefined;
    try {
      return liveDesignSchema.safeParse(JSON.parse(raw)).data;
    } catch {
      return undefined;
    }
  }

  private find(id: string) {
    const design = this.read().find((candidate) => candidate.id === id);
    if (!design) throw new Error(`Design ${id} not found`);
    return design;
  }

  private put(design: Design) {
    const others = this.read().filter(
      (candidate) => candidate.id !== design.id,
    );
    this.write([design, ...others]);
    return design;
  }

  async list() {
    return this.read().sort(byMostRecent);
  }

  async get(id: string) {
    return this.read().find((design) => design.id === id);
  }

  async create(
    templateId: TemplateId,
    name: string,
    brand: BrandProfile | null = null,
  ) {
    return this.put({
      id: crypto.randomUUID(),
      name,
      templateId,
      config: brandedConfig(templateId, brand),
      brand,
      updatedAt: new Date().toISOString(),
    });
  }

  async rename(id: string, name: string) {
    const live = this.readLive();
    // Only the label follows a rename, so the snapshot guests see stays frozen
    if (live?.designId === id) {
      this.storage.setItem(
        LIVE_KEY,
        JSON.stringify({ ...live, designName: name }),
      );
    }
    return this.put({
      ...this.find(id),
      name,
      updatedAt: new Date().toISOString(),
    });
  }

  async duplicate(id: string) {
    const original = this.find(id);
    return this.put({
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} copy`,
      updatedAt: new Date().toISOString(),
    });
  }

  async save(id: string, changes: DesignContent) {
    const config = await withPersistentImages(changes.config);
    try {
      return this.put({
        ...this.find(id),
        templateId: changes.templateId,
        config,
        brand: changes.brand,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw storageFullError(
        error,
        "Storage is full, so this design wasn't saved",
      );
    }
  }

  async remove(id: string) {
    if (this.readLive()?.designId === id) {
      throw new Error("Take the live design offline before deleting it");
    }
    this.write(this.read().filter((design) => design.id !== id));
  }

  async publish(id: string) {
    const design = this.find(id);
    const live: LiveDesign = {
      designId: design.id,
      designName: design.name,
      templateId: design.templateId,
      config: design.config,
      publishedAt: new Date().toISOString(),
    };
    try {
      this.storage.setItem(LIVE_KEY, JSON.stringify(live));
    } catch (error) {
      throw storageFullError(
        error,
        "Storage is full, so this design wasn't published",
      );
    }
    return live;
  }

  async unpublish() {
    this.storage.removeItem(LIVE_KEY);
  }

  async getLive() {
    return this.readLive();
  }
}

let browserRepository: DesignRepository | undefined;

// Created on first use because localStorage only exists in the browser
export function designRepository() {
  browserRepository ??= new LocalStorageDesignRepository(window.localStorage);
  return browserRepository;
}
