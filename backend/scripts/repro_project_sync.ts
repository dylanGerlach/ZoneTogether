import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Direct repro of syncSessionMembers + system message insert against the real
// database, using the service role key. This bypasses HTTP and auth but runs
// the exact same SQL the fixed controller path executes.

async function main() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_API_KEY!;
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const sessionId = "a03efcab-673f-473c-b74d-569994716411"; // Testtttt
  const projectId = "ba7fb469-fbe6-44eb-adfe-1cfd6246a72c";
  const creator = "fae7f889-e6cd-41a6-b493-c9f1111917a5";

  console.log("== Before ==");
  const { data: beforeMsgs } = await client
    .from("message")
    .select("id, kind")
    .eq("message_session_id", sessionId);
  const { data: beforeMembers } = await client
    .from("message_session_users")
    .select("user_id")
    .eq("message_session", sessionId);
  console.log("messages:", beforeMsgs?.length, "members:", beforeMembers?.length);

  console.log("\n== Computing desired members ==");
  const { data: teamRows } = await client
    .from("project_team_members")
    .select("user_id")
    .eq("project_id", projectId);
  const desired = Array.from(
    new Set([...(teamRows ?? []).map((r: any) => r.user_id), creator]),
  );
  console.log("desired:", desired);

  console.log("\n== Running syncSessionMembers logic ==");
  const { data: existing, error: fetchErr } = await client
    .from("message_session_users")
    .select("user_id")
    .eq("message_session", sessionId);
  if (fetchErr) throw fetchErr;
  const current = new Set((existing ?? []).map((r: any) => r.user_id));

  const added: string[] = desired.filter((id) => !current.has(id));
  const removed: string[] = [...current].filter(
    (id) => !desired.includes(id as string),
  ) as string[];
  console.log({ added, removed });

  if (added.length > 0) {
    const { error } = await client
      .from("message_session_users")
      .insert(
        added.map((userId) => ({
          user_id: userId,
          message_session: sessionId,
        })),
      );
    if (error) throw error;
    console.log("inserted", added.length, "members");
  }

  if (removed.length > 0) {
    const { error } = await client
      .from("message_session_users")
      .delete()
      .eq("message_session", sessionId)
      .in("user_id", removed);
    if (error) throw error;
    console.log("removed", removed.length, "members");
  }

  console.log("\n== Emitting system_join for added ==");
  for (const userId of added) {
    const { data, error } = await client
      .from("message")
      .insert({
        message_session_id: sessionId,
        user_id: userId,
        message: "",
        kind: "system_join",
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      console.error("system_join insert error:", error);
      throw error;
    }
    console.log("inserted system_join", { userId, id: data.id });
  }

  console.log("\n== After ==");
  const { data: afterMsgs } = await client
    .from("message")
    .select("id, user_id, kind, message, timestamp")
    .eq("message_session_id", sessionId)
    .order("timestamp", { ascending: false });
  console.log("messages:", afterMsgs?.length);
  console.log(afterMsgs);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
