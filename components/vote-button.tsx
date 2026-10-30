"use client";

import { CheckIcon, ThumbsUpIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/springs";
import { changeVote } from "@/app/[locale]/v/[slug]/actions";
import { loginPath } from "@/lib/auth/redirects";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import type { Locale } from "@/lib/i18n";

interface VoteCopy {
  vote: string;
  voted: string;
  loading: string;
  signIn: string;
  votes: string;
  error: string;
}

export function VoteButton({
  locale,
  submissionId,
  initialCount,
  copy,
}: {
  locale: Locale;
  submissionId: string;
  initialCount: number;
  copy: VoteCopy;
}) {
  const router = useRouter();
  const [voted, setVoted] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [ready, setReady] = useState(() => !hasSupabaseConfig());
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    let mounted = true;
    const client = createBrowserSupabaseClient();
    if (!client) {
      return () => { mounted = false; };
    }

    void (async () => {
      try {
        const { data } = await client.auth.getSession();
        if (!mounted) return;
        if (!data.session) {
          setSignedIn(false);
          setReady(true);
          return;
        }
        setSignedIn(true);
        const result = await client.rpc("my_votes");
        if (!mounted) return;
        if (result.error) {
          setMessage(copy.error);
          return;
        }
        setVoted((result.data ?? []).some((vote: { submission_id: string }) => vote.submission_id === submissionId));
        setReady(true);
      } catch {
        if (mounted) setMessage(copy.error);
      }
    })();

    return () => { mounted = false; };
  }, [copy.error, submissionId]);

  async function toggleVote() {
    if (!ready) return;

    const client = createBrowserSupabaseClient();
    if (!client) {
      setMessage(copy.error);
      return;
    }

    const session = await client.auth.getSession();
    if (!session.data.session) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.push(loginPath(locale, next));
      return;
    }

    const previousVoted = voted;
    const previousCount = count;
    setMessage(undefined);
    setVoted((current) => !current);
    setCount(previousCount + (previousVoted ? -1 : 1));
    setPending(true);
    let failed = false;
    try {
      const result = await changeVote({
        submissionId,
        intent: previousVoted ? "revoke" : "cast",
      });
      failed = !result.ok;
    } catch {
      failed = true;
    } finally {
      setPending(false);
    }

    if (failed) {
      setVoted(previousVoted);
      setCount(previousCount);
      setMessage(copy.error);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="outline"
        size="lg"
        onClick={() => void toggleVote()}
        disabled={pending || !ready}
        aria-pressed={voted}
        title={!ready ? copy.loading : signedIn ? (voted ? copy.voted : copy.vote) : copy.signIn}
        className="aria-pressed:border-success/40 aria-pressed:bg-success/10"
      >
        <span className="relative grid size-4 place-items-center">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={voted ? "voted" : "vote"}
              initial={{ opacity: 0, scale: 0.6, filter: "blur(2px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.6, filter: "blur(2px)", transition: spring.fast.exit }}
              transition={spring.moderate}
              className="col-start-1 row-start-1"
            >
              {voted ? <CheckIcon aria-hidden="true" className="text-success" /> : <ThumbsUpIcon aria-hidden="true" />}
            </motion.span>
          </AnimatePresence>
        </span>
        <span>{!ready ? copy.loading : voted ? copy.voted : copy.vote}</span>
        <span aria-label={`${count} ${copy.votes}`} className="relative overflow-hidden border-s border-border ps-2 tabular-nums">
          <AnimatePresence initial={false} mode="popLayout" custom={voted}>
            <motion.span
              key={count}
              custom={voted}
              variants={{
                enter: (up: boolean) => ({ y: up ? "100%" : "-100%", opacity: 0 }),
                center: { y: 0, opacity: 1 },
                exit: (up: boolean) => ({ y: up ? "-100%" : "100%", opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={spring.moderate}
              className="inline-block"
            >
              {count}
            </motion.span>
          </AnimatePresence>
        </span>
      </Button>
      {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
      {!ready ? <span className="sr-only">{copy.loading}</span> : null}
    </div>
    </MotionConfig>
  );
}
