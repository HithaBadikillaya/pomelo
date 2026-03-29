import z from "zod";

// type CreateFrom<T extends Test> = Omit<T, "id">;
// type UpdateFrom<T extends Test> = Partial<Omit<T, "id">>;

// export type TestCreate = CreateFrom<Test>;
// export type TestUpdate = UpdateFrom<Test>;

export const testSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  duration: z
    .string()
    .regex(/^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i, "Duration must be in HH:MM AM/PM format"),
  startsAt: z.iso.datetime(),
  problems: z.array(z.string()),
  rules: z.array(z.string()).default([]),
});

export type TestSchema = z.infer<typeof testSchema>;
