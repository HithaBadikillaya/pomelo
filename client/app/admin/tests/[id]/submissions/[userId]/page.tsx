import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Code2,
    HelpCircle,
    Trophy,
    Clock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";

type SubmissionStatus =
    | "PASSED"
    | "FAILED"
    | "PARTIAL"
    | "Accepted"
    | "Wrong Answer"
    | "Time Limit Exceeded"
    | "Runtime Error"
    | "Compilation Error"
    | "Pending";

interface PopulatedUser {
    _id: string;
    name?: string;
}

interface ContestRecord {
    _id: string;
    title?: string;
}

interface PopulatedQuestion {
    _id: string;
    title: string;
    marks: number;
    questionType?: string;
    options?: string[];
    correctAnswer?: string;
    testcases?: { isVisible?: boolean }[];
}

interface RawTestCaseResult {
    testCase: number;
    passed: boolean;
    input?: string;
    expectedOutput?: string;
    actualOutput?: string;
    error?: string;
    status?: string;
}

interface RawSubmissionItem {
    question?: PopulatedQuestion | null;
    score?: number;
    status?: SubmissionStatus;
    answer?: string[];
    code?: string;
    language?: string;
    testCaseResults?: RawTestCaseResult[];
}

interface SubmissionDocument {
    user?: PopulatedUser | null;
    totalScore?: number;
    submittedAt?: string;
    createdAt?: string;
    submissions?: RawSubmissionItem[];
}

interface SubmissionDetail {
    questionId: string;
    type: "mcq" | "coding";
    questionTitle: string;
    points: number;
    earnedPoints: number;
    status: SubmissionStatus;
    selectedOptions?: string[];
    correctOptions?: string[];
    options?: { id: string; text: string }[];
    submittedCode?: string;
    language?: string;
    testCases?: {
        id: number;
        isHidden: boolean;
        passed: boolean;
        input?: string;
        expectedOutput?: string;
        actualOutput?: string;
        error?: string;
        status?: string;
    }[];
}

interface UserSubmission {
    userId: string;
    userName: string;
    testId: string;
    testName: string;
    totalScore: number;
    maxScore: number;
    submittedAt: string;
    details: SubmissionDetail[];
}

function isMCQQuestion(question: PopulatedQuestion) {
    return question.questionType === "Single Correct" || question.questionType === "Multiple Correct";
}

function mapSubmissionDetail(submissionItem: RawSubmissionItem): SubmissionDetail | null {
    const question = submissionItem.question;
    if (!question) {
        return null;
    }

    if (isMCQQuestion(question)) {
        const options = (question.options || []).map((option, index) => ({
            id: String.fromCharCode(97 + index),
            text: option,
        }));

        return {
            questionId: question._id,
            type: "mcq",
            questionTitle: question.title,
            points: question.marks,
            earnedPoints: submissionItem.score || 0,
            status: (submissionItem.score || 0) === question.marks ? "PASSED" : "FAILED",
            selectedOptions: submissionItem.answer || [],
            correctOptions: (question.correctAnswer || "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            options,
        };
    }

    const submittedCode = submissionItem.code || submissionItem.answer?.[0];

    return {
        questionId: question._id,
        type: "coding",
        questionTitle: question.title,
        points: question.marks,
        earnedPoints: submissionItem.score || 0,
        status: submissionItem.status || "Pending",
        submittedCode,
        language: submissionItem.language,
        testCases: (submissionItem.testCaseResults || []).map((testCase) => ({
            id: testCase.testCase,
            isHidden: !question.testcases?.[testCase.testCase - 1]?.isVisible,
            passed: testCase.passed,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: testCase.actualOutput,
            error: testCase.error,
            status: testCase.status,
        })),
    };
}

function formatSubmittedAt(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }

    return format(date, "MMM d, yyyy, h:mm a");
}

function getSubmissionStatusVariant(status: SubmissionStatus): "default" | "destructive" | "secondary" {
    if (status === "PASSED" || status === "Accepted") {
        return "default";
    }

    if (status === "FAILED" || ["Wrong Answer", "Time Limit Exceeded", "Runtime Error", "Compilation Error"].includes(status)) {
        return "destructive";
    }

    return "secondary";
}

