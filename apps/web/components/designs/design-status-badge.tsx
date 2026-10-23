import Link from "next/link";
import { Badge } from "@repo/ui/badge";
import type { DesignStatus } from "@/lib/designs";

export function DesignStatusBadge({ status }: { status: DesignStatus }) {
  if (status === "draft") return <Badge variant="outline">Draft</Badge>;

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge variant={status === "live" ? "default" : "secondary"}>
        {status === "live" ? "Live" : "Live · unpublished changes"}
      </Badge>
      {/* Relative so it sits above a card's stretched open link */}
      <Link
        href="/live"
        className="relative rounded-sm text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        View live
      </Link>
    </span>
  );
}
