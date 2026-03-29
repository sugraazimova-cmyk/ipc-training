import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const pool = new Pool(Deno.env.get("DB_URL")!, 3, true);

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

  // ── 1. Auth ────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.error("[submit-test] Missing Authorization header");
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("[submit-test] Auth failed:", authError?.message);
    return json({ error: "Unauthorized" }, 401);
  }

  // ── 2. Parse input ─────────────────────────────────────────────────────
  let test_id: number;
  let answers: Array<{ question_id: number; user_choice: string }>;

  try {
    const body = await req.json();
    test_id = body.test_id;
    answers = body.answers;
  } catch (e) {
    console.error("[submit-test] JSON parse error:", e);
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!test_id || !Array.isArray(answers) || answers.length === 0) {
    return json({ error: "test_id and answers are required" }, 400);
  }

  // ── 3. Validate: no duplicate question_ids ─────────────────────────────
  const qIds = answers.map((a) => a.question_id);
  if (new Set(qIds).size !== qIds.length) {
    return json({ error: "Duplicate question_id in answers" }, 400);
  }

  const db = await pool.connect();

  try {
    await db.queryObject("BEGIN");

    // ── 4. Load test + module ──────────────────────────────────────────
    const testRes = await db.queryObject<{
      id: number; module_id: number; type: string;
      pass_threshold: number; certificate_validity_days: number;
    }>(
      `SELECT t.id, t.module_id, t.type,
              m.pass_threshold, m.certificate_validity_days
       FROM tests t JOIN modules m ON t.module_id = m.id
       WHERE t.id = $1`,
      [test_id]
    );

    if (!testRes.rows.length) {
      await db.queryObject("ROLLBACK");
      console.error("[submit-test] Test not found:", test_id);
      return json({ error: "Test not found" }, 404);
    }
    const test = testRes.rows[0];

    // ── 5. Post-test gates: pre-test passed + all content completed ───
    if (test.type === "post") {
      // Gate 1: pre-test must be passed
      const preRes = await db.queryObject<{ id: number }>(
        `SELECT id FROM tests WHERE module_id = $1 AND type = 'pre'`,
        [test.module_id]
      );
      if (preRes.rows.length) {
        const preTestId = preRes.rows[0].id;
        const preAttemptRes = await db.queryObject<{ count: string }>(
          `SELECT COUNT(*) AS count FROM test_attempts
           WHERE user_id = $1 AND test_id = $2 AND passed = true`,
          [user.id, preTestId]
        );
        if (parseInt(preAttemptRes.rows[0].count) === 0) {
          await db.queryObject("ROLLBACK");
          console.error("[submit-test] Post-test without passing pre-test, user:", user.id);
          return json({ error: "Pre-testi əvvəlcə keçməlisiniz" }, 403);
        }
      }

      // Gate 2: all content for this module must be completed
      const incompleteRes = await db.queryObject<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM content c
         LEFT JOIN content_progress cp
           ON cp.content_id = c.id AND cp.user_id = $1
         WHERE c.module_id = $2
           AND (cp.completed IS NULL OR cp.completed = false)`,
        [user.id, test.module_id]
      );
      if (parseInt(incompleteRes.rows[0].count) > 0) {
        await db.queryObject("ROLLBACK");
        console.error("[submit-test] Post-test with incomplete content, user:", user.id);
        return json({ error: "Bütün materialları tamamlamalısınız" }, 403);
      }
    }

    // ── 6. Advisory lock — serialises concurrent requests per user+test
    await db.queryObject(
      `SELECT pg_advisory_xact_lock(hashtext($1::text || $2::text))`,
      [`${user.id}`, `${test_id}`]
    );

    // ── 7. Daily attempt count (timezone-aware: Asia/Baku = UTC+4) ────
    const countRes = await db.queryObject<{ count: string }>(
      `SELECT COUNT(*) AS count FROM test_attempts
       WHERE user_id = $1
         AND test_id = $2
         AND DATE(attempted_at AT TIME ZONE 'Asia/Baku')
           = DATE(NOW() AT TIME ZONE 'Asia/Baku')`,
      [user.id, test_id]
    );
    const todayCount = parseInt(countRes.rows[0].count);

    if (todayCount >= 3) {
      await db.queryObject("ROLLBACK");
      console.error("[submit-test] Daily limit reached, user:", user.id);
      return json({ error: "Günlük 3 cəhd limitinə çatdınız" }, 429);
    }

    const attempt_number = todayCount + 1;

    // ── 8. Load questions ──────────────────────────────────────────────
    const questionsRes = await db.queryObject<{
      id: number;
      options: Array<{ text: string; is_correct: boolean }>;
    }>(
      `SELECT id, options FROM questions
       WHERE test_id = $1 ORDER BY display_order`,
      [test_id]
    );

    if (!questionsRes.rows.length) {
      await db.queryObject("ROLLBACK");
      return json({ error: "No questions configured for this test" }, 400);
    }
    const questions = questionsRes.rows;
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // ── 9. Validate answers against loaded questions ───────────────────
    for (const answer of answers) {
      const question = questionMap.get(answer.question_id);
      if (!question) {
        await db.queryObject("ROLLBACK");
        console.error("[submit-test] Invalid question_id:", answer.question_id);
        return json({ error: `Invalid question_id: ${answer.question_id}` }, 400);
      }
      const validChoices = question.options.map((o) => o.text);
      if (!validChoices.includes(answer.user_choice)) {
        await db.queryObject("ROLLBACK");
        console.error("[submit-test] Invalid choice for question:", answer.question_id);
        return json({ error: `Invalid choice for question ${answer.question_id}` }, 400);
      }
    }

    // ── 10. Score calculation ──────────────────────────────────────────
    let correct_count = 0;
    const feedbackFull: Array<{
      question_id: number; is_correct: boolean; correct_answer: string;
    }> = [];

    for (const q of questions) {
      const userAnswer = answers.find((a) => a.question_id === q.id);
      const correctOpt = q.options.find((o) => o.is_correct);
      const is_correct = userAnswer
        ? userAnswer.user_choice === correctOpt?.text
        : false;

      if (is_correct) correct_count++;
      feedbackFull.push({
        question_id: q.id,
        is_correct,
        correct_answer: correctOpt?.text ?? "",
      });
    }

    const score_percent =
      Math.round((correct_count / questions.length) * 100 * 100) / 100;
    const passed = score_percent >= (test.pass_threshold ?? 80);

    // ── 11. Feedback: reveal correct_answer only on pass ──────────────
    const feedback = feedbackFull.map(({ question_id, is_correct, correct_answer }) =>
      passed
        ? { question_id, is_correct, correct_answer }
        : { question_id, is_correct }
    );

    // ── 12. Insert attempt ─────────────────────────────────────────────
    const attemptRes = await db.queryObject<{ id: number }>(
      `INSERT INTO test_attempts
         (user_id, test_id, attempt_number, score_percent, passed, attempted_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [user.id, test_id, attempt_number, score_percent, passed]
    );
    const attempt_id = attemptRes.rows[0].id;

    // ── 13. Insert answers (all questions, unanswered stored as null) ──
    for (const q of questions) {
      const userAnswer = answers.find((a) => a.question_id === q.id);
      const fb = feedbackFull.find((f) => f.question_id === q.id)!;
      await db.queryObject(
        `INSERT INTO answers (attempt_id, question_id, user_choice, is_correct)
         VALUES ($1, $2, $3, $4)`,
        [attempt_id, q.id, userAnswer?.user_choice ?? null, fb.is_correct]
      );
    }

    // ── 14. Update user_progress (retake reset included) ──────────────
    const progressRes = await db.queryObject<{ status: string }>(
      `SELECT status FROM user_progress WHERE user_id = $1 AND module_id = $2`,
      [user.id, test.module_id]
    );
    const existingStatus = progressRes.rows[0]?.status ?? "not_started";

    let new_status: string;
    if (test.type === "pre" && existingStatus === "completed") {
      new_status = "in_progress"; // retake: reset from completed
    } else if (passed && test.type === "pre") {
      new_status = "in_progress";
    } else if (passed && test.type === "post") {
      new_status = "completed";
    } else {
      new_status = existingStatus; // preserve on fail
    }

    await db.queryObject(
      `INSERT INTO user_progress (user_id, module_id, status, last_accessed)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, module_id) DO UPDATE
         SET status = $3, last_accessed = NOW()`,
      [user.id, test.module_id, new_status]
    );

    // ── 15. Certificate (post-test pass only) ─────────────────────────
    let certificate_issued = false;
    let certificate_expires_at: string | null = null;

    if (passed && test.type === "post") {
      const validity = test.certificate_validity_days ?? 365;

      const certRes = await db.queryObject<{
        expires_at: string; revoked_at: string | null;
      }>(
        `SELECT expires_at, revoked_at FROM certificates
         WHERE user_id = $1 AND module_id = $2`,
        [user.id, test.module_id]
      );

      if (!certRes.rows.length) {
        // No cert exists — insert fresh
        const inserted = await db.queryObject<{ expires_at: string }>(
          `INSERT INTO certificates (user_id, module_id, issued_at, expires_at)
           VALUES ($1, $2, NOW(), NOW() + (COALESCE($3, 365) * INTERVAL '1 day'))
           RETURNING expires_at`,
          [user.id, test.module_id, validity]
        );
        certificate_issued = true;
        certificate_expires_at = inserted.rows[0].expires_at;

      } else {
        const cert = certRes.rows[0];
        const expired = new Date(cert.expires_at) < new Date();
        const revoked = cert.revoked_at !== null;

        if (expired || revoked) {
          // Re-issue: UPDATE preserves UNIQUE(user_id, module_id)
          const updated = await db.queryObject<{ expires_at: string }>(
            `UPDATE certificates
             SET issued_at  = NOW(),
                 expires_at = NOW() + (COALESCE($3, 365) * INTERVAL '1 day'),
                 revoked_at = NULL
             WHERE user_id = $1 AND module_id = $2
             RETURNING expires_at`,
            [user.id, test.module_id, validity]
          );
          certificate_issued = true;
          certificate_expires_at = updated.rows[0].expires_at;

        } else {
          // Active cert already exists — skip, return existing expiry
          certificate_expires_at = cert.expires_at;
        }
      }
    }

    // ── 16. Commit and return ──────────────────────────────────────────
    await db.queryObject("COMMIT");

    return json({
      attempt_id,
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
    await db.queryObject("ROLLBACK");
    console.error("[submit-test] Unexpected error:", err);
    return json({ error: "Internal server error" }, 500);
  } finally {
    db.release();
  }
});
