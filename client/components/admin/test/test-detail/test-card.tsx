"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Test } from "@/types/test";

interface TestInformationCardProps {
  test: Test;
}

export function TestInformationCard({ test }: TestInformationCardProps) {
  return (
    <Card className="bg-card border-border shadow-md">
      <CardHeader>
        <CardTitle className="text-xl text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Test Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Duration</span>
          <div className="flex items-center gap-2 text-foreground">
            <Clock className="h-4 w-4 text-primary/70" />
            <span className="font-semibold">{test.duration}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">
            Total Questions
          </span>
          <div className="flex items-center gap-2 text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-semibold">{test.totalQuestions}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Starts At</span>
          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="h-4 w-4 text-primary/50" />
            <span className="font-semibold text-sm sm:text-base">
              {format(new Date(test.startsAt), "MMM d, yyyy, h:mm a")}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Join Code</span>
          <span className="text-primary font-bold font-mono text-lg tracking-widest bg-primary/10 px-3 py-1 rounded-md border border-primary/20">
            {test.joinId}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Test ID</span>
          <span className="text-foreground font-semibold font-mono text-xs sm:text-sm opacity-70">
            #{test.id}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
