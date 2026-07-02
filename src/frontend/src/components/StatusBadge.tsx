import { cn } from "@/lib/utils";
import type { StatusTone } from "@/types/foundation";

/**
 * Status badge for a position tile.
 *
 * - inTraining  → gold (text-in-training / bg-in-training), gentle pulse
 * - certified   → navy background, light-blue text
 * - notStarted  → muted gray
 *
 * Flat styling only — no gradients. Labels are uppercase via font-heading.
 */
export function StatusBadge({
  tone,
  className,
}: {
  tone: StatusTone;
  className?: string;
}) {
  const { label, classes } = BADGE[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5",
        "font-heading text-[0.65rem] font-semibold uppercase tracking-wider",
        "leading-none whitespace-nowrap",
        classes,
        className,
      )}
      data-ocid={
        tone === "inTraining"
          ? "status.badge.in_training"
          : tone === "certified"
            ? "status.badge.certified"
            : "status.badge.not_started"
      }
    >
      {tone === "inTraining" && (
        <span
          className="size-1.5 rounded-full bg-in-training animate-in-training"
          aria-hidden
        />
      )}
      {label}
    </span>
  );
}

const BADGE: Record<StatusTone, { label: string; classes: string }> = {
  inTraining: {
    label: "In training",
    classes: "bg-in-training text-in-training-foreground animate-in-training",
  },
  certified: {
    label: "Certified",
    // navy background (#0A2A5E) with light-blue text
    classes: "bg-secondary text-[oklch(0.82_0.09_235)]",
  },
  notStarted: {
    label: "Not started",
    classes: "bg-muted text-muted-foreground",
  },
};
