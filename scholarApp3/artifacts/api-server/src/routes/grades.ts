import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, gradesTable } from "@workspace/db";
import {
  CreateGradeBody,
  UpdateGradeBody,
  UpdateGradeParams,
  DeleteGradeParams,
  ListGradesResponse,
  UpdateGradeResponse,
  GetGradesSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapGrade(g: typeof gradesTable.$inferSelect) {
  return { ...g, createdAt: g.createdAt.toISOString() };
}

function letterGrade(avg: number): string {
  if (avg >= 93) return "A";
  if (avg >= 90) return "A-";
  if (avg >= 87) return "B+";
  if (avg >= 83) return "B";
  if (avg >= 80) return "B-";
  if (avg >= 77) return "C+";
  if (avg >= 73) return "C";
  if (avg >= 70) return "C-";
  if (avg >= 60) return "D";
  return "F";
}

router.get("/grades", async (_req, res): Promise<void> => {
  const grades = await db.select().from(gradesTable);
  res.json(ListGradesResponse.parse(grades.map(mapGrade)));
});

router.get("/grades/summary", async (_req, res): Promise<void> => {
  const grades = await db.select().from(gradesTable);
  const bySubject: Record<string, { total: number; max: number; count: number }> = {};
  for (const g of grades) {
    if (!bySubject[g.subject]) bySubject[g.subject] = { total: 0, max: 0, count: 0 };
    bySubject[g.subject].total += g.score;
    bySubject[g.subject].max += g.maxScore;
    bySubject[g.subject].count++;
  }
  const subjects = Object.entries(bySubject).map(([subject, data]) => {
    const avg = data.max > 0 ? (data.total / data.max) * 100 : 0;
    return { subject, average: Math.round(avg * 10) / 10, gradeCount: data.count, letterGrade: letterGrade(avg) };
  });
  const totalScore = grades.reduce((s, g) => s + g.score, 0);
  const totalMax = grades.reduce((s, g) => s + g.maxScore, 0);
  const overallAverage = totalMax > 0 ? Math.round((totalScore / totalMax) * 1000) / 10 : 0;
  res.json(GetGradesSummaryResponse.parse({ overallAverage, subjects }));
});

router.post("/grades", async (req, res): Promise<void> => {
  const parsed = CreateGradeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [grade] = await db.insert(gradesTable).values(parsed.data).returning();
  res.status(201).json(mapGrade(grade));
});

router.put("/grades/:id", async (req, res): Promise<void> => {
  const params = UpdateGradeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateGradeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [grade] = await db.update(gradesTable).set(parsed.data).where(eq(gradesTable.id, params.data.id)).returning();
  if (!grade) { res.status(404).json({ error: "Grade not found" }); return; }
  res.json(UpdateGradeResponse.parse(mapGrade(grade)));
});

router.delete("/grades/:id", async (req, res): Promise<void> => {
  const params = DeleteGradeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(gradesTable).where(eq(gradesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
