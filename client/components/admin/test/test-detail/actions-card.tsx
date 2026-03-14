"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cloneTestAction } from "@/app/actions/clone-test";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, BarChart3, Play, Copy, Loader2 } from "lucide-react";
import { Test } from "@/types/test";

interface QuickActionsCardProps {
  test: Test;
}

export function QuickActionsCard({ test }: QuickActionsCardProps) {
  const { id: testId, status } = test;
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);

  const handleClone = async () => {
    if (confirm("Are you sure you want to duplicate this test?")) {
      setIsCloning(true);
      const res = await cloneTestAction(testId as string);
      setIsCloning(false);
      if (res.success && res.newTestId) {
        router.push(`/admin/tests/${res.newTestId}/edit`);
      } else {
        alert(res.message);
      }
    }
  };

  return (
    <Card className="bg-card border-border shadow-md">
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Quick Actions</CardTitle>
        <CardDescription className="text-muted-foreground">
          Manage this test and view detailed analytics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            onClick={handleClone}
            disabled={isCloning}
            variant="outline"
            className="w-full h-16 flex flex-col items-center justify-center gap-2"
          >
            {isCloning ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Copy className="h-5 w-5 text-muted-foreground" />}
            <span className="text-xs font-medium text-center text-muted-foreground">Clone</span>
          </Button>

          {status === "waiting" ? (
            <Link href={`/admin/tests/${testId}/edit`}>
              <Button className="w-full h-16 flex flex-col items-center justify-center gap-2">
                <Edit className="h-5 w-5" />
                <span className="text-xs font-medium text-center">
                  Edit Test
                </span>
              </Button>
            </Link>
          ) : (
            <Button
              disabled
              className="w-full h-16 flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground rounded-lg cursor-not-allowed"
            >
              <Edit className="h-5 w-5" />
              <span className="text-xs font-medium text-center">Edit Test</span>
            </Button>
          )}

          <Link href={`/admin/tests/${testId}/result`}>
            <Button
              className="w-full h-16 flex flex-col items-center justify-center gap-2"
              variant={"outline"}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs font-medium text-center">
                View Results
              </span>
            </Button>
          </Link>

          <Link href={`/test/${testId}`}>
            <Button className="w-full h-16 flex flex-col items-center justify-center gap-2">
              <Play className="h-5 w-5" />
              <span className="text-xs font-medium text-center">Take Test</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
