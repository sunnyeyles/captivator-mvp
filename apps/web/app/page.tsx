import { Wifi } from "lucide-react";
import { DesignsLibrary } from "@/components/designs/designs-library";
import { NewDesignDialog } from "@/components/designs/new-design-dialog";

export default function DesignsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex min-h-14 items-center border-b bg-card px-4 text-card-foreground">
        <div className="flex items-center gap-2 font-semibold">
          <Wifi className="size-5 text-primary" aria-hidden />
          <span>Captivator</span>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Designs</h1>
          <NewDesignDialog />
        </div>
        <DesignsLibrary />
      </main>
    </div>
  );
}
