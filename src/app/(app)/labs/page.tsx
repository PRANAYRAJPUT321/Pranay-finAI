import { PageHeader } from "@/components/ui";
import { FormulaLabs } from "@/components/formula-labs";
import { requireUser } from "@/server/auth/current";

export const metadata = { title: "3D Formula Labs" };

export default async function LabsPage() {
  await requireUser();
  return (
    <>
      <PageHeader eyebrow="Study / Interactive 3D" title="3D Formula Labs" description="See formulas as shapes. Rotate living surfaces for bond pricing, compounding and diversification, change the inputs, and read exact values anywhere on the surface. It builds intuition no table of numbers can." />
      <FormulaLabs />
    </>
  );
}
