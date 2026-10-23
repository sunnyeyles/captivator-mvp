import {
  portalConfigSchema,
  templateIds,
  templates,
  type PortalConfig,
  type TemplateId,
} from "@repo/portal";
import { isDeepEqual } from "./equal";

export interface Design {
  id: string;
  name: string;
  templateId: TemplateId;
  config: PortalConfig;
  updatedAt: string;
}

export interface LiveDesign {
  designId: string;
  designName: string;
  templateId: TemplateId;
  config: PortalConfig;
  publishedAt: string;
}

export type DesignStatus = "draft" | "live" | "live-changed";

// The one boundary to a future backend, so the UI never touches storage directly
export interface DesignRepository {
  list(): Promise<Design[]>;
  get(id: string): Promise<Design | undefined>;
  create(templateId: TemplateId, name: string): Promise<Design>;
  rename(id: string, name: string): Promise<Design>;
  duplicate(id: string): Promise<Design>;
  save(
    id: string,
    changes: Pick<Design, "config" | "templateId">,
  ): Promise<Design>;
  remove(id: string): Promise<void>;
  publish(id: string): Promise<LiveDesign>;
  unpublish(): Promise<void>;
  getLive(): Promise<LiveDesign | undefined>;
}

export const DESIGNS_KEY = "captivator.designs";
export const LIVE_KEY = "captivator.live";
export const DEFAULT_DELAY_MS = 300;

function isTemplateId(value: unknown): value is TemplateId {
  return templateIds.some((id) => id === value);
}

// Storage is shared with whatever else ran in this browser, so anything malformed is dropped
function parseDesign(value: unknown): Design | null {
  if (typeof value !== "object" || value === null) return null;
  const record: Record<string, unknown> = { ...value };
  const { id, name, templateId, updatedAt } = record;
  const config = portalConfigSchema.safeParse(record.config);
  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof updatedAt !== "string" ||
    !isTemplateId(templateId) ||
    !config.success
  ) {
    return null;
  }
  return { id, name, templateId, config: config.data, updatedAt };
}

function parseLive(value: unknown): LiveDesign | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record: Record<string, unknown> = { ...value };
  const { designId, designName, templateId, publishedAt } = record;
  const config = portalConfigSchema.safeParse(record.config);
  if (
    typeof designId !== "string" ||
    typeof designName !== "string" ||
    typeof publishedAt !== "string" ||
    !isTemplateId(templateId) ||
    !config.success
  ) {
    return undefined;
  }
  return { designId, designName, templateId, config: config.data, publishedAt };
}

export function designStatus(
  design: Design,
  live: LiveDesign | undefined,
): DesignStatus {
  if (live?.designId !== design.id) return "draft";
  return isDeepEqual(design.config, live.config) ? "live" : "live-changed";
}

async function blobToDataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${blob.type};base64,${btoa(binary)}`;
}

async function persistentSrc(src: string) {
  return src.startsWith("blob:") ? blobToDataUrl(src) : src;
}

// Object URLs die with the tab, so saved images are inlined as data URLs until real asset storage exists
async function withPersistentImages(
  config: PortalConfig,
): Promise<PortalConfig> {
  const { logo } = config.branding;
  const { image } = config.background;
  return {
    ...config,
    branding: {
      ...config.branding,
      logo: logo && { ...logo, src: await persistentSrc(logo.src) },
    },
    background: {
      ...config.background,
      image: image && { ...image, src: await persistentSrc(image.src) },
    },
  };
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

// Fake latency makes loading and pending states behave the way a real backend would
export class LocalStorageDesignRepository implements DesignRepository {
  constructor(
    private readonly storage: Pick<
      Storage,
      "getItem" | "setItem" | "removeItem"
    >,
    private readonly delayMs = DEFAULT_DELAY_MS,
  ) {}

  private wait() {
    return new Promise<void>((resolve) => setTimeout(resolve, this.delayMs));
  }

  private read(): Design[] {
    const raw = this.storage.getItem(DESIGNS_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((item: unknown) => parseDesign(item) ?? []);
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
      return parseLive(JSON.parse(raw));
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
    await this.wait();
    return this.read().sort(byMostRecent);
  }

  async get(id: string) {
    await this.wait();
    return this.read().find((design) => design.id === id);
  }

  async create(templateId: TemplateId, name: string) {
    await this.wait();
    return this.put({
      id: crypto.randomUUID(),
      name,
      templateId,
      config: templates[templateId].config,
      updatedAt: new Date().toISOString(),
    });
  }

  async rename(id: string, name: string) {
    await this.wait();
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
    await this.wait();
    const original = this.find(id);
    return this.put({
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} copy`,
      updatedAt: new Date().toISOString(),
    });
  }

  async save(id: string, changes: Pick<Design, "config" | "templateId">) {
    await this.wait();
    const config = await withPersistentImages(changes.config);
    try {
      return this.put({
        ...this.find(id),
        templateId: changes.templateId,
        config,
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
    await this.wait();
    if (this.readLive()?.designId === id) {
      throw new Error("Take the live design offline before deleting it");
    }
    this.write(this.read().filter((design) => design.id !== id));
  }

  async publish(id: string) {
    await this.wait();
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
    await this.wait();
    this.storage.removeItem(LIVE_KEY);
  }

  async getLive() {
    await this.wait();
    return this.readLive();
  }
}

let browserRepository: DesignRepository | undefined;

// Created on first use because localStorage only exists in the browser
export function designRepository() {
  browserRepository ??= new LocalStorageDesignRepository(window.localStorage);
  return browserRepository;
}
