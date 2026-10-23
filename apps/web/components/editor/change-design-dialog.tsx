"use client";

import { LayoutTemplate } from "lucide-react";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { usePortalEditorStore } from "@/lib/editor-store";
import { BrandDesignChooser } from "./brand-design-chooser";
import { TemplateGrid } from "./template-gallery";
import { WebsiteBranding } from "./website-branding";

export function ChangeDesignDialog() {
  const templateId = usePortalEditorStore((state) => state.templateId);
  const brand = usePortalEditorStore((state) => state.brand);
  const setTemplate = usePortalEditorStore((state) => state.setTemplate);
  const [open, setOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <LayoutTemplate />
            Change design
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change design</DialogTitle>
            <DialogDescription>
              Replaces your current design. You can undo this.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="templates" className="gap-4">
            <TabsList className="w-full">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="website">From your website</TabsTrigger>
            </TabsList>
            <TabsContent value="templates">
              <TemplateGrid
                selectedId={templateId}
                brand={brand}
                onSelect={(id) => {
                  setTemplate(id);
                  setOpen(false);
                }}
              />
            </TabsContent>
            <TabsContent value="website" className="grid gap-3">
              <WebsiteBranding
                onBrandReady={() => {
                  setOpen(false);
                  setChooserOpen(true);
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      {/* Outside the dialog so choosing a design still works after the dialog closes */}
      <BrandDesignChooser open={chooserOpen} onOpenChange={setChooserOpen} />
    </>
  );
}
