"use client";

import { templateIds, templates } from "@repo/portal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { usePortalEditorStore } from "@/lib/editor-store";

export function TemplatePicker() {
  const templateId = usePortalEditorStore((state) => state.templateId);
  const setTemplate = usePortalEditorStore((state) => state.setTemplate);

  return (
    <Select
      value={templateId}
      onValueChange={(value) => {
        const id = templateIds.find((candidate) => candidate === value);
        if (id) setTemplate(id);
      }}
    >
      <SelectTrigger size="sm" aria-label="Template" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {templateIds.map((id) => (
          <SelectItem key={id} value={id}>
            {templates[id].name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
