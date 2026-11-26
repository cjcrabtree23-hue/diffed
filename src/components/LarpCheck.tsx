"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Item, LarpQuestion } from "@/lib/types";
import { PASS_MARK, QUIZ_LENGTH, SECONDS_PER_QUESTION } from "@/lib/tiers";

type Props = {
  item: Item;
  tierName: string | null;
  signedIn: boolean;
  loginHref: string;
  certified: boolean;
  cooldownUntil: number | null;
  now: number;
  onPass: () => void;
  onFail: (cooldownUntil: number) => void;
};

type Phase = "intro" | "loading" | "question" | "submitting" | "result";
type Result = { score: number; total: number; passed: boolean; timed_out: boolean; cooldown_until: string | null };

function friendlyError(message: string) {
  if (message.startsWith("Cooldown until")) return "You're on cooldown for this one. Try again later.";
  if (message.includes("Already certified")) return "You're already certified on this one.";
  return message || "Something went wrong. Try again.";
}

export function LarpCheck(props: Props) {
  const { item, tierName, signedIn, loginHref, certified, cooldownUntil, now, onPass, onFail } = props;
  const [phase, setPhase] = useState<Phase>("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<LarpQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onCooldown = cooldownUntil !== null && cooldownUntil > now;

  async function start() {
    setError(null);
    setPhase("loading");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("start_larp_check", { p_item_slug: item.slug });
    if (error || !data?.length) {
      setError(friendlyError(error?.message ?? "No questions found."));
      setPhase("intro");
      return;
    }
    setAttemptId(data[0].attempt_id);
    setQuestions(data.map((q) => ({ id: q.question_id, prompt: q.prompt, options: q.options })));
    setAnswers([]);
    setIndex(0);
    setPicked(null);
    setSecondsLeft(data[0].seconds_per_question ?? SECONDS_PER_QUESTION);
    setPhase("question");
  }

  async function submit(all: number[]) {
    if (!attemptId) return;
    setPhase("submitting");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("submit_larp_check", { p_attempt_id: attemptId, p_answers: all });
    if (error || !data) {
      setError(friendlyError(error?.message ?? ""));
      setPhase("intro");
      return;
    }
    const r = data as unknown as Result;
    setResult(r);
    setPhase("result");
    if (r.passed) onPass();
    else onFail(r.cooldown_until ? Date.parse(r.cooldown_until) : Date.now() + 24 * 3_600_000);
  }

  function answer(choice: number) {
    const all = [...answers, choice];
    setAnswers(all);
    setPicked(null);
    if (all.length >= questions.length) {
      void submit(all);
    } else {
      setIndex(all.length);
      setSecondsLeft(SECONDS_PER_QUESTION);
    }
  }

  // Per-question countdown; running out records no answer (-1).
  useEffect(() => {
    if (phase !== "question") return;
    const t = setTimeout(() => {
      if (secondsLeft <= 1) answer(-1);
      else setSecondsLeft(secondsLeft - 1);
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft, index]);

  const header = (
    <div className="row-between" style={{ alignItems: "center" }}>
      <h2>Larp Check</h2>
      {phase === "question" && (
        <span className="muted">
          Question {index + 1} of {questions.length}
        </span>
      )}
    </div>
  );

  if (!item.hasCheck) {
    return (
      <section className="panel" aria-live="polite">
        {header}
        <p className="muted" style={{ margin: 0 }}>
          No Larp Check for <strong style={{ color: "var(--text)" }}>{item.name}</strong> yet. Community-written
          questions are coming.
        </p>
      </section>
    );
  }

  if (phase === "result" && result) {
    return (
      <section className="panel" aria-live="polite">
        {header}
        <p className={result.passed ? "result-pass" : "result-fail"} style={{ margin: 0 }}>
          {result.passed ? "Certified. Not a larp." : "Larp detected"}
        </p>
        <p className="muted" style={{ margin: 0 }}>
          {result.timed_out ? "Time ran out on the server clock." : `You got ${result.score} of ${result.total}.`}{" "}
          {result.passed ? "Your placement now counts double in the community ranking." : "Retry in 24h."}
        </p>
      </section>
    );
  }

  if (certified) {
    return (
      <section className="panel" aria-live="polite">
        {header}
        <p className="result-pass" style={{ margin: 0 }}>Certified. Not a larp.</p>
        <p className="muted" style={{ margin: 0 }}>Your {item.name} placement counts double in the community ranking.</p>
      </section>
    );
  }

  if (onCooldown) {
    const hours = Math.max(1, Math.ceil(((cooldownUntil ?? 0) - now) / 3_600_000));
    return (
      <section className="panel" aria-live="polite">
        {header}
        <p className="result-fail" style={{ margin: 0 }}>Larp detected</p>
        <p className="muted" style={{ margin: 0 }}>Watch it, then come back. You can retry {item.name} in about {hours}h.</p>
      </section>
    );
  }

  if (phase === "intro" || phase === "loading") {
    return (
      <section className="panel active" aria-live="polite">
        {header}
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          {tierName ? (
            <>
              You put <strong>{item.name}</strong> in <strong style={{ color: "var(--accent)" }}>{tierName}</strong>.
              Prove you watched it.
            </>
          ) : (
            <>
              Prove you know <strong>{item.name}</strong>.
            </>
          )}
        </p>
        <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          {QUIZ_LENGTH} questions, {SECONDS_PER_QUESTION}s each. Get {PASS_MARK} right to be{" "}
          <span style={{ color: "var(--accent)" }}>Certified</span>. Fail and it&apos;s a 24h cooldown.
        </p>
        {error && (
          <p role="alert" style={{ margin: 0, color: "var(--danger)" }}>
            {error}
          </p>
        )}
        {signedIn ? (
          <button type="button" className="btn btn-primary" onClick={start} disabled={phase === "loading"}>
            {phase === "loading" ? "Loading…" : "Start Larp Check"}
          </button>
        ) : (
          <Link href={loginHref} className="btn btn-primary btn-link">
            Sign in to take it
          </Link>
        )}
      </section>
    );
  }

  if (phase === "submitting") {
    return (
      <section className="panel active" aria-live="polite">
        {header}
        <p className="muted" style={{ margin: 0 }}>Grading…</p>
      </section>
    );
  }

  const q = questions[index];
  return (
    <section className="panel active">
      {header}
      <div className="progress" aria-hidden="true">
        {questions.map((_, i) => (
          <span key={i} className={i <= index ? "done" : ""} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{q.prompt}</p>
        <span className={`timer${secondsLeft <= 5 ? " low" : ""}`} aria-label={`${secondsLeft} seconds left`}>
          0:{String(secondsLeft).padStart(2, "0")}
        </span>
      </div>
      <div role="radiogroup" aria-label="Answers" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={picked === i}
            className={`option${picked === i ? " picked" : ""}`}
            onClick={() => setPicked(i)}
          >
            {opt}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary" disabled={picked === null} onClick={() => answer(picked!)}>
        Lock it in
      </button>
    </section>
  );
}
