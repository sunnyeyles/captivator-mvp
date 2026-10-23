import type { Metadata } from "next";
import { LivePortal } from "@/components/designs/live-portal";

export const metadata: Metadata = { title: "Live · Captivator" };

export default function LivePage() {
  return <LivePortal />;
}
