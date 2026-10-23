import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@repo/ui/button";

export function FullPageLoading({ label }: { label: string }) {
  return (
    <p
      role="status"
      className="grid h-dvh place-items-center text-sm text-muted-foreground"
    >
      {label}
    </p>
  );
}

export function FullPageMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="grid h-dvh place-content-center justify-items-center gap-4 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button asChild variant="outline">
        <Link href="/">
          <ArrowLeft aria-hidden />
          Back to designs
        </Link>
      </Button>
    </main>
  );
}