function formatLanguage(language?: string) {
    if (!language) {
        return "Unknown";
    }

    return language.charAt(0).toUpperCase() + language.slice(1);
}

export default async function SubmissionDetailPage({
    params,
}: {
    params: Promise<{ id: string; userId: string }>;
}) {
    const { id: contestId, userId } = await params;

    const submissionData = await db.findOne<SubmissionDocument>(
        "submissions",
        {
            contest: contestId,
            user: userId,
        },
        { populate: ["user", "submissions.question"] }
    );

    if (!submissionData) {
        notFound();
    }

    const contest = await db.findOne<ContestRecord>("contests", { _id: contestId });

    const details = (submissionData.submissions || [])
        .map(mapSubmissionDetail)
        .filter((detail): detail is SubmissionDetail => detail !== null);

    const data: UserSubmission = {
        userId,
        userName: submissionData.user?.name || "Unknown User",
        testId: contestId,
        testName: contest?.title || "Unknown Test",
        totalScore: submissionData.totalScore || 0,
        maxScore: details.reduce((sum, detail) => sum + detail.points, 0),
        submittedAt: submissionData.submittedAt || submissionData.createdAt || "",
        details,
    };

    return (
        <div className="flex-1 overflow-auto bg-background h-full">
            <div className="max-w-none w-full p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 pb-16">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                        <Button variant="outline" size="icon" className="mt-1 shrink-0" asChild>
                            <Link href={`/admin/tests/${contestId}/result`}>
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Submission Detail</h1>
                            <p className="text-sm text-muted-foreground">
                                {data.userName} / {data.testName}
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className="w-fit px-4 py-1 font-mono text-sm sm:text-base">
                        Score: {data.totalScore} / {data.maxScore}
                    </Badge>
                </div>

                <Separator className="bg-border/50" />

                <div className="grid gap-6 md:grid-cols-3">
                    <StatItem icon={<Trophy className="h-4 w-4" />} label="Candidate" value={data.userName} mono={false} />
                    <StatItem icon={<Trophy className="h-4 w-4" />} label="Total Score" value={`${data.totalScore} / ${data.maxScore}`} />
                    <StatItem icon={<Clock className="h-4 w-4" />} label="Submitted On" value={formatSubmittedAt(data.submittedAt)} mono={false} />
                </div>

                <div className="space-y-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            Questions & Responses
                        </h2>
                        <Badge variant="secondary" className="font-mono">
                            {data.details.length} Items
                        </Badge>
                    </div>

                    <div className="grid gap-6">
                        {data.details.map((detail, idx) => (
                            <div key={idx}>
                                <Card className="overflow-hidden border-border bg-card shadow-sm">
                                    <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                {detail.type === "mcq" ? (
                                                    <HelpCircle className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <Code2 className="h-4 w-4 text-primary" />
                                                )}
                                                <CardTitle className="text-lg leading-tight">{detail.questionTitle}</CardTitle>
                                            </div>
                                            <CardDescription className="text-sm">
                                                Points Earned: <span className="font-mono font-medium text-foreground">{detail.earnedPoints}</span> / {detail.points}
                                            </CardDescription>
                                        </div>
                                        <Badge variant={getSubmissionStatusVariant(detail.status)} className="w-fit shrink-0 self-start">
                                            {detail.status}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {detail.type === "mcq" ? (
                                            <div className="grid gap-2">
                                                {detail.options?.map((opt) => {
                                                    const isSelected = detail.selectedOptions?.includes(opt.text);
                                                    const isCorrect = detail.correctOptions?.includes(opt.id);

                                                    let appearance = "border-border bg-muted/30 text-muted-foreground";
                                                    if (isSelected && isCorrect) appearance = "border-primary/30 bg-primary/10 text-primary";
                                                    else if (isSelected && !isCorrect) appearance = "border-destructive/30 bg-destructive/10 text-destructive";
                                                    else if (!isSelected && isCorrect) appearance = "border-primary/20 bg-primary/5 text-primary";

                                                    return (
                                                        <div
                                                            key={opt.id}
                                                            className={`flex items-center justify-between rounded-xl border p-4 ${appearance}`}
                                                        >
                                                            <span className="text-sm font-medium">{opt.text}</span>
                                                            <div className="flex gap-2">
                                                                {isCorrect && <CheckCircle2 className="h-4 w-4" />}
                                                                {isSelected && !isCorrect && <XCircle className="h-4 w-4" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Submitted Code</h4>
                                                        <Badge variant="outline" className="font-mono text-[11px]">
                                                            {formatLanguage(detail.language)}
                                                        </Badge>
                                                    </div>
                                                    <div className="overflow-x-auto rounded-xl border border-border bg-muted/20 p-4 font-mono text-sm">
                                                        <pre className="text-foreground">
                                                            <code>{detail.submittedCode}</code>
                                                        </pre>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 pt-2">
                                                    <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Test Verification</h4>
                                                    <div className="flex flex-col gap-3">
                                                        {detail.testCases?.map((tc) => (
                                                            <details
                                                                key={tc.id}
                                                                className={`overflow-hidden rounded-lg border ${
                                                                    tc.passed ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"
                                                                }`}
                                                            >
                                                                <summary
                                                                    className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-xs font-semibold ${
                                                                        tc.passed ? "text-primary" : "text-destructive"
                                                                    }`}
                                                                >
                                                                    {tc.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                                    <span>{tc.isHidden ? "Hidden" : "Visible"} Test #{tc.id}</span>
                                                                    {!tc.passed && tc.status && (
                                                                        <Badge variant="outline" className="ml-auto border-destructive/30 bg-destructive/10 font-mono text-[10px] text-destructive">
                                                                            {tc.status}
                                                                        </Badge>
                                                                    )}
                                                                    {tc.passed && (
                                                                        <Badge variant="outline" className="ml-auto border-primary/30 bg-primary/10 font-mono text-[10px] text-primary">
                                                                            Passed
                                                                        </Badge>
                                                                    )}
                                                                </summary>

                                                                {!tc.isHidden && (tc.input || tc.expectedOutput || tc.error) && (
                                                                    <div className="space-y-3 border-t border-border/60 bg-background px-4 pb-4 pt-3">
                                                                        {tc.input && (
                                                                            <div className="space-y-1">
                                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Input</div>
                                                                                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2 font-mono text-[11px] text-foreground">
                                                                                    {tc.input}
                                                                                </pre>
                                                                            </div>
                                                                        )}
                                                                        {tc.expectedOutput && (
                                                                            <div className="space-y-1">
                                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expected Output</div>
                                                                                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2 font-mono text-[11px] text-foreground">
                                                                                    {tc.expectedOutput}
                                                                                </pre>
                                                                            </div>
                                                                        )}
                                                                        {tc.actualOutput && !tc.passed && (
                                                                            <div className="space-y-1">
                                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actual Output</div>
                                                                                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-destructive/20 bg-destructive/10 p-2 font-mono text-[11px] text-destructive">
                                                                                    {tc.actualOutput}
                                                                                </pre>
                                                                            </div>
                                                                        )}
                                                                        {tc.error && (
                                                                            <div className="space-y-1">
                                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-destructive">Error Logs</div>
                                                                                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-destructive/20 bg-destructive/10 p-2 font-mono text-[11px] text-destructive">
                                                                                    {tc.error}
                                                                                </pre>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </details>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatItem({ icon, label, value, mono = true }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
    return (
        <Card className="h-full border-border bg-card shadow-sm">
            <CardContent className="flex min-h-24 h-full items-center gap-3 px-5 py-">
                <div className="shrink-0 rounded-xl border border-border bg-muted/30 p-2.5 text-muted-foreground">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className={mono ? "break-words font-mono text-lg font-bold text-foreground" : "break-words text-lg font-semibold text-foreground"}>{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
