"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { AdminConversation } from "./chat-admin";

const ChatFeed = createContext<{
  conversations: AdminConversation[] | null;
  error: string;
}>({ conversations: null, error: "" });
export const useStaffChatFeed = () => useContext(ChatFeed);

export function StaffChatFeed({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<
    AdminConversation[] | null
  >(null);
  const [error, setError] = useState("");
  const path = usePathname();
  const router = useRouter();
  const pathRef = useRef(path);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    const seen = new Map<string, number>();
    let initialized = false;
    async function poll() {
      try {
        const response = await fetch("/api/admin/chat/conversations", {
          cache: "no-store",
          signal: abort.signal,
        });
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Session expired. Sign in again."
              : "Chat updates are reconnecting.",
          );
        const result = await response.json();
        if (!result.ok) throw new Error("Chat updates are reconnecting.");
        if (cancelled) return;
        const rows: AdminConversation[] = result.conversations;
        for (const row of rows) {
          const latest = row.messages[0];
          if (!latest) continue;
          if (
            initialized &&
            latest.sequence > (seen.get(row.id) ?? 0) &&
            ["GUEST", "CUSTOMER"].includes(latest.participantType) &&
            pathRef.current !== `/admin/chat/${row.id}`
          ) {
            toast("New customer message", {
              description: row.reference,
              action: {
                label: "Open chat",
                onClick: () => {
                  router.push(`/admin/chat/${row.id}`);
                },
              },
            });
          }
          seen.set(row.id, latest.sequence);
        }
        initialized = true;
        setConversations(rows);
        setError("");
      } catch (failure) {
        if (!cancelled)
          setError(
            failure instanceof Error
              ? failure.message
              : "Chat updates are reconnecting.",
          );
      } finally {
        if (!cancelled)
          timer = setTimeout(poll, document.hidden ? 15000 : 5000);
      }
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      abort.abort();
    };
  }, [router]);
  return (
    <ChatFeed.Provider value={{ conversations, error }}>
      {children}
    </ChatFeed.Provider>
  );
}

export function StaffChatBell() {
  const { conversations, error } = useStaffChatFeed();
  const waiting =
    conversations?.filter((row) =>
      ["QUEUED", "ASSIGNED", "WAITING_FOR_SUPPORT"].includes(row.status),
    ).length ?? 0;
  return (
    <Link
      href="/admin/chat"
      aria-label={`Support inbox: ${waiting} waiting`}
      className="border-border bg-surface-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
    >
      <Bell className="text-primary size-4" aria-hidden="true" />
      <span aria-live="polite">
        {error ? "Chat reconnecting" : `${waiting} waiting`}
      </span>
    </Link>
  );
}
