"use client";

import {
  guestFieldDefaults,
  guestFieldTypes,
  MAX_GUEST_FIELDS,
  type GuestFieldType,
} from "@repo/portal";
import {
  ArrowDown,
  ArrowUp,
  Mail,
  Phone,
  Plus,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@repo/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/toggle-group";
import { usePortalEditorStore } from "@/lib/editor-store";

const guestFieldIcons: Record<GuestFieldType, LucideIcon> = {
  name: User,
  email: Mail,
  phone: Phone,
};

function isGuestFieldType(value: string): value is GuestFieldType {
  return guestFieldTypes.some((type) => type === value);
}

export function GuestFieldsGroup() {
  const fields = usePortalEditorStore((state) => state.config.fields);
  const selectedElementId = usePortalEditorStore(
    (state) => state.selectedElementId,
  );
  const selectElement = usePortalEditorStore((state) => state.selectElement);
  const addField = usePortalEditorStore((state) => state.addField);
  const updateField = usePortalEditorStore((state) => state.updateField);
  const removeField = usePortalEditorStore((state) => state.removeField);
  const moveField = usePortalEditorStore((state) => state.moveField);

  const isFull = fields.length >= MAX_GUEST_FIELDS;

  return (
    <div className="grid gap-2">
      {fields.length > 0 ? (
        <ul className="grid gap-2">
          {fields.map((field, index) => {
            const Icon = guestFieldIcons[field.type];
            const name = field.label || guestFieldDefaults[field.type].label;
            const isSelected = field.id === selectedElementId;

            return (
              <li key={field.id} className="grid gap-2 rounded-md border p-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant={isSelected ? "secondary" : "ghost"}
                    size="sm"
                    className="min-w-0 flex-1 justify-start"
                    aria-pressed={isSelected}
                    onClick={() => selectElement(field.id)}
                  >
                    <Icon />
                    <span className="truncate">{name}</span>
                  </Button>
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
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-destructive"
                    aria-label={`Remove ${name}`}
                    onClick={() => removeField(field.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  aria-label={`${name} field type`}
                  className="w-full"
                  value={field.type}
                  // Radix emits an empty string when the active item is clicked again, which would clear the type
                  onValueChange={(value) =>
                    isGuestFieldType(value) &&
                    updateField(field.id, { type: value })
                  }
                >
                  {guestFieldTypes.map((type) => (
                    <ToggleGroupItem
                      key={type}
                      value={type}
                      className="flex-1 px-1 text-xs"
                      // A page asks for each kind of guest detail once
                      disabled={fields.some(
                        (other) => other.id !== field.id && other.type === type,
                      )}
                    >
                      {guestFieldDefaults[type].label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No guest fields. Guests connect with one tap.
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start"
        disabled={isFull}
        onClick={addField}
      >
        <Plus />
        Add field
      </Button>
      {isFull ? (
        <p className="text-sm text-muted-foreground">
          Guests fill in at most {MAX_GUEST_FIELDS} fields.
        </p>
      ) : null}
    </div>
  );
}
