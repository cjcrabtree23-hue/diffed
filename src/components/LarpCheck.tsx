"use client";

import { useEffect, useState } from "react";
import type { Item, QuizQuestion } from "@/lib/types";
import { PASS_MARK, QUIZ_LENGTH, SECONDS_PER_QUESTION } from "@/lib/tiers";

type Props = {
  item: Item;
  tierName: string | null;
  certified: boolean;
  cooldownUntil: number | null;
  now: number;
  onPass: () => void;
  onFail: () => void;
};

type Phase = "intro" | "question" | "result";

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function LarpCheck({ item, tierName, certified, cooldownUntil, now, onPass, onFail }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);

  const quiz = item.quiz ?? [];
  const onCooldown = cooldownUntil !== null && cooldownUntil > now;

  function start() {
    setQuestions(shuffle(quiz).slice(0, QUIZ_LENGTH));
    setIndex(0);
    setScore(0);
    setPicked(null);
    setSecondsLeft(SECONDS_PER_QUESTION);
    setPhase("question");
  }

  function advance(correct: boolean) {
    const nextScore = score + (correct ? 1 : 0);
    setScore(nextScore);
    setPicked(null);
    if (index + 1 >= questions.length) {
      setPhase("result");
      if (nextScore >= Math.min(PASS_MARK, questions.length)) onPass();
      else onFail();
    } else {
      setIndex(index + 1);
      setSecondsLeft(SECONDS_PER_QUESTION);
    }
  }

  // Per-question countdown; running out counts as a wrong answer.
  useEffect(() => {
    if (phase !== "question") return;
    const t = setTimeout(() => {
      if (secondsLeft <= 1) advance(false);
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

  if (quiz.length === 0) {
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

  if (certified && phase !== "result") {
    return (
      <section className="panel" aria-live="polite">
        {header}
        <p className="result-pass" style={{ margin: 0 }}>Certified. Not a larp.</p>
        <p className="muted" style={{ margin: 0 }}>Your {item.name} placement counts extra in the community ranking.</p>
      </section>
    );
  }

  if (onCooldown && phase !== "result") {
    const hours = Math.ceil(((cooldownUntil ?? 0) - now) / 3_600_000);
    return (
      <section className="panel" aria-live="polite">
        {header}
        <p className="result-fail" style={{ margin: 0 }}>Larp detected</p>
        <p className="muted" style={{ margin: 0 }}>
          Watch it, then come back. You can retry {item.name} in about {hours}h.
        </p>
      </section>
    );
  }

  if (phase === "intro") {
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
              Prove you know <strong>{item.name}</strong> before you rank it.
            </>
          )}
        </p>
        <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          {Math.min(QUIZ_LENGTH, quiz.length)} questions, {SECONDS_PER_QUESTION}s each. Get{" "}
          {Math.min(PASS_MARK, quiz.length)} right to be <span style={{ color: "var(--accent)" }}>Certified</span>.
          Fail and it&apos;s a 24h cooldown.
        </p>
        <button type="button" className="btn btn-primary" onClick={start}>
          Start Larp Check
        </button>
      </section>
    );
  }

  if (phase === "result") {
    const passed = score >= Math.min(PASS_MARK, questions.length);
    return (
      <section className="panel" aria-live="polite">
        {header}
        <p className={passed ? "result-pass" : "result-fail"} style={{ margin: 0 }}>
          {passed ? "Certified. Not a larp." : "Larp detected"}
        </p>
        <p className="muted" style={{ margin: 0 }}>
          You got {score} of {questions.length}.{" "}
          {passed ? "Your placement now shows the Certified badge." : "Retry in 24h."}
        </p>
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
      <button
        type="button"
        className="btn btn-primary"
        disabled={picked === null}
        onClick={() => advance(picked === q.answer)}
      >
        Lock it in
      </button>
    </section>
  );
}
