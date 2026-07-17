import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLegendaryActivity } from "@/hooks/useLegendary";
import { cn } from "@/lib/utils";
import type {
  LegendaryActivity,
  LegendaryMatchingQuestion,
  LegendaryMultipleChoiceQuestion,
  LegendaryQuestion,
  LegendaryTrueFalseQuestion,
} from "@/types/legendary";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  RotateCcw,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactElement } from "react";

/**
 * QuizActivity — the Be Legendary quiz practice flow.
 *
 * Accepts an activityId, fetches the activity via useLegendaryActivity,
 * and renders a one-question-at-a-time practice experience with immediate
 * right/wrong feedback. Practice only — NO score tracking, NO pass/fail.
 *
 * Supports the three LegendaryQuestion variants:
 *   - multipleChoice: 4 tappable choices, one correct
 *   - trueFalse: two buttons (True/False)
 *   - matching: tap item title then tap its matching field value
 *
 * A "Question X of Y" indicator is display-only (not a score). At the end
 * a "Practice complete" message offers "Start over" and "Back to activities".
 *
 * Mobile-first, dark theme with gold accents. Oswald for prompts, Barlow
 * for choices. Uses legendary-correct / legendary-incorrect tokens for
 * feedback so green stays distinct from gold and seasonal sage.
 *
 * Shuffle note: the backend generates quiz content deterministically
 * (correctIndex is always 0, matching.shuffledOptions is first-seen order).
 * To avoid the correct answer always landing on "A" or in source order, we
 * shuffle options at RENDER TIME using a stable per-question seed (the
 * question's position in the quiz array). This keeps order stable across
 * re-renders of the same question (no flicker) while varying position across
 * questions, and preserves backend determinism for admin regeneration.
 */

/**
 * Deterministic seeded PRNG (mulberry32). Given the same seed, produces the
 * same sequence of pseudo-random numbers — so a question's shuffle order is
 * stable across re-renders but differs per question.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher–Yates shuffle driven by a seeded PRNG. Returns a new array; does
 * not mutate the input. The same (items, seed) pair always yields the same
 * order, so shuffle order is stable across re-renders of one question but
 * differs across questions when the seed (question index) differs.
 */
function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  if (items.length <= 1) return [...items];
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Mix two integers into a single seed (FNV-1a-ish mixing). */
function mixSeed(a: number, b: number): number {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b + 0x9e37b79b), 0x85ebca6b) >>> 0;
  return h;
}

interface QuizActivityProps {
  /** The Be Legendary activity id (stringified bigint). */
  activityId: string;
}

export function QuizActivity({ activityId }: QuizActivityProps): ReactElement {
  const query = useLegendaryActivity(activityId);
  const activity = query.data ?? null;

  if (query.isLoading) {
    return <QuizSkeleton />;
  }

  if (!activity) {
    return <QuizNotFound activityId={activityId} />;
  }

  if (activity.content.kind !== "quizContent") {
    return <QuizWrongKind activity={activity} />;
  }

  return <QuizFlow activity={activity} />;
}

/* ------------------------------ Quiz flow -------------------------------- */

function QuizFlow({ activity }: { activity: LegendaryActivity }): ReactElement {
  const questions =
    activity.content.kind === "quizContent" ? activity.content.questions : [];
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleNext = () => {
    if (index + 1 >= total) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleRestart = () => {
    setIndex(0);
    setFinished(false);
  };

  if (finished || total === 0) {
    return <QuizComplete activity={activity} onRestart={handleRestart} />;
  }

  const question = questions[index];
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <QuizHeader activity={activity} />
      <ProgressIndicator current={index + 1} total={total} />

      <div className="mt-5">
        <QuestionRouter
          key={index}
          question={question}
          questionIndex={index}
          onNext={handleNext}
          isLast={index + 1 >= total}
        />
      </div>
    </div>
  );
}

function QuestionRouter({
  question,
  questionIndex,
  onNext,
  isLast,
}: {
  question: LegendaryQuestion;
  questionIndex: number;
  onNext: () => void;
  isLast: boolean;
}): ReactElement {
  switch (question.kind) {
    case "multipleChoice":
      return (
        <MultipleChoiceQ
          question={question}
          questionIndex={questionIndex}
          onNext={onNext}
          isLast={isLast}
        />
      );
    case "trueFalse":
      return <TrueFalseQ question={question} onNext={onNext} isLast={isLast} />;
    case "matching":
      return (
        <MatchingQ
          question={question}
          questionIndex={questionIndex}
          onNext={onNext}
          isLast={isLast}
        />
      );
  }
}

