import type { Metadata } from "next";

import { ChatPanel, ChatSafetyPanel } from "@/components/chat-live";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Support chat",
  robots: { index: true, follow: true },
};

export default function PublicSupportPage() {
  return (
    <main
      id="main-content"
      className="support-chat-interface min-h-screen px-5 py-12 sm:px-8"
    >
      <div className="mx-auto max-w-4xl">
        <Badge variant="info">Custom live chat</Badge>
        <h1 className="display-type mt-4 text-4xl font-black uppercase sm:text-5xl">
          Support chat
        </h1>
        <p className="text-text-secondary mt-4 max-w-2xl text-sm leading-6">
          Speak with our support team about services, orders or your account.
          Replies appear here automatically, and your conversation stays
          available when you return in this browser.
        </p>
        <div className="mt-6">
          <ChatSafetyPanel />
        </div>
      </div>
      <div className="mt-8">
        <ChatPanel />
      </div>
    </main>
  );
}
