import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

async function main() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_API_KEY!;
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("== Most recent project chat sessions ==");
  const { data: sessions, error: sessionsErr } = await client
    .from("message_session")
    .select("id, title, project_id, organization_id, created_at")
    .not("project_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (sessionsErr) {
    console.error("sessions error:", sessionsErr);
    return;
  }
  console.log(sessions);

  if (!sessions || sessions.length === 0) {
    console.log("No project sessions found.");
    return;
  }

  const session = sessions[0];
  console.log(`\n== Picking session: ${session.id} (${session.title}) ==`);

  const { data: members } = await client
    .from("message_session_users")
    .select("user_id, created_at")
    .eq("message_session", session.id);
  console.log("Current members:", members);

  console.log("\n== Recent messages in this session ==");
  const { data: msgs } = await client
    .from("message")
    .select("id, user_id, message, kind, timestamp")
    .eq("message_session_id", session.id)
    .order("timestamp", { ascending: false })
    .limit(10);
  console.log(msgs);

  const systemCount = (msgs ?? []).filter(
    (m: any) => m.kind === "system_join" || m.kind === "system_leave",
  ).length;
  console.log(`\nSystem message count: ${systemCount}`);

  console.log("\n== Project team members for this project ==");
  const { data: teamMembers } = await client
    .from("project_team_members")
    .select("user_id, team_id")
    .eq("project_id", session.project_id);
  const distinct = Array.from(
    new Set((teamMembers ?? []).map((r: any) => r.user_id)),
  );
  console.log("Distinct project user_ids:", distinct);
  console.log("Raw team_member rows:", teamMembers);

  console.log("\n== Project created_by ==");
  const { data: projRow } = await client
    .from("projects")
    .select("id, name, created_by")
    .eq("id", session.project_id)
    .single();
  console.log(projRow);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
