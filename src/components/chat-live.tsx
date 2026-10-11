"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  ShieldAlert,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Availability = {
  liveEnabled: boolean;
  guestEnabled: boolean;
  customerEnabled: boolean;
  realtimeEnabled: boolean;
  launcherEnabled: boolean;
  availabilityMode: "OFFLINE" | "ONLINE" | "MAINTENANCE";
  offlineIntakeEnabled: boolean;
  message: string;
  pollingFallbackIntervalSeconds: number;
  maximumMessageLength: number;
  realtimeExpected: boolean;
  needsClientReview: boolean;
};

type ChatMessage = {
  id: string;
  sequence: number;
  participantType: "GUEST" | "CUSTOMER" | "STAFF" | "SYSTEM";
  messageType: "PUBLIC" | "STAFF_REPLY" | "SYSTEM" | "SAFETY_REDACTION";
  body: string;
  redactedAt: string | null;
  createdAt: string;
};

type Conversation = {
  id: string;
  reference: string;
  status: string;
  concurrencyVersion: number;
  messages: ChatMessage[];
};

type ApiResult<T> = T & { ok: boolean; message?: string };

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    return (await response.json()) as ApiResult<T>;
  } catch {
    return {
      ok: false,
      message: "Connection interrupted. Please retry.",
    } as ApiResult<T>;
  }
}

function idempotencyKey(prefix: string) {
  const random = crypto.getRandomValues(new Uint32Array(4));
  return `${prefix}-${Array.from(random).join("-")}`;
}

function messageLabel(type: ChatMessage["participantType"]) {
  if (type === "STAFF") return "Support";
  if (type === "CUSTOMER") return "You";
  if (type === "GUEST") return "You";
  return "System";
}

function statusLabel(status: string) {
  return status.toLowerCase().replace(/_/g, " ");
}

function ConnectionBadge({
  state,
}: {
  state: "checking" | "realtime" | "fallback" | "offline";
}) {
  const realtime = state === "realtime";
  return (
    <Badge
      variant={realtime ? "success" : state === "offline" ? "warning" : "info"}
    >
      {realtime || state === "fallback" ? (
        <Wifi className="size-3.5" aria-hidden="true" />
      ) : (
        <WifiOff className="size-3.5" aria-hidden="true" />
      )}
      {state === "checking"
        ? "Checking connection"
        : realtime
          ? "Real-time connected"
          : state === "offline"
            ? "Chat offline"
            : "Messages connected"}
    </Badge>
  );
}

