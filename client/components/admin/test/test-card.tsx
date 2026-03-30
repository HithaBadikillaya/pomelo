"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Trash2, Copy, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Test } from "@/types/test";
import { cloneTestAction } from "@/app/actions/clone-test";
import { format } from "date-fns";

export function TestCard({ test }: { test: Test }) {
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <Card className="shadow-md bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg sm:text-xl text-foreground font-semibold truncate">
              {test.title}
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm leading-relaxed line-clamp-2">
              {test.description}
            </CardDescription>
          </div>
          <Badge
            className={`px-3 py-1 text-xs font-medium rounded-full border shrink-0`}
          >
            {test.status === "completed"
              ? "Completed"
              : test.status === "ongoing"
                ? "Active"
                : "Waiting"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Created At */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4 p-3 bg-muted border rounded-lg">
          <Clock className="h-4 w-4 text-foreground shrink-0" />
          <span className="font-medium">Starts:</span>
          <span className="truncate">
            {format(new Date(test.startsAt), "MMM d, yyyy, h:mm a")}
          </span>
        </div>

        {/* Status Stats */}
        {test.status === "waiting" ? (
          <div className="flex items-center justify-center p-4 bg-muted rounded-lg border border-border mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full" />
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Waiting</div>
              </div>
            </div>
          </div>
        ) : test.status === "completed" ? (
          <div className="flex items-center justify-center p-4 rounded-lg border bg-muted mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div className="text-center">
                <div className="text-lg font-semibold text-foreground">
                  {test.participantsCompleted}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <StatusBox
              color="bg-primary/70"
              label="In Progress"
              value={test.participantsInProgress}
            />
            <StatusBox
              color="bg-primary"
              label="Completed"
              value={test.participantsCompleted}
            />
          </div>
        )}

        {/* Meta Info */}
        <div className="space-y-3 mb-6 p-4 bg-muted rounded-lg border border-border">
          <MetaRow label="Duration" value={test.duration} />
          <MetaRow label="Questions" value={test.totalQuestions} />
          <div className="flex justify-between items-center bg-primary/5 p-2 rounded-md border border-primary/10">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">Join Code</span>
            <span className="text-primary font-bold font-mono tracking-widest">{test.joinId}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={`/admin/tests/${test.id}`} className="flex-1">
            <Button variant="outline" className="w-full text-sm">
              View
            </Button>
          </Link>

          {test.status === "waiting" ? (
            <Link href={`/admin/tests/${test.id}/edit`} className="flex-1">
              <Button variant="outline" className="w-full text-sm">
                Edit
              </Button>
            </Link>
          ) : (
            <Button
              disabled
              variant="outline"
              className="flex-1 w-full text-sm bg-muted cursor-not-allowed"
            >
              Edit
            </Button>
          )}

          <div className="flex-1">
            {test.status === "completed" ? (
              <Link href={`/admin/tests/${test.id}/leaderboard`}>
                <Button variant="outline" className="w-full text-sm border-primary/20 hover:bg-primary/5 text-primary font-semibold">
                  Leaderboard
                </Button>
              </Link>
            ) : (
              <Button 
                variant="outline" 
                className="w-full text-sm opacity-50 cursor-not-allowed border-border"
                title="Leaderboard is available after the test ends"
              >
                Leaderboard
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            disabled={isCloning}
            title="Clone Test"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm("Are you sure you want to duplicate this test?")) {
                setIsCloning(true);
                const res = await cloneTestAction(test.id as string);
                setIsCloning(false);
                if (res.success && res.newTestId) {
                  router.push(`/admin/tests/${res.newTestId}/edit`);
                } else {
                  alert(res.message);
                }
              }
            }}
          >
            {isCloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0"
            disabled={test.status === "ongoing" || isDeleting}
            title={test.status === "ongoing" ? "Cannot delete active test" : "Delete Test"}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm("Are you sure you want to delete this test?")) {
                setIsDeleting(true);

                try {
                  const response = await fetch(`/api/admin/tests/${test.id}`, {
                    method: "DELETE",
                  });
                  const json = await response.json();

                  if (!response.ok || !json.success) {
                    throw new Error(json.error || "Failed to delete test");
                  }

                  router.refresh();
                } catch (error) {
                  alert(
                    error instanceof Error
                      ? error.message
                      : "Failed to delete test",
                  );
                } finally {
                  setIsDeleting(false);
                }
              }
            }}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBox({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border border-border">
      <div className={`w-3 h-3 ${color} rounded-full shrink-0`} />
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="text-foreground font-semibold">{value}</span>
    </div>
  );
}
