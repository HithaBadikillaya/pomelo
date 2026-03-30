import { notFound } from "next/navigation";
import TestForm from "@/components/admin/test/test-form";
import { db } from "@/lib/db";
import { Problem } from "@/types/problem";

function formatTimeForDisplay(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;

  return `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

interface IdParams {
  id: string;
}

interface MongoTest {
  _id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  questions?: QuestionReference[];
  rules?: string[];
  status?: string;
  joinId?: string;
  createdAt?: string;
}

type QuestionReference =
  | string
  | {
      _id?: string;
      id?: string;
    };

export default async function AdminTestEditPage({
  params,
}: {
  params: Promise<IdParams>;
}) {
  const { id } = await params;

  let availableQuestions: Problem[] = [];
  try {
    availableQuestions = await db.find<Problem>("questions") as Problem[];
  } catch (e) {
    console.error("Failed to fetch questions", e);
  }

  if (id === "new") {
    return (
      <div className="flex-1 h-full bg-background text-foreground overflow-x-hidden">
        <div className="h-full w-full">
          <TestForm testData={null} availableQuestions={availableQuestions} />
        </div>
      </div>
    );
  }

  let testDataRaw: MongoTest | null = null;
  try {
    testDataRaw = await db.findOne<MongoTest>("contests", { _id: id });
  } catch (e) {
    console.error(e);
  }

  let testData = null;
  if (testDataRaw) {
    const end = new Date(testDataRaw.endTime);
    const endTimeStr = formatTimeForDisplay(end);

    testData = {
      ...testDataRaw,
      id: testDataRaw._id,
      startsAt: testDataRaw.startTime ? new Date(testDataRaw.startTime).toISOString() : '',
      duration: endTimeStr,
      problems: (testDataRaw.questions || []).map((q) => typeof q === 'string' ? q : (q._id || q.id || String(q))),
      rules: testDataRaw.rules || [],
      status: (testDataRaw.status || "waiting") as "waiting" | "ongoing" | "completed",
      totalQuestions: testDataRaw.questions?.length || 0,
      participantsInProgress: 0,
      participantsCompleted: 0,
      joinId: testDataRaw.joinId || '',
      createdAt: testDataRaw.createdAt || new Date().toISOString(),
    };
  }

  if (!testData) {
    return notFound();
  }

  return (
    <div className="flex-1 h-full bg-background text-foreground overflow-x-hidden">
      <div className="h-full w-full">
        <TestForm testData={testData} availableQuestions={availableQuestions} />
      </div>
    </div>
  );
}
