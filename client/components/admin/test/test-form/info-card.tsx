// edit-form.tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronDownIcon, FileText } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useEffect, useState } from "react";

function formatTimeForDisplay(hours: number, minutes: number) {
  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;

  return `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatTimeForInput(date: Date) {
  return formatTimeForDisplay(date.getHours(), date.getMinutes());
}

function parseTimeInput(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  let normalizedHours = hours % 12;
  if (period === "PM") {
    normalizedHours += 12;
  }

  return { hours: normalizedHours, minutes };
}

function normalizeTimeInput(value: string) {
  return value.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
}

export default function TestBasicCard() {
  const { control, setValue, watch } = useFormContext();

  const startsAt = watch("startsAt");
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("12:00 AM");

  useEffect(() => {
    if (startsAt) {
      const parsed = new Date(startsAt);
      if (!isNaN(parsed.getTime())) {
        setDate(parsed);
        setTime(formatTimeForInput(parsed));
      }
    }
  }, [startsAt]);

  useEffect(() => {
    if (date && time) {
      const parsedTime = parseTimeInput(time);
      if (!parsedTime) {
        return;
      }

      const updated = new Date(date);
      updated.setHours(parsedTime.hours);
      updated.setMinutes(parsedTime.minutes);
      updated.setSeconds(0);
      setValue("startsAt", updated.toISOString());
    }
  }, [date, time, setValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Basic Information
        </CardTitle>
        <CardDescription>
          Configure the test title, description, and scheduling settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Test Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ends At (HH:MM AM/PM)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(normalizeTimeInput(e.target.value))}
                    placeholder="01:30 PM"
                    className="w-fit bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Starts At</Label>
            <div className="flex space-x-2">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-32 justify-between font-normal"
                  >
                    {date ? date.toLocaleDateString() : "Select date"}
                    <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    captionLayout="dropdown"
                    disabled={(day) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return day < today;
                    }}
                    onSelect={(d) => {
                      setDate(d);
                      setOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="text"
                value={time}
                onChange={(e) => setTime(normalizeTimeInput(e.target.value))}
                placeholder="hh:mm AM"
                className="w-fit bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
          </div>
        </div>
        {/* Hidden status field to ensure it is passed */}
        <FormField
          control={control}
          name="status"
          render={({ field }) => <input type="hidden" {...field} />}
        />
      </CardContent>
    </Card>
  );
}
