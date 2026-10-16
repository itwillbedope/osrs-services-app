"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Custom service requests enter the existing secured human-support queue, with
 * the same guest ownership, rate limits, audit history and staff notifications. */
export function CustomOrderForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const requestKey = useRef<string | null>(null);
  async function submit(data: FormData) {
    setPending(true);
    setError("");
    requestKey.current ??= crypto.randomUUID();
    const text = [
      "CUSTOM SERVICE ORDER REQUEST",
      `Service: ${data.get("category")}`,
      `Account game mode: ${data.get("gameMode")}`,
      `Account build: ${data.get("build")}`,
      `Goal and scope: ${data.get("goal")}`,
      `Current progress / unlocks / gear: ${data.get("progress")}`,
      `Preferred timing: ${data.get("timing") || "Flexible"}`,
      `Budget (optional): ${data.get("budget") || "Please quote"}`,
      `Contact (optional): ${data.get("contact") || "Reply in this chat"}`,
      "Customer will supply all required gear and supplies. Scope, price and timing require staff agreement before any order or payment.",
    ].join("\n");
    try {
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: data.get("name"),
          supportCategory: "Custom order",
          initialMessage: text,
          idempotencyKey: requestKey.current,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(
          result.message ?? "Your request could not be sent. Please try again.",
        );
      setReference(result.conversation.reference);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Connection failed. Your details remain in this form; please retry.",
      );
    } finally {
      setPending(false);
    }
  }
  if (reference)
    return (
      <div className="store-panel custom-order-success" role="status">
        <CheckCircle2 />
        <h2>Request received</h2>
        <p>
          Your reference is <strong>{reference}</strong>. Our team will review
          your goals and confirm the scope, price and timing.
        </p>
        <p>
          Keep this browser to return to your private conversation. You have not
          placed a paid order.
        </p>
        <Link href="/support" className="store-primary-button">
          Open your conversation
        </Link>
      </div>
    );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending) void submit(new FormData(event.currentTarget));
      }}
      aria-busy={pending}
      className="store-panel custom-order-form"
    >
      <h2>Tell us what you need</h2>
      <p className="cape-muted">
        A mixed service, an unusual account build, or something missing from the
        catalogue — describe it here. No payment is taken with this request.
      </p>
      <div className="custom-order-fields">
        <label className="store-field">
          Your name
          <input name="name" autoComplete="name" required maxLength={80} />
        </label>
        <label className="store-field">
          Service category
          <select name="category">
            <option>Mixed services</option>
            <option>Skilling</option>
            <option>Bossing / Raids</option>
            <option>Quests / Diaries</option>
            <option>Infernal Cape / Quiver</option>
            <option>Minigames / Gathering</option>
            <option>Other goal</option>
          </select>
        </label>
        <label className="store-field">
          Account game mode
          <select name="gameMode">
            <option>Normal account</option>
            <option>Ironman</option>
            <option>Group Ironman</option>
            <option>Ultimate Ironman</option>
            <option>Other / please review</option>
          </select>
        </label>
        <label className="store-field">
          Account build
          <input
            name="build"
            placeholder="Main, pure, zerker or other restrictions"
            required
            maxLength={100}
          />
        </label>
        <label className="store-field custom-order-wide">
          Your goal and requested service
          <textarea
            name="goal"
            rows={5}
            required
            minLength={20}
            maxLength={650}
            placeholder="Describe what you want completed, including quantities or target levels."
          />
        </label>
        <label className="store-field custom-order-wide">
          Current progress, unlocks and available equipment
          <textarea
            name="progress"
            rows={3}
            required
            maxLength={350}
            placeholder="Relevant stats, completed quests, gear and account restrictions. Never send login details."
          />
        </label>
        <label className="store-field">
          Preferred timing
          <input
            name="timing"
            maxLength={80}
            placeholder="Flexible or a preferred date"
          />
        </label>
        <label className="store-field">
          Budget (optional)
          <input
            name="budget"
            maxLength={60}
            placeholder="Amount and currency"
          />
        </label>
        <label className="store-field custom-order-wide">
          Contact email or Discord (optional)
          <input
            name="contact"
            maxLength={120}
            placeholder="You can also receive the reply in live chat here"
          />
        </label>
      </div>
      <label className="custom-order-consent">
        <input type="checkbox" required />I agree to the{" "}
        <Link href="/privacy">privacy policy</Link> and understand that a quote
        must be confirmed before ordering. I will provide all required gear and
        supplies.
      </label>
      {error && (
        <p role="alert" className="store-error">
          {error} <Link href="/support">Contact Live Chat</Link>
        </p>
      )}
      <Button type="submit" disabled={pending}>
        <Send aria-hidden="true" className="size-4" />
        {pending ? "Sending request…" : "Request my custom quote"}
      </Button>
      <p className="cape-muted">
        Never share game passwords, bank PINs, authenticator codes or payment
        details.
      </p>
    </form>
  );
}
