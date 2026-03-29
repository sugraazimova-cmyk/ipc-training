import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) {
      console.error("[submit-test] Auth failed:", authError?.message);
      return json({ error: "Unauthorized" }, 401);
    }

    // ── 2. Parse input ───────────────────────────────────────────────────
    let test_id: number;
    let answers: Array<{ question_id: number; user_choice: string }>;
    try {
      const body = await req.json();
      test_id = body.test_id;
      answers = body.answers;
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    if (!test_id || !Array.isArray(answers) || answers.length === 0)
      return json({ error: "test_id and answers are required" }, 400);

    // ── 3. No duplicate question_ids ─────────────────────────────────────
    const qIds = answers.map((a) => a.question_id);
    if (new Set(qIds).size !== qIds.length)
      return json({ error: "Duplicate question_id in answers" }, 400);

    // ── 4. Load test + module ────────────────────────────────────────────
    const { data: testRow, error: testErr } = await db
      .from("tests")
      .select("id, module_id, type, modules(pass_threshold, certificate_validity_days)")
      .eq("id", test_id)
      .single();
    if (testErr || !testRow) return json({ error: "Test not found" }, 404);

    const mod = testRow.modules as { pass_threshold: number; certificate_validity_days: number };
    const test = { ...testRow, pass_threshold: mod.pass_threshold, certificate_validity_days: mod.certificate_validity_days };

    // ── 5. Post-test gates ───────────────────────────────────────────────
    if (test.type === "post") {
      // Gate 1: pre-test must have been passed
      const { data: preTest } = await db
        .from("tests").select("id").eq("module_id", test.module_id).eq("type", "pre").maybeSingle();
      if (preTest) {
        const { count } = await db
          .from("test_attempts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id).eq("test_id", preTest.id).eq("passed", true);
        if (!count) return json({ error: "Pre-testi əvvəlcə keçməlisiniz" }, 403);
      }

      // Gate 2: all content completed
      const { data: contents } = await db
        .from("content").select("id").eq("module_id", test.module_id);
      if (contents && contents.length > 0) {
        const { count: doneCount } = await db
          .from("content_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("content_id", contents.map((c) => c.id))
          .eq("completed", true);
        if ((doneCount ?? 0) < contents.length)
          return json({ error: "Bütün materialları tamamlamalısınız" }, 403);
      }
    }

    // ── 6. Daily attempt count (Asia/Baku = UTC+4) ───────────────────────
    const bakuDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baku" }); // YYYY-MM-DD
    const dayStart = new Date(`${bakuDate}T00:00:00+04:00`).toISOString();
    const dayEnd = new Date(`${bakuDate}T24:00:00+04:00`).toISOString();

    const { count: todayCount } = await db
      .from("test_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id).eq("test_id", test_id)
      .gte("attempted_at", dayStart).lt("attempted_at", dayEnd);

    const attemptCount = todayCount ?? 0;
    if (attemptCount >= 3) return json({ error: "Günlük 3 cəhd limitinə çatdınız" }, 429);
    const attempt_number = attemptCount + 1;

    // ── 7. Load questions ────────────────────────────────────────────────
    const { data: questions, error: qErr } = await db
      .from("questions").select("id, options").eq("test_id", test_id).order("display_order");
    if (qErr || !questions?.length) return json({ error: "No questions for this test" }, 400);

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // ── 8. Validate answers ──────────────────────────────────────────────
    for (const answer of answers) {
      const q = questionMap.get(answer.question_id);
      if (!q) return json({ error: `Invalid question_id: ${answer.question_id}` }, 400);
      const valid = (q.options as Array<{ text: string }>).map((o) => o.text);
      if (!valid.includes(answer.user_choice))
        return json({ error: `Invalid choice for question ${answer.question_id}` }, 400);
    }

    // ── 9. Score ─────────────────────────────────────────────────────────
    let correct_count = 0;
    const feedbackFull: Array<{ question_id: number; is_correct: boolean; correct_answer: string }> = [];
    for (const q of questions) {
      const userAnswer = answers.find((a) => a.question_id === q.id);
      const correctOpt = (q.options as Array<{ text: string; is_correct: boolean }>).find((o) => o.is_correct);
      const is_correct = userAnswer ? userAnswer.user_choice === correctOpt?.text : false;
      if (is_correct) correct_count++;
      feedbackFull.push({ question_id: q.id, is_correct, correct_answer: correctOpt?.text ?? "" });
    }

    const score_percent = Math.round((correct_count / questions.length) * 100 * 100) / 100;
    const passed = score_percent >= (test.pass_threshold ?? 80);

    // ── 10. Feedback ─────────────────────────────────────────────────────
    const feedback = feedbackFull.map(({ question_id, is_correct, correct_answer }) =>
      passed ? { question_id, is_correct, correct_answer } : { question_id, is_correct }
    );

    // ── 11. Insert attempt ───────────────────────────────────────────────
    const { data: attempt, error: insertErr } = await db
      .from("test_attempts")
      .insert({ user_id: user.id, test_id, attempt_number, score_percent, passed })
      .select("id").single();
    if (insertErr || !attempt) throw insertErr ?? new Error("Failed to insert attempt");

    // ── 12. Insert answers ───────────────────────────────────────────────
    await db.from("answers").insert(
      questions.map((q) => {
        const ua = answers.find((a) => a.question_id === q.id);
        const fb = feedbackFull.find((f) => f.question_id === q.id)!;
        return { attempt_id: attempt.id, question_id: q.id, user_choice: ua?.user_choice ?? null, is_correct: fb.is_correct };
      })
    );

    // ── 13. Update user_progress ─────────────────────────────────────────
    const { data: prog } = await db
      .from("user_progress").select("status")
      .eq("user_id", user.id).eq("module_id", test.module_id).maybeSingle();
    const existingStatus = prog?.status ?? "not_started";

    let new_status: string;
    if (test.type === "pre" && existingStatus === "completed") new_status = "in_progress";
    else if (passed && test.type === "pre") new_status = "in_progress";
    else if (passed && test.type === "post") new_status = "completed";
    else new_status = existingStatus;

    await db.from("user_progress").upsert(
      { user_id: user.id, module_id: test.module_id, status: new_status, last_accessed: new Date().toISOString() },
      { onConflict: "user_id,module_id" }
    );

    // ── 14. Certificate ──────────────────────────────────────────────────
    let certificate_issued = false;
    let certificate_expires_at: string | null = null;

    if (passed && test.type === "post") {
      const validity = test.certificate_validity_days ?? 365;
      const expiresAt = new Date(Date.now() + validity * 86400000).toISOString();

      const { data: cert } = await db
        .from("certificates").select("expires_at, revoked_at")
        .eq("user_id", user.id).eq("module_id", test.module_id).maybeSingle();

      if (!cert) {
        await db.from("certificates").insert({ user_id: user.id, module_id: test.module_id, issued_at: new Date().toISOString(), expires_at: expiresAt });
        certificate_issued = true;
        certificate_expires_at = expiresAt;
      } else if (new Date(cert.expires_at) < new Date() || cert.revoked_at !== null) {
        await db.from("certificates")
          .update({ issued_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
          .eq("user_id", user.id).eq("module_id", test.module_id);
        certificate_issued = true;
        certificate_expires_at = expiresAt;
      } else {
        certificate_expires_at = cert.expires_at;
      }
    }

    // ── 15. Respond ──────────────────────────────────────────────────────
    return json({
      attempt_id: attempt.id,
      score_percent,
      passed,
      correct_count,
      total_questions: questions.length,
      attempts_today: attempt_number,
      attempts_remaining_today: 3 - attempt_number,
      feedback,
      certificate_issued,
      certificate_expires_at,
    });

  } catch (err) {
    console.error("[submit-test] Unexpected error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
