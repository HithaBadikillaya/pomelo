"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Test } from "@/types/test";
import { deleteTestAction } from "@/app/actions/delete-test";
import { format } from "date-fns";

export function TestCard({ test }: { test: Test }) {
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
            <Button className={`w-full text-sm font-medium shadow-md pointer-events-none`}>
              {test.status === "completed"
                ? "Completed"
                : test.status === "ongoing"
                  ? "Active"
                  : "Waiting"}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 shrink-0"
            disabled={test.status === "ongoing"}
            title={test.status === "ongoing" ? "Cannot delete active test" : "Delete Test"}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm("Are you sure you want to delete this test?")) {
                const res = await deleteTestAction(test.id as string);
                if (!res.success) {
                  alert(res.message);
                }
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
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
