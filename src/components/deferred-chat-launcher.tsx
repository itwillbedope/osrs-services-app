"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const ChatLauncher = dynamic(
  () => import("@/components/chat-live").then((module) => module.ChatLauncher),
  { ssr: false },
);
/** Defer optional chat code until the critical page and images have loaded. */
export function DeferredChatLauncher() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 3500);
    return () => window.clearTimeout(timer);
  }, []);
  return ready ? <ChatLauncher /> : null;
}