/* --------------------------- Multiple choice ----------------------------- */

function MultipleChoiceQ({
  question,
  questionIndex,
  onNext,
  isLast,
}: {
  question: LegendaryMultipleChoiceQuestion;
  questionIndex: number;
  onNext: () => void;
  isLast: boolean;
}): ReactElement {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  // Shuffle choices at render time using a stable per-question seed so the
  // correct answer is not always "A". The shuffle is memoized on the
  // question identity + index so it stays stable across re-renders (no
  // flicker) but differs across questions. We track where the backend's
  // correctIndex landed after shuffle so grading still works.
  const { choices, correctIndex } = useMemo(() => {
    const indexed = question.choices.map((choice, i) => ({
      choice,
      original: i,
    }));
    const shuffled = seededShuffle(indexed, mixSeed(questionIndex, 101));
    const newCorrect = shuffled.findIndex(
      (c) => c.original === question.correctIndex,
    );
    return {
      choices: shuffled.map((c) => c.choice),
      correctIndex: newCorrect,
    };
  }, [question, questionIndex]);

  const handleSelect = (i: number) => {
    if (answered) return;
    setSelected(i);
  };

  return (
    <div className="flex flex-col gap-4">
      <Prompt prompt={question.prompt} />

      <div className="flex flex-col gap-2.5">
        {choices.map((choice, i) => {
          const isCorrect = i === correctIndex;
          const isSelected = selected === i;
          const showCorrect = answered && isCorrect;
          const showIncorrect = answered && isSelected && !isCorrect;

          return (
            <button
              type="button"
              key={choice}
              onClick={() => handleSelect(i)}
              disabled={answered}
              data-ocid={`quiz.choice.${i + 1}`}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md border px-4 py-3 text-left",
                "font-body text-sm transition-smooth",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                !answered &&
                  "border-border bg-card text-foreground hover:border-primary/60 hover:bg-card/80",
                showCorrect &&
                  "border-legendary-correct bg-legendary-correct/15 text-legendary-correct",
                showIncorrect &&
                  "border-legendary-incorrect bg-legendary-incorrect/15 text-legendary-incorrect",
                answered &&
                  !showCorrect &&
                  !showIncorrect &&
                  "border-border bg-card/50 text-muted-foreground opacity-70",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  !answered && "border-border text-muted-foreground",
                  showCorrect &&
                    "border-legendary-correct bg-legendary-correct text-legendary-correct-foreground",
                  showIncorrect &&
                    "border-legendary-incorrect bg-legendary-incorrect text-legendary-incorrect-foreground",
                  answered &&
                    !showCorrect &&
                    !showIncorrect &&
                    "border-border text-muted-foreground",
                )}
                aria-hidden
              >
                {showCorrect ? (
                  <Check className="size-3.5" />
                ) : showIncorrect ? (
                  <X className="size-3.5" />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              <span className="min-w-0 flex-1 break-words">{choice}</span>
            </button>
          );
        })}
      </div>

      <FeedbackBar answered={answered} isCorrect={selected === correctIndex} />
      <NextButton answered={answered} onNext={onNext} isLast={isLast} />
    </div>
  );
}

/* ----------------------------- True / false ------------------------------ */

