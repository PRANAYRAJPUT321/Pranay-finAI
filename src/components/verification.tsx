import { AlertTriangle, BadgeCheck } from "lucide-react";
import { Badge, fmtDate } from "./ui";

export function VerificationBadge({ status, verifiedAt }: { status: "VERIFIED" | "UNVERIFIED"; verifiedAt: Date | null }) {
  return status === "VERIFIED" ? (
    <Badge tone="green" title="Checked against the official source by a PD FinPrep administrator">
      <BadgeCheck className="h-3 w-3" aria-hidden /> Verified {fmtDate(verifiedAt)}
    </Badge>
  ) : (
    <Badge tone="amber" title="Not yet checked against the official source — confirm before relying on it">
      <AlertTriangle className="h-3 w-3" aria-hidden /> Unverified
    </Badge>
  );
}