function ChatTranscript({
  messages,
  typingLabel,
  compact = false,
}: {
  messages: ChatMessage[];
  typingLabel: string | null;
  compact?: boolean;
}) {
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current)
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [messages.length, typingLabel]);

  return (
    <div
      ref={transcriptRef}
      className={cn(
        "border-border bg-background/45 overflow-y-auto rounded-xl border p-3",
        compact ? "min-h-0 flex-1" : "h-[22rem]",
      )}
      role="log"
      aria-live="polite"
      aria-label="Chat transcript"
    >
      <div className="grid gap-3">
        {messages.length === 0 ? (
          <p className="text-text-muted text-sm">No messages yet.</p>
        ) : (
          messages.map((message) => {
            const mine =
              message.participantType === "GUEST" ||
              message.participantType === "CUSTOMER";
            return (
              <article
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-xl border px-3 py-2 text-sm leading-6",
                  mine
                    ? "border-primary/30 bg-primary/10 justify-self-end"
                    : message.messageType === "SAFETY_REDACTION"
                      ? "border-warning/40 bg-warning/10"
                      : "border-border bg-surface-2",
                )}
              >
                <p className="text-text-muted text-[0.68rem] font-bold uppercase">
                  {messageLabel(message.participantType)}
                </p>
                <p className="mt-1 break-words whitespace-pre-wrap">
                  {message.redactedAt
                    ? "[Message removed for safety]"
                    : message.body}
                </p>
              </article>
            );
          })
        )}
        {typingLabel ? (
          <p className="text-text-muted text-sm" role="status">
            {typingLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Composer({
  disabled,
  maximumLength,
  onSend,
  onTyping,
  compact = false,
}: {
  disabled: boolean;
  maximumLength: number;
  onSend: (body: string) => Promise<boolean>;
  onTyping: () => void;
  compact?: boolean;
}) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const remaining = maximumLength - body.length;

  async function submit(formData: FormData) {
    const value = String(formData.get("body") ?? "");
    if (!value.trim()) return;
    setPending(true);
    try {
      if (await onSend(value)) setBody("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="grid shrink-0 gap-2" noValidate>
      <label className="sr-only" htmlFor="chat-message-body">
        Message
      </label>
      <textarea
        id="chat-message-body"
        name="body"
        value={body}
        maxLength={maximumLength}
        disabled={disabled || pending}
        onChange={(event) => {
          setBody(event.target.value);
          onTyping();
        }}
        className={cn(
          "border-border-strong/70 bg-background/50 text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2",
          compact ? "h-16 resize-none" : "min-h-24 resize-y",
        )}
        placeholder="Type a plain-text message"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-text-muted text-xs">
          {remaining.toLocaleString()} characters remaining
        </p>
        <Button type="submit" disabled={disabled || pending || !body.trim()}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          Send
        </Button>
      </div>
    </form>
  );
}

export function ChatPanel({
  variant = "page",
  customer = false,
}: {
  variant?: "page" | "launcher";
  customer?: boolean;
}) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [connection, setConnection] = useState<
    "checking" | "realtime" | "fallback" | "offline"
  >("checking");
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [stateMessage, setStateMessage] = useState("");
  const [startPending, setStartPending] = useState(false);
  const [startForm, setStartForm] = useState({
    displayName: "",
    supportCategory: "",
    initialMessage: "",
    privacyAcknowledged: false,
  });
  const socketRef = useRef<Socket | null>(null);

  const canUseChat = useMemo(() => {
    if (!availability?.liveEnabled) return false;
    if (customer) return availability.customerEnabled;
    return availability.guestEnabled;
  }, [availability, customer]);

  const loadConversation = useCallback(async (conversationId: string) => {
    const result = await requestJson<{ conversation: Conversation }>(
      `/api/chat/conversations/${conversationId}`,
    );
    if (result.ok) {
      setConversation((current) =>
        !current ||
        result.conversation.concurrencyVersion >= current.concurrencyVersion
          ? result.conversation
          : current,
      );
    } else {
      setStateMessage(
        result.message ?? "Connection interrupted. Please retry.",
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void requestJson<{ conversations: Conversation[] }>(
      "/api/chat/conversations",
    ).then(async (result) => {
      const latest = result.ok ? result.conversations[0] : null;
      if (!cancelled && latest) await loadConversation(latest.id);
    });
    return () => {
      cancelled = true;
    };
  }, [loadConversation]);

  const conversationId = conversation?.id;

  useEffect(() => {
    let cancelled = false;
    void requestJson<{ availability: Availability }>(
      "/api/chat/availability",
    ).then((result) => {
      if (cancelled || !result.ok) return;
      setAvailability(result.availability);
      if (!result.availability.liveEnabled) setConnection("offline");
      else if (!result.availability.realtimeExpected) setConnection("fallback");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!availability || !conversationId || !canUseChat) return;
    const intervalSeconds = Math.max(
      5,
      availability.pollingFallbackIntervalSeconds,
    );
    const timer = window.setInterval(() => {
      void loadConversation(conversationId);
    }, intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [availability, canUseChat, conversationId, loadConversation]);

  useEffect(() => {
    if (
      !availability?.realtimeExpected ||
      !conversationId ||
      socketRef.current
    ) {
      return;
    }
    const socketUrl = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL;
    if (!socketUrl) {
      window.setTimeout(() => setConnection("fallback"), 0);
      return;
    }
    const socket = io(socketUrl, {
      path: process.env.NEXT_PUBLIC_CHAT_SOCKET_PATH ?? "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: {},
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit(
        "chat:join",
        { conversationId },
        (result: ApiResult<{ conversation: Conversation }>) => {
          if (result.ok) {
            setConnection("realtime");
            setConversation(result.conversation);
          } else {
            setConnection("fallback");
          }
        },
      );
    });
    socket.on("connect_error", () => setConnection("fallback"));
    socket.on("disconnect", () => setConnection("fallback"));
    socket.on(
      "chat:message",
      (payload: { conversationId: string; message: ChatMessage }) => {
        if (payload.conversationId !== conversationId) return;
        setConversation((current) => {
          if (!current) return current;
          if (
            current.messages.some(
              (message) => message.id === payload.message.id,
            )
          ) {
            return current;
          }
          return {
            ...current,
            messages: [...current.messages, payload.message],
          };
        });
      },
    );
    socket.on(
      "chat:typing",
      (payload: { conversationId: string; typing: boolean; label: string }) => {
        if (payload.conversationId !== conversationId) return;
        setTypingLabel(payload.typing ? payload.label : null);
      },
    );
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [availability?.realtimeExpected, conversationId]);

  async function startConversation(formData: FormData) {
    if (startPending) return;
    setStateMessage("");
    if (formData.get("privacyAcknowledged") !== "on") {
      setStateMessage("Acknowledge the chat safety reminder before starting.");
      return;
    }
    setStartPending(true);
    const result = await requestJson<{ conversation: Conversation }>(
      "/api/chat/conversations",
      {
        method: "POST",
        body: JSON.stringify({
          displayName: formData.get("displayName"),
          supportCategory: formData.get("supportCategory"),
          initialMessage: formData.get("initialMessage"),
          idempotencyKey: idempotencyKey("chat-start"),
        }),
      },
    );
    setStartPending(false);
    if (result.ok) {
      setConversation(result.conversation);
      return;
    }
    setStateMessage(result.message ?? "Chat could not be started.");
  }

  async function send(body: string) {
    if (!conversation) return false;
    setStateMessage("");
    const key = idempotencyKey("chat-message");
    if (socketRef.current?.connected && connection === "realtime") {
      return await new Promise<boolean>((resolve) => {
        socketRef.current?.emit(
          "chat:send",
          { conversationId: conversation.id, body, idempotencyKey: key },
          (result: ApiResult<{ conversation: Conversation }>) => {
            if (result.ok) setConversation(result.conversation);
            else setStateMessage(result.message ?? "Message was not sent.");
            resolve(result.ok);
          },
        );
      });
    }
    const result = await requestJson<{ conversation: Conversation }>(
      `/api/chat/conversations/${conversation.id}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ body, idempotencyKey: key }),
      },
    );
    if (result.ok) setConversation(result.conversation);
    else setStateMessage(result.message ?? "Message was not sent.");
    return result.ok;
  }

  function typing() {
    if (!conversation || connection !== "realtime") return;
    socketRef.current?.emit("chat:typing", {
      conversationId: conversation.id,
      typing: true,
    });
  }

  const panel = (
    <section
      className={cn(
        "support-chat-interface border-border bg-surface-1 gap-4 rounded-xl border p-4 shadow-2xl shadow-black/25",
        variant === "launcher" &&
          "support-chat-panel flex flex-col overflow-hidden",
        variant === "page" && "mx-auto grid max-w-4xl p-5 sm:p-6",
      )}
      aria-label="Support chat"
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          {variant === "page" && <Badge variant="info">Talk to our team</Badge>}
          <h2
            className={cn(
              "text-xl font-black uppercase",
              variant === "page" && "mt-3",
            )}
          >
            Support chat
          </h2>
          <p className="text-text-muted mt-1 text-xs">
            Never share passwords or payment details.
          </p>
        </div>
        <ConnectionBadge state={connection} />
      </div>

      {availability ? (
        <div className="border-border bg-background/35 shrink-0 rounded-xl border p-3 text-sm">
          <p className="font-semibold capitalize">
            {availability.availabilityMode.toLowerCase()} state
          </p>
          <p
            className={cn(
              "text-text-secondary mt-1",
              variant === "launcher" && "line-clamp-2 text-xs",
            )}
          >
            {availability.message}
          </p>
        </div>
      ) : null}

      {!canUseChat ? (
        <div className="border-warning/40 bg-warning/10 flex gap-3 rounded-xl border p-4 text-sm">
          <AlertTriangle
            className="text-warning size-5 shrink-0"
            aria-hidden="true"
          />
          <p>Chat is currently unavailable. Please try again shortly.</p>
        </div>
      ) : !conversation ? (
        <form
          action={startConversation}
          className={cn(
            "grid gap-4",
            variant === "launcher" && "min-h-0 flex-1 overflow-y-auto",
          )}
          noValidate
        >
          {stateMessage ? (
            <p
              role="alert"
              className="border-danger/30 bg-danger/10 rounded-xl border p-3 text-sm"
            >
              {stateMessage}
            </p>
          ) : null}
          {!customer ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Display name
                <Input
                  name="displayName"
                  maxLength={120}
                  value={startForm.displayName}
                  onChange={(event) =>
                    setStartForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Category
                <Input
                  name="supportCategory"
                  maxLength={80}
                  value={startForm.supportCategory}
                  onChange={(event) =>
                    setStartForm((current) => ({
                      ...current,
                      supportCategory: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          ) : null}
          <label className="grid gap-2 text-sm font-semibold">
            Initial message
            <textarea
              name="initialMessage"
              required
              maxLength={availability?.maximumMessageLength ?? 2000}
              value={startForm.initialMessage}
              onChange={(event) =>
                setStartForm((current) => ({
                  ...current,
                  initialMessage: event.target.value,
                }))
              }
              className="border-border-strong/70 bg-background/50 text-text-primary focus:border-primary focus:ring-primary/20 min-h-32 rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
            />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              name="privacyAcknowledged"
              type="checkbox"
              required
              checked={startForm.privacyAcknowledged}
              onChange={(event) =>
                setStartForm((current) => ({
                  ...current,
                  privacyAcknowledged: event.target.checked,
                }))
              }
            />
            <span>
              I understand chat is plain text and must not include credentials.
            </span>
          </label>
          <Button type="submit" disabled={startPending}>
            <MessageCircle className="size-4" aria-hidden="true" />
            {startPending ? "Connecting…" : "Start chat"}
          </Button>
        </form>
      ) : (
        <div
          className={cn(
            "gap-3",
            variant === "launcher" ? "flex min-h-0 flex-1 flex-col" : "grid",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-text-muted text-xs font-bold uppercase">
                {conversation.reference}
              </p>
              <p className="font-semibold capitalize">
                {statusLabel(conversation.status)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadConversation(conversation.id)}
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
          {stateMessage ? (
            <p
              role="alert"
              className="border-danger/30 bg-danger/10 rounded-xl border p-3 text-sm"
            >
              {stateMessage}
            </p>
          ) : null}
          <ChatTranscript
            compact={variant === "launcher"}
            messages={conversation.messages}
            typingLabel={typingLabel}
          />
          <Composer
            compact={variant === "launcher"}
            disabled={["CLOSED", "ARCHIVED", "SPAM"].includes(
              conversation.status,
            )}
            maximumLength={availability?.maximumMessageLength ?? 2000}
            onSend={send}
            onTyping={typing}
          />
        </div>
      )}
    </section>
  );

  if (variant === "page") return panel;
  return panel;
}

export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);

  useEffect(() => {
    void requestJson<{ availability: Availability }>(
      "/api/chat/availability",
    ).then((result) => {
      if (result.ok) setAvailability(result.availability);
    });
  }, []);

  if (!availability?.launcherEnabled) return null;

  return (
    <div className="support-chat-interface support-chat-launcher fixed right-4 z-50 grid max-w-[calc(100vw-2rem)] justify-items-end gap-3">
      {opened ? (
        <div hidden={!open} className="w-[min(26rem,calc(100vw-2rem))]">
          <div className="mb-2 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setOpen(false)}
              aria-label="Close support chat"
            >
              <X className="size-4" aria-hidden="true" />
              Close
            </Button>
          </div>
          <ChatPanel variant="launcher" />
          <Link
            href="/support"
            className="text-primary mt-2 block text-right text-xs font-bold"
          >
            Open full chat page
          </Link>
        </div>
      ) : null}
      <Button
        type="button"
        onClick={() => {
          setOpened(true);
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-label="Open support chat"
        className="shadow-[0_16px_40px_rgb(0_0_0_/_0.35)]"
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        Support chat
      </Button>
      {!availability.liveEnabled ? (
        <span className="sr-only">Live chat is unavailable.</span>
      ) : null}
    </div>
  );
}

export function ChatSafetyPanel() {
  return (
    <div className="border-warning/30 bg-warning/10 flex gap-3 rounded-xl border p-4 text-sm">
      <ShieldAlert
        className="text-warning size-5 shrink-0"
        aria-hidden="true"
      />
      <p>
        Chat stores plain-text transcripts for support review. Never send
        credentials, payment card data, wallet seeds, recovery details or
        session cookies.
      </p>
    </div>
  );
}
