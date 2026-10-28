import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, conversations, messages, tasksTable, deadlinesTable, habitsTable } from "@workspace/db";
import { isOpenAIConfigured, openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are an intelligent study assistant built into Scholar's Log — a student productivity app. Help students:
- Plan and prioritize their studies
- Break down complex tasks into smaller steps
- Suggest study strategies and techniques
- Analyze their grades and progress
- Create study schedules
- Give motivational support
- Answer questions about their upcoming deadlines and habits

Be concise, encouraging, and practical. Use any provided student context to give tailored advice.`;

function mapConv(c: typeof conversations.$inferSelect) {
  return { id: c.id, title: c.title, createdAt: c.createdAt.toISOString() };
}
function mapMsg(m: typeof messages.$inferSelect) {
  return { id: m.id, conversationId: m.conversationId, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() };
}

router.get("/openai/conversations", async (_req, res): Promise<void> => {
  const convs = await db.select().from(conversations).orderBy(conversations.createdAt);
  res.json(convs.map(mapConv));
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: String(parsed.error) }); return; }
  const [conv] = await db.insert(conversations).values({ title: parsed.data.title }).returning();
  res.status(201).json(mapConv(conv));
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) { res.status(400).json({ error: String(params.error) }); return; }
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, params.data.id));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(messages.createdAt);
  res.json({ ...mapConv(conv), messages: msgs.map(mapMsg) });
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) { res.status(400).json({ error: String(params.error) }); return; }
  await db.delete(conversations).where(eq(conversations.id, params.data.id));
  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) { res.status(400).json({ error: String(params.error) }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, params.data.id)).orderBy(messages.createdAt);
  res.json(msgs.map(mapMsg));
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse({ id: parseInt(req.params.id) });
  if (!params.success) { res.status(400).json({ error: String(params.error) }); return; }
  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: String(parsed.error) }); return; }

  const convId = params.data.id;
  const userContent = parsed.data.content;

  if (!isOpenAIConfigured()) {
    res.status(503).json({
      error:
        "AI chat is unavailable until AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY are configured.",
    });
    return;
  }

  // Build student context
  let contextBlock = "";
  try {
    const today = new Date().toISOString().split("T")[0];
    const todayTasks = await db.select().from(tasksTable).where(eq(tasksTable.dueDate, today));
    const allHabits = await db.select().from(habitsTable);
    const upcomingDeadlines = await db.select().from(deadlinesTable);

    const pending = todayTasks.filter(t => t.status !== "completed").map(t => `- ${t.title} (${t.priority})`).join("\n") || "None";
    const streaks = allHabits.filter(h => h.currentStreak > 0).map(h => `- ${h.name}: ${h.currentStreak}-day streak`).join("\n") || "None";
    const deadlines = upcomingDeadlines
      .filter(d => !d.completed && d.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
      .map(d => `- ${d.title} (due ${d.dueDate})`).join("\n") || "None";

    contextBlock = `\n\nStudent context:\nPending tasks today:\n${pending}\nActive habit streaks:\n${streaks}\nUpcoming deadlines:\n${deadlines}`;
  } catch (_) { /* non-critical */ }

  // Persist user message
  await db.insert(messages).values({ conversationId: convId, role: "user", content: userContent });

  // Load history
  const history = await db.select().from(messages).where(eq(messages.conversationId, convId)).orderBy(messages.createdAt);
  const chatMessages = history.map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));

  const allMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT + contextBlock },
    ...chatMessages,
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: allMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: convId, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI response failed" })}\n\n`);
  }
  res.end();
});

export default router;
