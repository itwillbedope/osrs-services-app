import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main id="main-content" className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <Badge variant="warning">Needs client review</Badge>
      <h1 className="display-type mt-4 text-4xl sm:text-5xl">
        Terms of Service
      </h1>
      <p className="text-text-secondary mt-5 leading-7">
        Final Terms of Service content has not been approved yet. Checkout links
        to this page as a launch-readiness hook, but production activation
        requires client-provided legal terms.
      </p>
    </main>
  );
}
