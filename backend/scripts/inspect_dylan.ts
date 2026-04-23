import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

async function main() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_API_KEY!;
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: users, error: usersErr } = await client.auth.admin.listUsers({
    perPage: 1000,
  });
  if (usersErr) throw usersErr;

  const dylan = users.users.find(
    (u) => (u.email ?? "").toLowerCase() === "dylangerlach1215@gmail.com",
  );
  console.log("Dylan user:", dylan?.id, dylan?.email);
  if (!dylan) return;

  const { data: memberships, error: mErr } = await client
    .from("organization_members")
    .select("organization_id, role, organization:organization(id, name, description)")
    .eq("user_id", dylan.id);
  if (mErr) throw mErr;
  console.log("Organizations:");
  console.log(JSON.stringify(memberships, null, 2));

  if ((memberships ?? []).length > 0) {
    const orgIds = memberships!.map((m: any) => m.organization_id);
    const { data: projects } = await client
      .from("projects")
      .select("id, name, organization_id")
      .in("organization_id", orgIds);
    console.log("Projects in Dylan's orgs:");
    console.log(JSON.stringify(projects, null, 2));
  }

  const { data: profile } = await client
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", dylan.id)
    .maybeSingle();
  console.log("Dylan profile:", profile);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
