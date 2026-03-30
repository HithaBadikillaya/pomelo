"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  AUTO_SUBMIT_REASON,
  clearAttemptIntegrityState,
} from "@/lib/attempt-integrity";

interface CompleteTestOptions {
  forced?: boolean;
  autoSubmitReason?: string;
  redirectTo?: string;
  replace?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export function useTestCompletion() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const testId = String(params.testid ?? "");

  const completeTest = useCallback(async (options: CompleteTestOptions = {}) => {
    if (!session?.backendToken || !testId) {
      toast.error("Unable to submit this test right now.");
      return { success: false as const };
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/test/${testId}/end`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.backendToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contestId: testId,
          forcedSubmission: Boolean(options.forced),
          autoSubmitReason: options.forced
            ? options.autoSubmitReason ?? AUTO_SUBMIT_REASON
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || options.errorMessage || "Failed to submit test");
        return { success: false as const, data };
      }

      clearAttemptIntegrityState(testId);

      toast.success(
        options.successMessage ||
          (options.forced ? "Test auto-submitted after repeated violations." : "Test submitted successfully!")
      );

      const destination = options.redirectTo ?? (options.forced ? "/" : `/test/${testId}`);
      const shouldReplace = options.replace ?? options.forced;

      if (shouldReplace) {
        router.replace(destination);
      } else {
        router.push(destination);
      }

      return { success: true as const, data };
    } catch {
      toast.error(
        options.errorMessage ||
          (options.forced ? "Auto submission failed. Please retry." : "Network error finishing test")
      );
      return { success: false as const };
    } finally {
      setIsSubmitting(false);
    }
  }, [router, session?.backendToken, testId]);

  return {
    completeTest,
    isSubmitting,
    testId,
  };
}
