import type { ScanOutcome } from "@prisma/client";

type Variant = "green" | "red" | "yellow" | "gray" | "blue";

const variantClasses: Record<Variant, string> = {
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  gray: "bg-gray-100 text-gray-600",
  blue: "bg-blue-100 text-blue-800",
};

export function Badge({
  children,
  variant = "gray",
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}

// Map ScanOutcome enum values to badge variants.
const outcomeVariants: Record<ScanOutcome, Variant> = {
  ACCEPTED_IN: "green",
  ACCEPTED_OUT: "blue",
  DUPLICATE_IGNORED: "yellow",
  UNKNOWN_TAG: "red",
  INACTIVE_TAG: "gray",
  INACTIVE_EMPLOYEE: "gray",
  DEVICE_UNAUTHORISED: "red",
};

export function OutcomeBadge({ outcome }: { outcome: ScanOutcome }) {
  return (
    <Badge variant={outcomeVariants[outcome]}>
      {outcome.replace(/_/g, " ")}
    </Badge>
  );
}
