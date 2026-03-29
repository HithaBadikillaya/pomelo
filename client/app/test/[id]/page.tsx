"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Clock, AlertCircle, Calendar, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContestDetails {
  title: string;
  description: string;
  rules: string[];
  duration: number;
  startTime: string;
  endTime: string;
  serverTime: string;
  canStart: boolean;
  isEnded?: boolean;
}

export default function ContestLanding() {
  const { id: testid } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [details, setDetails] = useState<ContestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);

  const updateCountdown = useCallback((startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diff = start - now;

    if (diff <= 0) {
      setTimeLeft("00:00:00");
      return true;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeLeft(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
    return false;
  }, []);

  const fetchInstructions = useCallback(async () => {
    if (status !== "authenticated" || !session?.backendToken || !testid) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/test/${testid}`, {
        headers: {
          "Authorization": `Bearer ${session.backendToken}`,
          "Content-Type": "application/json"
        },
      });

      const result = await res.json();

      if (result.success && result.data) {
        const now = new Date().getTime();
        const end = new Date(result.data.endTime).getTime();
        const isEnded = result.data.isEnded || now > end;
        setDetails({ ...result.data, isEnded });
      } else {
        toast.error(result.message || "Failed to fetch data");
      }
    } catch {
      toast.error("Failed to load instructions");
    } finally {
      setLoading(false);
    }
  }, [testid, session, status]);

  useEffect(() => {
    if (testid && status === "authenticated") fetchInstructions();
  }, [testid, status, fetchInstructions]);

  useEffect(() => {
    if (!details || details.canStart || details.isEnded) return;

    const interval = setInterval(() => {
      const isTimeUp = updateCountdown(details.startTime);
      if (isTimeUp) {
        setDetails(prev => prev ? { ...prev, canStart: true } : null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [details, updateCountdown]);

  const handleStart = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          // The attempt screen will retry and enforce full-screen if the browser blocks this call.
        }
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/test/start`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.backendToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ contestId: testid })
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Good luck!");

        // Fetch problems to redirect to the first one
        const questionsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/test/${testid}/data`, {
          headers: { "Authorization": `Bearer ${session?.backendToken}` }
        });
        const questionsData = await questionsRes.json();
        if (questionsData.success && questionsData.data.problems?.length > 0) {
          router.push(`/attempt/test/${testid}/question/${questionsData.data.problems[0].id}`);
        } else {
          router.push(`/attempt/test/${testid}/session`); // fallback
        }
      } else {
        toast.error(result.error || result.message || "Failed to start session");
      }
    } catch {
      toast.error("Network error: Could not start assessment");
    }
  };

  const handleStartClick = () => {
    setShowFullscreenPrompt(true);
  };

  const handleCancelStart = () => {
    setShowFullscreenPrompt(false);
  };

  const handleConfirmStart = async () => {
    setShowFullscreenPrompt(false);
    await handleStart();
  };

  if (status === "loading" || loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground animate-pulse">Initializing Session & Fetching Rules...</p>
    </div>
  );

  return (
    <>
      <main className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 min-h-screen pt-24">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-8">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{details?.title}</h1>
              <p className="text-xl text-muted-foreground">{details?.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center p-4 bg-secondary/50 rounded-lg border">
                <Calendar className="mr-3 text-primary h-5 w-5" />
                <div>
                  <p className="text-xs uppercase font-bold text-muted-foreground">Start Date</p>
                  <p className="font-semibold">{details ? new Date(details.startTime).toLocaleDateString() : "-"}</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-secondary/50 rounded-lg border">
                <Hourglass className="mr-3 text-primary h-5 w-5" />
                <div>
                  <p className="text-xs uppercase font-bold text-muted-foreground">Duration</p>
                  <p className="font-semibold">{details?.duration} Minutes</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                <Clock className="mr-3 text-primary h-5 w-5" />
                <div>
                  <p className="text-xs uppercase font-bold text-muted-foreground">Start Time</p>
                  <p className="font-semibold text-primary">
                    {details ? new Date(details.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 rounded-2xl border shadow-sm space-y-6">
              <div className="flex items-center space-x-2 text-xl font-bold border-b pb-4">
                <AlertCircle className="text-yellow-500" />
                <h2>Test Guidelines</h2>
              </div>
              <ScrollArea className="max-h-[400px]">
                <ul className="space-y-4">
                  {details?.rules?.map((rule, i) => (
                    <li key={i} className="flex items-start">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold mr-3 mt-0.5 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          </div>

          <div className="w-full md:w-80 space-y-6">
            <div className="bg-card p-6 rounded-2xl border shadow-lg sticky top-24">
              <h3 className="text-lg font-bold mb-4">Session Status</h3>
              {details?.isEnded ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                    <p className="text-xs font-bold text-red-600 uppercase text-center">Test Ended</p>
                  </div>
                  <Button disabled className="w-full py-6 text-lg font-bold opacity-80 cursor-not-allowed bg-muted text-muted-foreground">
                    Access Closed
                  </Button>
                  <p className="text-[10px] text-muted-foreground">This assessment is no longer accepting submissions.</p>
                </div>
              ) : !details?.canStart ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-muted rounded-xl">
                    <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Starting In</p>
                    <p className="text-3xl font-mono font-bold text-primary tabular-nums">{timeLeft}</p>
                  </div>
                  <Button disabled className="w-full py-6 text-lg font-bold opacity-80 cursor-not-allowed">
                    Entry Locked
                  </Button>
                  <p className="text-[10px] text-muted-foreground">The assessment will unlock automatically when the timer reaches zero.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                    <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase text-center">Test is Live</p>
                  </div>
                  <Button onClick={handleStartClick} className="w-full py-6 text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
                    Start Assessment
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground italic">By starting, you agree to follow the test rules.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showFullscreenPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-card text-card-foreground shadow-2xl">
            <div className="space-y-2 border-b px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                Full Screen Required
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">Enter full screen to begin</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                The assessment opens in full screen to match the test rules
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                Stay on this tab, keep the window focused, and avoid exiting full screen during the
                test.
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={handleCancelStart}>
                  Not now
                </Button>
                <Button onClick={handleConfirmStart}>
                  Enter full screen and start
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