function TrueFalseQ({
  question,
  onNext,
  isLast,
}: {
  question: LegendaryTrueFalseQuestion;
  onNext: () => void;
  isLast: boolean;
}): ReactElement {
  const [selected, setSelected] = useState<boolean | null>(null);
  const answered = selected !== null;

  const handleSelect = (value: boolean) => {
    if (answered) return;
    setSelected(value);
  };

  return (
    <div className="flex flex-col gap-4">
      <Prompt prompt={question.statement} />

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "True", value: true },
          { label: "False", value: false },
        ].map((opt) => {
          const isSelected = selected === opt.value;
          const isCorrect = opt.value === question.isTrue;
          const showCorrect = answered && isCorrect;
          const showIncorrect = answered && isSelected && !isCorrect;

          return (
            <button
              type="button"
              key={opt.label}
              onClick={() => handleSelect(opt.value)}
              disabled={answered}
              data-ocid={`quiz.tf.${opt.label.toLowerCase()}`}
              className={cn(
                "flex min-h-14 items-center justify-center gap-2 rounded-md border px-4 py-4",
                "font-heading text-base uppercase tracking-wide transition-smooth",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                !answered &&
                  "border-border bg-card text-foreground hover:border-primary/60 hover:bg-card/80",
                showCorrect &&
                  "border-legendary-correct bg-legendary-correct/15 text-legendary-correct",
                showIncorrect &&
                  "border-legendary-incorrect bg-legendary-incorrect/15 text-legendary-incorrect",
                answered &&
                  !showCorrect &&
                  !showIncorrect &&
                  "border-border bg-card/50 text-muted-foreground opacity-70",
              )}
            >
              {showCorrect && <Check className="size-5" aria-hidden />}
              {showIncorrect && <X className="size-5" aria-hidden />}
              {opt.label}
            </button>
          );
        })}
      </div>

      <FeedbackBar
        answered={answered}
        isCorrect={selected === question.isTrue}
      />
      <NextButton answered={answered} onNext={onNext} isLast={isLast} />
    </div>
  );
}

/* ------------------------------- Matching -------------------------------- */

interface MatchSelection {
  /** index into pairs (the item title side) the user is currently matching */
  titleIndex: number | null;
  /** map of titleIndex -> chosen option string */
  answers: Record<number, string>;
}

