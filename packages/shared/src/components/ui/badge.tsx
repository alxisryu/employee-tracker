import { cva, type VariantProps } from "class-variance-authority"
import type { ScanOutcome } from "@prisma/client"

import { cn } from "../../lib/utils"

// ── Base Badge ────────────────────────────────────────────────────────────────

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border border-border text-foreground",
        // Semantic status colours
        green: "bg-green-100 text-green-700",
        blue: "bg-blue-100 text-blue-700",
        yellow: "bg-yellow-100 text-yellow-700",
        red: "bg-red-100 text-red-700",
        gray: "bg-gray-100 text-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// ── OutcomeBadge ──────────────────────────────────────────────────────────────

const OUTCOME_VARIANT: Record<
  ScanOutcome,
  VariantProps<typeof badgeVariants>["variant"]
> = {
  ACCEPTED_IN: "green",
  ACCEPTED_OUT: "blue",
  DUPLICATE_IGNORED: "yellow",
  UNKNOWN_TAG: "red",
  INACTIVE_TAG: "gray",
  INACTIVE_EMPLOYEE: "gray",
  DEVICE_UNAUTHORISED: "red",
}

const OUTCOME_LABEL: Record<ScanOutcome, string> = {
  ACCEPTED_IN: "In",
  ACCEPTED_OUT: "Out",
  DUPLICATE_IGNORED: "Duplicate",
  UNKNOWN_TAG: "Unknown tag",
  INACTIVE_TAG: "Inactive tag",
  INACTIVE_EMPLOYEE: "Inactive employee",
  DEVICE_UNAUTHORISED: "Unauthorised device",
}

function OutcomeBadge({ outcome }: { outcome: ScanOutcome }) {
  return (
    <Badge variant={OUTCOME_VARIANT[outcome]}>{OUTCOME_LABEL[outcome]}</Badge>
  )
}

export { Badge, badgeVariants, OutcomeBadge }
