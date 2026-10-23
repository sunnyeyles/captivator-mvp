"use client";

import {
  CONNECT_BUTTON_ID,
  guestFieldDefaults,
  LOGO_ELEMENT_ID,
  MAX_GUEST_FIELDS,
  type GuestFieldType,
} from "@repo/portal";
import {
  ArrowDown,
  ArrowUp,
  Image,
  Mail,
  Phone,
  Plus,
  RectangleHorizontal,
  Type,
  User,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@repo/ui/button";
import { usePortalEditorStore } from "@/lib/editor-store";
import { LogoControls } from "./logo-controls";

const guestFieldIcons: Record<GuestFieldType, LucideIcon> = {
  name: User,
  email: Mail,
  phone: Phone,
};

function ElementRow({
  icon: Icon,
  name,
  onSelect,
  children,
}: {
  icon: LucideIcon;
  name: string;
  onSelect: () => void;
  children?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="min-w-0 flex-1 justify-start"
        onClick={onSelect}
      >
        <Icon />
        <span className="truncate">{name}</span>
      </Button>
      {children}
    </li>
  );
}

export function ElementList() {
  const hasLogo = usePortalEditorStore(
    (state) => state.config.branding.logo !== null,
  );
  const texts = usePortalEditorStore((state) => state.config.texts);
  const fields = usePortalEditorStore((state) => state.config.fields);
  const selectElement = usePortalEditorStore((state) => state.selectElement);
  const addText = usePortalEditorStore((state) => state.addText);
  const addField = usePortalEditorStore((state) => state.addField);
  const moveField = usePortalEditorStore((state) => state.moveField);

  const isFull = fields.length >= MAX_GUEST_FIELDS;

  return (
    <div className="grid gap-3">
      {hasLogo ? null : <LogoControls />}
      <ul className="grid gap-1">
        {hasLogo ? (
          <ElementRow
            icon={Image}
            name="Logo"
            onSelect={() => selectElement(LOGO_ELEMENT_ID)}
          />
        ) : null}
        {texts.map((text) => (
          <ElementRow
            key={text.id}
            icon={Type}
            name={text.text.trim() || "Empty text"}
            onSelect={() => selectElement(text.id)}
          />
        ))}
        {fields.map((field, index) => {
          const name = field.label || guestFieldDefaults[field.type].label;
          return (
            <ElementRow
              key={field.id}
              icon={guestFieldIcons[field.type]}
              name={name}
              onSelect={() => selectElement(field.id)}
            >
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Move ${name} up`}
                disabled={index === 0}
                onClick={() => moveField(field.id, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Move ${name} down`}
                disabled={index === fields.length - 1}
                onClick={() => moveField(field.id, 1)}
              >
                <ArrowDown />
              </Button>
            </ElementRow>
          );
        })}
        <ElementRow
          icon={RectangleHorizontal}
          name="Connect button"
          onSelect={() => selectElement(CONNECT_BUTTON_ID)}
        />
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={addText}>
          <Plus />
          Add text
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isFull}
          onClick={addField}
        >
          <Plus />
          Add field
        </Button>
      </div>
      {isFull ? (
        <p className="text-sm text-muted-foreground">
          Guests fill in at most {MAX_GUEST_FIELDS} fields.
        </p>
      ) : null}
    </div>
  );
}