function MatchingQ({
  question,
  questionIndex,
  onNext,
  isLast,
}: {
  question: LegendaryMatchingQuestion;
  questionIndex: number;
  onNext: () => void;
  isLast: boolean;
}): ReactElement {
  const [state, setState] = useState<MatchSelection>({
    titleIndex: null,
    answers: {},
  });

  // Shuffle the option pool at render time using a stable per-question seed.
  // The backend's `shuffledOptions` is first-seen order (not actually
  // shuffled), so without this the correct value would always sit under its
  // source-order title. Pairs (the left column) stay in source order; only
  // the choosable option pool is reordered. Grading still compares the
  // chosen option string against `question.pairs[i].fieldValue`, which is
  // unaffected by shuffle.
  const options = useMemo(
    () => seededShuffle(question.shuffledOptions, mixSeed(questionIndex, 202)),
    [question.shuffledOptions, questionIndex],
  );

  const allAnswered =
    Object.keys(state.answers).length >= question.pairs.length;

  const handleSelectTitle = (i: number) => {
    if (state.answers[i] !== undefined) return; // already matched
    setState((s) => ({ ...s, titleIndex: i }));
  };

  const handleSelectOption = (option: string) => {
    if (state.titleIndex === null) return;
    // Prevent using the same option twice.
    const usedElsewhere = Object.entries(state.answers).some(
      ([k, v]) => Number(k) !== state.titleIndex && v === option,
    );
    if (usedElsewhere) return;
    setState((s) => ({
      titleIndex: null,
      answers: { ...s.answers, [s.titleIndex as number]: option },
    }));
  };

  const handleClear = (i: number) => {
    setState((s) => {
      const next = { ...s.answers };
      delete next[i];
      return { titleIndex: null, answers: next };
    });
  };

  const isPairCorrect = (i: number) =>
    allAnswered && state.answers[i] === question.pairs[i].fieldValue;

  return (
    <div className="flex flex-col gap-4">
      <Prompt
        prompt="Match each item to its correct value"
        helper="Tap an item, then tap its matching value."
      />

      <div className="flex flex-col gap-2.5">
        {question.pairs.map((pair, i) => {
          const answer = state.answers[i];
          const isSelected = state.titleIndex === i;
          const correct = isPairCorrect(i);
          const incorrect = allAnswered && answer !== undefined && !correct;

          return (
            <div
              key={pair.itemTitle}
              data-ocid={`quiz.match.row.${i + 1}`}
              className={cn(
                "flex items-center gap-3 rounded-md border px-3 py-2.5 transition-smooth",
                "bg-card",
                isSelected && "border-primary",
                !isSelected && !allAnswered && "border-border",
                correct && "border-legendary-correct bg-legendary-correct/10",
                incorrect &&
                  "border-legendary-incorrect bg-legendary-incorrect/10",
              )}
            >
              <button
                type="button"
                onClick={() => handleSelectTitle(i)}
                disabled={answer !== undefined || allAnswered}
                data-ocid={`quiz.match.title.${i + 1}`}
                className={cn(
                  "min-w-0 flex-1 text-left font-body text-sm transition-smooth",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isSelected && "text-primary",
                  !isSelected && "text-foreground",
                )}
              >
                <span className="block truncate">{pair.itemTitle}</span>
              </button>

              <span className="text-muted-foreground" aria-hidden>
                →
              </span>

              <div className="min-w-0 flex-1">
                {answer === undefined ? (
                  <span
                    className={cn(
                      "block truncate font-body text-sm",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {isSelected ? "Tap a value…" : "—"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleClear(i)}
                    disabled={allAnswered}
                    data-ocid={`quiz.match.clear.${i + 1}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded border px-2 py-1 font-body text-xs transition-smooth",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      correct &&
                        "border-legendary-correct text-legendary-correct",
                      incorrect &&
                        "border-legendary-incorrect text-legendary-incorrect",
                      !allAnswered &&
                        "border-border text-foreground hover:border-primary/60",
                    )}
                  >
                    <span className="truncate">{answer}</span>
                    {!allAnswered && (
                      <X className="size-3 shrink-0" aria-hidden />
                    )}
                    {correct && (
                      <Check className="size-3 shrink-0" aria-hidden />
                    )}
                    {incorrect && <X className="size-3 shrink-0" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Option pool */}
      <div className="flex flex-wrap gap-2">
        {options.map((option, i) => {
          const used = Object.values(state.answers).includes(option);
          return (
            <button
              type="button"
              key={option}
              onClick={() => handleSelectOption(option)}
              disabled={used || state.titleIndex === null}
              data-ocid={`quiz.match.option.${i + 1}`}
              className={cn(
                "rounded-md border px-3 py-2 font-body text-sm transition-smooth",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                used &&
                  "border-border bg-card/40 text-muted-foreground opacity-50",
                !used &&
                  state.titleIndex !== null &&
                  "border-primary/60 bg-card text-foreground hover:border-primary hover:bg-primary/10",
                !used &&
                  state.titleIndex === null &&
                  "border-border bg-card text-muted-foreground cursor-not-allowed opacity-60",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      <MatchingFeedback
        answered={allAnswered}
        question={question}
        answers={state.answers}
      />
      <NextButton answered={allAnswered} onNext={onNext} isLast={isLast} />
    </div>
  );
}

function MatchingFeedback({
  answered,
  question,
  answers,
}: {
  answered: boolean;
  question: LegendaryMatchingQuestion;
  answers: Record<number, string>;
}): ReactElement {
  if (!answered) {
    return (
      <p className="font-body text-xs text-muted-foreground">
        Match all pairs to see feedback.
      </p>
    );
  }
  const correctCount = question.pairs.reduce(
    (acc, pair, i) => (answers[i] === pair.fieldValue ? acc + 1 : acc),
    0,
  );
  const allCorrect = correctCount === question.pairs.length;
  return (
    <div
      data-ocid="quiz.match.feedback"
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 font-body text-sm",
        allCorrect
          ? "border-legendary-correct bg-legendary-correct/10 text-legendary-correct"
          : "border-legendary-incorrect bg-legendary-incorrect/10 text-legendary-incorrect",
      )}
    >
      {allCorrect ? (
        <CheckCheck className="size-4 shrink-0" aria-hidden />
      ) : (
        <X className="size-4 shrink-0" aria-hidden />
      )}
      <span>
        {allCorrect
          ? "All matches correct!"
          : `${correctCount} of ${question.pairs.length} correct — review the highlighted pairs.`}
      </span>
    </div>
  );
}

/* ------------------------------ Shared bits ------------------------------ */

function Prompt({
  prompt,
  helper,
}: { prompt: string; helper?: string }): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-heading text-lg uppercase tracking-wide text-foreground">
        {prompt}
      </h2>
      {helper ? (
        <p className="font-body text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function FeedbackBar({
  answered,
  isCorrect,
}: {
  answered: boolean;
  isCorrect: boolean;
}): ReactElement | null {
  if (!answered) return null;
  return (
    <div
      data-ocid="quiz.feedback"
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 font-body text-sm",
        isCorrect
          ? "border-legendary-correct bg-legendary-correct/10 text-legendary-correct"
          : "border-legendary-incorrect bg-legendary-incorrect/10 text-legendary-incorrect",
      )}
    >
      {isCorrect ? (
        <Check className="size-4 shrink-0" aria-hidden />
      ) : (
        <X className="size-4 shrink-0" aria-hidden />
      )}
      <span>
        {isCorrect ? "Correct!" : "Not quite — see the highlighted answer."}
      </span>
    </div>
  );
}

function NextButton({
  answered,
  onNext,
  isLast,
}: {
  answered: boolean;
  onNext: () => void;
  isLast: boolean;
}): ReactElement {
  return (
    <div className="flex justify-end">
      <Button
        type="button"
        onClick={onNext}
        disabled={!answered}
        data-ocid="quiz.next_button"
        className="min-w-32"
      >
        {isLast ? "Finish" : "Next"}
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

function ProgressIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}): ReactElement {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between font-heading text-xs uppercase tracking-wide text-muted-foreground">
        <span data-ocid="quiz.progress_label">
          Question {current} of {total}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        tabIndex={0}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function QuizHeader({
  activity,
}: { activity: LegendaryActivity }): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <BackToActivities positionId={activity.positionId} />
      <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
        {activity.name}
      </h1>
    </div>
  );
}

/* ------------------------------ Complete --------------------------------- */

function QuizComplete({
  activity,
  onRestart,
}: {
  activity: LegendaryActivity;
  onRestart: () => void;
}): ReactElement {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackToActivities positionId={activity.positionId} />

      <section
        className="mt-6 flex flex-col items-center justify-center gap-4 rounded-md bg-legendary-card px-6 py-12 text-center"
        data-ocid="quiz.complete"
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-legendary-correct/15 text-legendary-correct">
          <CheckCheck className="size-8" aria-hidden />
        </div>
        <h1 className="font-display text-3xl uppercase tracking-wide text-foreground">
          Practice complete
        </h1>
        <p className="max-w-sm font-body text-sm text-muted-foreground">
          You worked through every question in &ldquo;{activity.name}&rdquo;. No
          score, no pass/fail — just reps. Run it again anytime.
        </p>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={onRestart}
            data-ocid="quiz.start_over_button"
          >
            <RotateCcw className="size-4" aria-hidden />
            Start over
          </Button>
          <Button
            variant="outline"
            asChild
            data-ocid="quiz.back_to_activities_link"
          >
            <Link
              to="/position/$id/legendary"
              params={{ id: activity.positionId }}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to activities
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------- Chrome ---------------------------------- */

function BackToActivities({
  positionId,
}: {
  positionId: string;
}): ReactElement {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      data-ocid="quiz.back_to_activities_button"
    >
      <Link to="/position/$id/legendary" params={{ id: positionId }}>
        <ArrowLeft className="size-4" aria-hidden />
        Back to activities
      </Link>
    </Button>
  );
}

function QuizSkeleton(): ReactElement {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-4 h-6 w-32" />
      <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
      <Skeleton className="mt-6 h-8 w-3/4" />
      <div className="mt-5 flex flex-col gap-2.5">
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton key={k} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

function QuizNotFound({ activityId }: { activityId: string }): ReactElement {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <section
        className="mt-6 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center"
        data-ocid="quiz.not_found"
      >
        <h1 className="font-heading text-lg uppercase tracking-wide text-foreground">
          Activity not found
        </h1>
        <p className="max-w-sm font-body text-sm text-muted-foreground">
          We couldn&rsquo;t load this practice activity. It may have been
          removed. Ask an admin to rebuild it, then try again.
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          id: {activityId}
        </p>
      </section>
    </div>
  );
}

function QuizWrongKind({
  activity,
}: {
  activity: LegendaryActivity;
}): ReactElement {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <BackToActivities positionId={activity.positionId} />
      <section
        className="mt-6 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center"
        data-ocid="quiz.wrong_kind"
      >
        <h1 className="font-heading text-lg uppercase tracking-wide text-foreground">
          Not a quiz
        </h1>
        <p className="max-w-sm font-body text-sm text-muted-foreground">
          This activity is a flashcard set, not a quiz. Open it from the
          flashcards entry on the Be Legendary page.
        </p>
      </section>
    </div>
  );
}

export default QuizActivity;
