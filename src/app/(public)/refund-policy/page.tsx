import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Refund Policy",
};

export default function RefundPolicyPage() {
  return (
    <main id="main-content" className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <Badge variant="warning">Needs client review</Badge>
      <h1 className="display-type mt-4 text-4xl sm:text-5xl">Refund Policy</h1>
      <p className="text-text-secondary mt-5 leading-7">
        Final Refund Policy content has not been approved yet. The refund
        foundation records safe admin actions, but production terms must be
        supplied by the client before launch.
      </p>
    </main>
  );
}
