"use client";

import React from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface LeaderboardEntry {
  rank: number;
  name: string;
  totalScore: number;
  submittedAt: string | null;
  status: string;
}

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
}

export function LeaderboardTable({ data }: LeaderboardTableProps) {
  const formatSubmittedAt = (value: string | null) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "N/A";
    return format(date, "MMM d, yyyy, h:mm a");
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-5 px-6 font-semibold text-foreground">Rank</TableHead>
            <TableHead className="font-semibold text-foreground">Participant</TableHead>
            <TableHead className="font-semibold text-foreground">Score</TableHead>
            <TableHead className="font-semibold text-foreground">Submission Time</TableHead>
            <TableHead className="text-right px-6 font-semibold text-foreground">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry) => (
              <TableRow key={entry.rank} className="border-border/60 hover:bg-muted/20 transition-colors">
                <TableCell className="py-4 px-6 font-mono font-bold text-lg">
                  {entry.rank}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40 font-semibold text-foreground uppercase">
                      {entry.name.charAt(0)}
                    </div>
                    <span className="font-semibold text-foreground">{entry.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-bold text-foreground">{entry.totalScore}</span>
                    <Badge variant="secondary" className="font-mono text-[11px] font-normal">
                      Marks
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatSubmittedAt(entry.submittedAt)}
                </TableCell>
                <TableCell className="text-right px-6">
                  <Badge
                    variant="secondary"
                    className="rounded-full px-3 py-0 font-normal capitalize"
                  >
                    {entry.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-20 text-center text-muted-foreground font-medium">
                No rankings recorded for this test yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
