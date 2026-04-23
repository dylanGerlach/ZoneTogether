/* eslint-disable no-console */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_API_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_API_KEY missing");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const target =
    "Amazing progress everyone. I'll push the weekly totals Friday morning.";
  const { data: found, error: findErr } = await db
    .from("message")
    .select("id, message, message_session_id")
    .eq("message", target);
  if (findErr) throw findErr;

  console.log(`Found ${found?.length ?? 0} matching message(s)`);
  console.log(found);

  if (found && found.length > 0) {
    const ids = found.map((r: any) => r.id);
    const { error: delErr } = await db.from("message").delete().in("id", ids);
    if (delErr) throw delErr;
    console.log(`Deleted ${ids.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
