"use client";
import type { Tournament } from "@/lib/types";
import { Badge } from "./ui";

export function StatusBadge({ status }: { status: Tournament["status"] }) {
  if (status === "live")
    return (
      <Badge color="lime">
        <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-lime" /><span className="relative size-1.5 rounded-full bg-lime" /></span>
        Live
      </Badge>
    );
  if (status === "completed") return <Badge>Completed</Badge>;
  return <Badge color="amber">Upcoming</Badge>;
}
