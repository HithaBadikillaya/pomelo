"use server";

import { testSchema, TestSchema } from "@/types/test";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

function parseDuration(duration: string) {
  const meridiemMatch = duration.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (meridiemMatch) {
    const hours = Number(meridiemMatch[1]);
    const minutes = Number(meridiemMatch[2]);
    const period = meridiemMatch[3].toUpperCase();

    let normalizedHours = hours % 12;
    if (period === "PM") {
      normalizedHours += 12;
    }

    return { hours: normalizedHours, minutes, seconds: 0 };
  }

  const [hours, minutes, seconds = 0] = duration.split(":").map(Number);
  return { hours: hours || 0, minutes: minutes || 0, seconds: seconds || 0 };
}

export async function saveTest(_prevState: Record<string, unknown>, data: TestSchema) {
  try {
    const validatedData = testSchema.parse(data);
    const session = await auth();
    const token = session?.backendToken;

    console.log("Saving test:", validatedData);

    const { hours, minutes, seconds } = parseDuration(String(validatedData.duration));
    const durationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

    const payload = {
      title: validatedData.title,
      description: validatedData.description,
      duration: {
        start: validatedData.startsAt,
        end: new Date(new Date(validatedData.startsAt).getTime() + durationMs).toISOString()
      },
      problemIds: validatedData.problems,
      rules: validatedData.rules,
      author: "Admin"
    };

    // Determine URL and Method
    const isUpdate = !!validatedData.id;
    const url = isUpdate
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tests/${validatedData.id}/edit`
      : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tests/create`;
    const method = isUpdate ? "PUT" : "POST";

    const res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to ${isUpdate ? 'update' : 'save'} test`);
    }

    revalidatePath("/admin/tests");
    return {
      success: true,
      message: `Test ${isUpdate ? 'updated' : 'saved'} successfully`,
    };
  } catch (error) {
    console.error("Error saving test:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save test",
    };
  }
}
