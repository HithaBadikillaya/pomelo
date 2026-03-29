"use client";

import { Test, TestSchema, testSchema } from "@/types/test";
import QuestionAddCard from "./add-question";
import TestBasicCard from "./info-card";
import RulesCard from "./rules-card";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { useActionState, useTransition, useEffect } from "react";
import TestQuestions from "../questions-list";
import { saveTest } from "@/app/actions/save-test";

import { Problem } from "@/types/problem";

function formatTimeForDisplay(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;

  return `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getDefaultSchedule() {
  const start = new Date(Date.now() + 10 * 60 * 1000);
  const remainder = start.getMinutes() % 15;

  if (remainder !== 0) {
    start.setMinutes(start.getMinutes() + (15 - remainder), 0, 0);
  } else {
    start.setSeconds(0, 0);
  }

  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    startsAt: start.toISOString(),
    duration: formatTimeForDisplay(end),
  };
}

export default function TestForm({ testData, availableQuestions = [] }: { testData: Test | null; availableQuestions?: Problem[] }) {
  const router = useRouter();
  const defaultSchedule = getDefaultSchedule();
  const form = useForm<TestSchema>({
    resolver: zodResolver(testSchema) as Resolver<TestSchema>,
    defaultValues: {
      title: "",
      description: "",
      startsAt: defaultSchedule.startsAt,
      duration: defaultSchedule.duration,
      status: "waiting",
      problems: [],
      rules: [],
      ...testData,
    },
  });

  const [state, formAction] = useActionState(saveTest, {
    success: false,
    message: "",
  });

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.success) {
      router.push("/admin/tests");
    }
  }, [state.success, router]);

  const handleSubmit = form.handleSubmit((data) => {
    startTransition(() => {
      formAction(data);
    });
  });

  const questions = form.watch("problems") as string[];

  return (
    <div className="max-w-none w-full p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/admin/tests/${testData?.id || ''}`}>
            <Button variant="outline" size="icon" className="text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">
              {testData ? "Edit Test" : "Create Test"}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Modify test details, questions, and settings
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="submit"
            form="test-form"
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      <div className="w-full space-y-6">
        <Form {...form}>
          <form id="test-form" onSubmit={handleSubmit} className="space-y-6">
            <TestBasicCard />
            <RulesCard />
            <QuestionAddCard availableQuestions={availableQuestions} />
            <TestQuestions questions={questions} availableQuestions={availableQuestions} />
          </form>
        </Form>
      </div>
    </div>
  );
}
