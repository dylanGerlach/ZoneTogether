/* eslint-disable no-console */
/**
 * Demo seed: wipe Dylan's old test organizations and replace with a small
 * pool of production-looking organizations, projects, team structure, org/
 * project chats, and a handful of fake teammates.
 *
 * This uses the Supabase service role key so it bypasses RLS and can create
 * auth users directly. Run with:
 *
 *   npx tsx scripts/seed_demo.ts
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const DYLAN_EMAIL = "dylangerlach1215@gmail.com";

// Prefix used for all demo/fake auth users this script creates. Anything in
// auth.users whose email starts with this prefix will be considered seed data
// and pruned when no longer in FAKE_USERS below.
const DEMO_EMAIL_PREFIX = "demo+";

type UUID = string;

type SeedUser = {
  email: string;
  fullName: string;
};

type TeamSpec = {
  name: string;
  colorHex: string;
  memberEmails: string[]; // emails from the fake user pool
};

type ProjectChatAuthor = "dylan" | { email: string };

type ProjectChatMessage = {
  author: ProjectChatAuthor;
  text: string;
  // minutesAgo: how long ago the message was sent, relative to run time
  minutesAgo: number;
};

type ProjectSpec = {
  name: string;
  description: string;
  city: string;
  centerLat: number;
  centerLng: number;
  h3Resolution: 8 | 9 | 10;
  teams: TeamSpec[];
  chat: ProjectChatMessage[];
};

type OrgChatMessage = {
  author: ProjectChatAuthor;
  text: string;
  minutesAgo: number;
};

type OrgSpec = {
  name: string;
  description: string;
  // emails of fake users who are members of this org (role: member/admin)
  memberEmails: string[];
  // emails of fake users who should be admins (subset of memberEmails)
  adminEmails?: string[];
  orgChat: {
    title: string;
    messages: OrgChatMessage[];
  };
  projects: ProjectSpec[];
};

// ---------------------------------------------------------------------------
// Fake user pool (these are the only seeded teammates besides Dylan)
// ---------------------------------------------------------------------------

const SIDARTHA = "demo+sidartha.yogendra@zonetogether.app";
const VALERIE = "demo+valerie.luu@zonetogether.app";
const HECTOR = "demo+hector.quinones@zonetogether.app";
const OMER = "demo+omer.raziuddin@zonetogether.app";

const FAKE_USERS: SeedUser[] = [
  { email: SIDARTHA, fullName: "Sidartha Yogendra" },
  { email: VALERIE, fullName: "Valerie Luu" },
  { email: HECTOR, fullName: "Hector Quinones" },
  { email: OMER, fullName: "Omer Raziuddin" },
];

// ---------------------------------------------------------------------------
// Organization / project / chat definitions
// ---------------------------------------------------------------------------

const ORGS: OrgSpec[] = [
  {
    name: "Greenline Parks Alliance",
    description:
      "Bay Area nonprofit mobilizing volunteer crews for park cleanup days across San Francisco.",
    memberEmails: [SIDARTHA, VALERIE, HECTOR, OMER],
    adminEmails: [SIDARTHA],
    orgChat: {
      title: "Greenline - General",
      messages: [
        {
          author: { email: SIDARTHA },
          text: "Morning team! Reminder that volunteer orientation for new folks is Thursday at 6pm at the Mission office.",
          minutesAgo: 60 * 26,
        },
        {
          author: { email: HECTOR },
          text: "New order of trash grabbers and heavy-duty bags lands Friday - should I split them between GG Park and Dolores?",
          minutesAgo: 60 * 22,
        },
        {
          author: "dylan",
          text: "Yeah, half and half. Dolores runs through supplies faster on weekends.",
          minutesAgo: 60 * 21,
        },
        {
          author: { email: VALERIE },
          text: "FYI - Rec & Parks confirmed the dumpster drop for Golden Gate Park on Saturday.",
          minutesAgo: 60 * 8,
        },
        {
          author: { email: SIDARTHA },
          text: "Huge. Want me to extend the sweep zone to include the East Meadow?",
          minutesAgo: 60 * 7 + 40,
        },
        {
          author: "dylan",
          text: "Yes please, assign it to the East Meadow Crew for Saturday.",
          minutesAgo: 60 * 7,
        },
        {
          author: { email: HECTOR },
          text: "Can someone bring the extra safety vests tomorrow? Mine are all at the Dolores shed.",
          minutesAgo: 60 * 3,
        },
        {
          author: { email: VALERIE },
          text: "I got you - I'll bring six from the Mission office.",
          minutesAgo: 60 * 2 + 45,
        },
        {
          author: { email: OMER },
          text: "I'll be at the SF storage Friday if anyone needs a hand unloading supplies.",
          minutesAgo: 60 * 1 + 30,
        },
      ],
    },
    projects: [
      {
        name: "Golden Gate Park Cleanup",
        description:
          "Saturday volunteer sweep covering the East Meadow, Panhandle, and surrounding paths in Golden Gate Park.",
        city: "San Francisco",
        centerLat: 37.7694,
        centerLng: -122.4862,
        h3Resolution: 9,
        teams: [
          {
            name: "East Meadow Crew",
            colorHex: "#2E7D32",
            memberEmails: [SIDARTHA, VALERIE],
          },
          {
            name: "Panhandle Crew",
            colorHex: "#1565C0",
            memberEmails: [HECTOR, OMER],
          },
        ],
        chat: [
          {
            author: "dylan",
            text: "Kicking off the Golden Gate cleanup! Teams should have their zones painted by end of day.",
            minutesAgo: 60 * 72,
          },
          {
            author: { email: SIDARTHA },
            text: "East Meadow is good to go. We're starting near the tennis courts at 9am Saturday.",
            minutesAgo: 60 * 71,
          },
          {
            author: { email: HECTOR },
            text: "Panhandle is ready. Focusing on the bike path and the lawn near Fell first.",
            minutesAgo: 60 * 70,
          },
          {
            author: { email: OMER },
            text: "Joining Panhandle for the weekend - can take the strip along Oak.",
            minutesAgo: 60 * 69 + 30,
          },
          {
            author: { email: VALERIE },
            text: "Quick q - do we log broken glass separately on the form or under 'hazardous'?",
            minutesAgo: 60 * 48,
          },
          {
            author: "dylan",
            text: "Hazardous, and snap a photo if it's a big pile so Parks can flag it.",
            minutesAgo: 60 * 47 + 50,
          },
          {
            author: { email: HECTOR },
            text: "Found an abandoned encampment on Middle Dr, left it alone and tagged it for the city team.",
            minutesAgo: 60 * 26,
          },
          {
            author: { email: VALERIE },
            text: "Lost my grabber somewhere between the windmill and the polo fields lol. Found it - false alarm.",
            minutesAgo: 60 * 9,
          },
          {
            author: { email: SIDARTHA },
            text: "Anyone else getting GPS drift along JFK? Cells keep snapping.",
            minutesAgo: 60 * 5,
          },
          {
            author: "dylan",
            text: "Yeah it's the tree cover - try refreshing and tapping the cell you're standing in manually.",
            minutesAgo: 60 * 4 + 30,
          },
          {
            author: { email: SIDARTHA },
            text: "Worked. East Meadow is about 60% covered. 9 bags so far.",
            minutesAgo: 60 * 2,
          },
          {
            author: { email: HECTOR },
            text: "Panhandle just wrapped the bike path. Moving to the Oak-side lawn.",
            minutesAgo: 45,
          },
          {
            author: "dylan",
            text: "Amazing progress everyone. I'll push the weekly totals Friday morning.",
            minutesAgo: 12,
          },
        ],
      },
      {
        name: "Dolores Park Weekly Sweep",
        description:
          "Recurring weekly cleanup covering Dolores Park and the surrounding blocks before and after weekend events.",
        city: "San Francisco",
        centerLat: 37.7596,
        centerLng: -122.4269,
        h3Resolution: 9,
        teams: [
          {
            name: "Morning Crew",
            colorHex: "#6A1B9A",
            memberEmails: [VALERIE, OMER],
          },
          {
            name: "Evening Crew",
            colorHex: "#C62828",
            memberEmails: [HECTOR],
          },
        ],
        chat: [
          {
            author: "dylan",
            text: "Dolores sweep schedule for the week is locked in. Morning Crew Saturday 8am, Evening Crew Sunday 5pm.",
            minutesAgo: 60 * 90,
          },
          {
            author: { email: VALERIE },
            text: "Morning Crew has all the supplies packed. Are we taking the utility cart Saturday?",
            minutesAgo: 60 * 89,
          },
          {
            author: "dylan",
            text: "Yes, cart is reserved 7am-noon.",
            minutesAgo: 60 * 88,
          },
          {
            author: { email: HECTOR },
            text: "Evening Crew needs one more volunteer for Sunday if anyone can flex.",
            minutesAgo: 60 * 40,
          },
          {
            author: { email: OMER },
            text: "I can roll over from the Morning Crew if you want, Sunday afternoon is open.",
            minutesAgo: 60 * 39,
          },
          {
            author: { email: HECTOR },
            text: "Perfect, appreciated.",
            minutesAgo: 60 * 38,
          },
          {
            author: { email: VALERIE },
            text: "Photo from Saturday morning - hill zone cleared, 14 bags total.",
            minutesAgo: 60 * 6,
          },
          {
            author: "dylan",
            text: "Great haul. Let's aim to wrap the tennis court side by end of day Sunday.",
            minutesAgo: 60 * 5 + 10,
          },
          {
            author: { email: HECTOR },
            text: "On pace. Will confirm tomorrow EOD.",
            minutesAgo: 25,
          },
        ],
      },
    ],
  },
  {
    name: "Keep Oakland Clean",
    description:
      "Oakland-based nonprofit running weekend park cleanup days and restoration events across the East Bay.",
    memberEmails: [SIDARTHA, VALERIE, HECTOR, OMER],
    adminEmails: [VALERIE],
    orgChat: {
      title: "Keep Oakland Clean - All Hands",
      messages: [
        {
          author: { email: VALERIE },
          text: "Good morning! Weekly numbers went out - total bags collected is up 14% WoW, nice work everyone.",
          minutesAgo: 60 * 28,
        },
        {
          author: { email: SIDARTHA },
          text: "Quick heads up: updated the hazard checklist based on yesterday's debrief. New version is in the drive.",
          minutesAgo: 60 * 24,
        },
        {
          author: "dylan",
          text: "Thanks Sid - can we roll it out to crew leads before Saturday?",
          minutesAgo: 60 * 23 + 40,
        },
        {
          author: { email: SIDARTHA },
          text: "Yeah, I'll do a 15-min walkthrough at the Friday standup.",
          minutesAgo: 60 * 23 + 20,
        },
        {
          author: { email: OMER },
          text: "Anyone free to cover supply pickup Saturday morning? I have a conflict.",
          minutesAgo: 60 * 10,
        },
        {
          author: { email: HECTOR },
          text: "I can cover 9-noon.",
          minutesAgo: 60 * 9 + 30,
        },
        {
          author: "dylan",
          text: "Appreciate it Hector.",
          minutesAgo: 60 * 9,
        },
        {
          author: { email: VALERIE },
          text: "The new pickers are back from repair btw, picked them up today.",
          minutesAgo: 45,
        },
      ],
    },
    projects: [
      {
        name: "Lake Merritt Shoreline Cleanup",
        description:
          "Recurring shoreline sweep at Lake Merritt targeting the pergola side and El Embarcadero edges.",
        city: "Oakland",
        centerLat: 37.8078,
        centerLng: -122.2583,
        h3Resolution: 9,
        teams: [
          {
            name: "North Shore Crew",
            colorHex: "#0277BD",
            memberEmails: [SIDARTHA, HECTOR],
          },
          {
            name: "South Shore Crew",
            colorHex: "#AD1457",
            memberEmails: [VALERIE, OMER],
          },
        ],
        chat: [
          {
            author: "dylan",
            text: "Lake Merritt cleanup day! Remember: shoreline first, then the walking path - keep bags staged at the pergola.",
            minutesAgo: 60 * 96,
          },
          {
            author: { email: SIDARTHA },
            text: "North Shore is rolling out from the pergola in 20.",
            minutesAgo: 60 * 95 + 40,
          },
          {
            author: { email: VALERIE },
            text: "South Shore has 4 volunteers today, hitting El Embarcadero first.",
            minutesAgo: 60 * 95 + 20,
          },
          {
            author: { email: HECTOR },
            text: "The reusable gloves from bin #2 are shredded - anyone else seeing this?",
            minutesAgo: 60 * 70,
          },
          {
            author: { email: OMER },
            text: "Yeah same - grabbed nitrile ones from the shed as backup.",
            minutesAgo: 60 * 69 + 45,
          },
          {
            author: "dylan",
            text: "Good catch. I'll order a fresh case tonight.",
            minutesAgo: 60 * 69,
          },
          {
            author: { email: VALERIE },
            text: "Had a great convo with a family walking by - two of them jumped in and filled a bag with us.",
            minutesAgo: 60 * 30,
          },
          {
            author: { email: OMER },
            text: "+1 - seeing a lot more weekend walkers than last month.",
            minutesAgo: 60 * 29,
          },
          {
            author: "dylan",
            text: "Incredible pace. Reminder to log the fishing line and sharps separately so we can track the hazardous totals.",
            minutesAgo: 60 * 7 + 30,
          },
          {
            author: { email: SIDARTHA },
            text: "North Shore wrapping for the day - 42 bags, 2 hazardous pickups.",
            minutesAgo: 60 * 2,
          },
          {
            author: { email: VALERIE },
            text: "South Shore: 38 bags, 1 hazardous. Will file the report tonight.",
            minutesAgo: 90,
          },
        ],
      },
      {
        name: "Mosswood Park Restoration",
        description:
          "Monthly restoration work at Mosswood Park focused on litter removal, ivy pulls, and trail maintenance.",
        city: "Oakland",
        centerLat: 37.8141,
        centerLng: -122.2599,
        h3Resolution: 9,
        teams: [
          {
            name: "Trail Crew",
            colorHex: "#00695C",
            memberEmails: [OMER],
          },
          {
            name: "Meadow Crew",
            colorHex: "#5D4037",
            memberEmails: [SIDARTHA, HECTOR],
          },
        ],
        chat: [
          {
            author: "dylan",
            text: "Mosswood restoration kickoff! Trail Crew has the back loop, Meadow covers the lawn and playground edge.",
            minutesAgo: 60 * 100,
          },
          {
            author: { email: OMER },
            text: "We'll be on the trail with loppers from 11-2 Wednesday.",
            minutesAgo: 60 * 99,
          },
          {
            author: { email: SIDARTHA },
            text: "Meadow starts the playground edge blocks tomorrow evening.",
            minutesAgo: 60 * 50,
          },
          {
            author: { email: HECTOR },
            text: "Had someone ask about composting the ivy - do we have a one-pager on what goes where?",
            minutesAgo: 60 * 27,
          },
          {
            author: "dylan",
            text: "Yes - in the drive under /Mosswood/Resources. I'll link it in the crew brief so it's easy to grab.",
            minutesAgo: 60 * 26 + 30,
          },
          {
            author: { email: HECTOR },
            text: "Cleared 60 feet of ivy along the east edge today. Looking much better.",
            minutesAgo: 60 * 6,
          },
          {
            author: { email: SIDARTHA },
            text: "Joining you tomorrow, I can cover the west side of the meadow.",
            minutesAgo: 60 * 5 + 30,
          },
          {
            author: "dylan",
            text: "Let's aim to wrap the meadow by Sunday so we have Monday for a clean-up pass on the trail.",
            minutesAgo: 40,
          },
        ],
      },
    ],
  },
  {
    name: "Trailkeepers Collective",
    description:
      "Volunteer collective maintaining and cleaning regional parks and trails across the East Bay and South Bay.",
    memberEmails: [SIDARTHA, VALERIE, HECTOR, OMER],
    adminEmails: [HECTOR],
    orgChat: {
      title: "Trailkeepers - Coordination",
      messages: [
        {
          author: { email: HECTOR },
          text: "Weekly supply order is going in tomorrow - anything to add, drop it here by tonight.",
          minutesAgo: 60 * 30,
        },
        {
          author: { email: OMER },
          text: "We need more contractor bags, down to about 40.",
          minutesAgo: 60 * 29,
        },
        {
          author: "dylan",
          text: "I can pick up a case on the way Thursday if someone Venmos me.",
          minutesAgo: 60 * 28,
        },
        {
          author: { email: SIDARTHA },
          text: "On it - sending now.",
          minutesAgo: 60 * 27 + 30,
        },
        {
          author: { email: VALERIE },
          text: "Two new cleanup requests came in overnight for Tilden, adding them to Saturday's list.",
          minutesAgo: 60 * 12,
        },
        {
          author: { email: OMER },
          text: "Can someone hike in with me tomorrow? Solo trails in that zone aren't great after 6.",
          minutesAgo: 60 * 3,
        },
        {
          author: { email: SIDARTHA },
          text: "I can come along, text me when you head out.",
          minutesAgo: 60 * 2 + 15,
        },
      ],
    },
    projects: [
      {
        name: "Tilden Regional Park Cleanup",
        description:
          "Monthly trail and picnic area cleanup at Tilden Regional Park focused on the Lake Anza and Inspiration Point zones.",
        city: "Berkeley",
        centerLat: 37.8988,
        centerLng: -122.2489,
        h3Resolution: 9,
        teams: [
          {
            name: "Lake Anza Crew",
            colorHex: "#1B5E20",
            memberEmails: [SIDARTHA, HECTOR],
          },
          {
            name: "Inspiration Point Crew",
            colorHex: "#3E2723",
            memberEmails: [VALERIE, OMER],
          },
        ],
        chat: [
          {
            author: "dylan",
            text: "Routes for this weekend are locked in. Both crews start at 10am Saturday.",
            minutesAgo: 60 * 80,
          },
          {
            author: { email: HECTOR },
            text: "Lake Anza has 22 picnic spots to hit, roughly 3 hours with current volunteers.",
            minutesAgo: 60 * 79,
          },
          {
            author: { email: OMER },
            text: "Inspiration Point is 18 stops along the ridge trail. If the truck is free we can knock it out in two.",
            minutesAgo: 60 * 78,
          },
          {
            author: { email: SIDARTHA },
            text: "Quick ask - found a lot of broken glass near the swim beach last week, anyone have extra brooms?",
            minutesAgo: 60 * 40,
          },
          {
            author: { email: HECTOR },
            text: "Yes, I've got two in the shed. I'll bring them Saturday.",
            minutesAgo: 60 * 39 + 30,
          },
          {
            author: "dylan",
            text: "Thanks Hector. Let's also log the glass so we can flag it to Parks next week.",
            minutesAgo: 60 * 39,
          },
          {
            author: { email: OMER },
            text: "Pushed the trail map to the shared folder, everyone has access.",
            minutesAgo: 60 * 14,
          },
          {
            author: { email: VALERIE },
            text: "One of the Inspiration Point picnic tables moved - new spot is just past the overlook. Updated the pin.",
            minutesAgo: 60 * 3,
          },
          {
            author: "dylan",
            text: "Got it, thanks. See you all Saturday.",
            minutesAgo: 40,
          },
        ],
      },
      {
        name: "Alum Rock Park Cleanup",
        description:
          "Coordinated cleanup days at Alum Rock Park in San Jose covering the picnic grounds and lower trails.",
        city: "San Jose",
        centerLat: 37.3969,
        centerLng: -121.7999,
        h3Resolution: 9,
        teams: [
          {
            name: "Picnic Grounds Crew",
            colorHex: "#01579B",
            memberEmails: [SIDARTHA, VALERIE],
          },
          {
            name: "Lower Trail Crew",
            colorHex: "#BF360C",
            memberEmails: [HECTOR, OMER],
          },
        ],
        chat: [
          {
            author: "dylan",
            text: "Setting up the next Alum Rock day. Both crews should have their zones painted by tonight.",
            minutesAgo: 60 * 56,
          },
          {
            author: { email: SIDARTHA },
            text: "Picnic Grounds has 14 sites to sweep, 11 confirmed volunteers.",
            minutesAgo: 60 * 55,
          },
          {
            author: { email: HECTOR },
            text: "Lower Trail: 17 stops along the creek, 15 confirmed.",
            minutesAgo: 60 * 54,
          },
          {
            author: { email: OMER },
            text: "Can we add the area near the bridge? Had a lot of litter there last time.",
            minutesAgo: 60 * 20,
          },
          {
            author: "dylan",
            text: "Yes, adding now.",
            minutesAgo: 60 * 19 + 50,
          },
          {
            author: { email: HECTOR },
            text: "Reminder that if anyone spots poison oak, flag it on the map - do not pull.",
            minutesAgo: 60 * 6,
          },
          {
            author: { email: OMER },
            text: "Copy. Will review the hazard doc before Saturday.",
            minutesAgo: 60 * 5 + 40,
          },
          {
            author: "dylan",
            text: "Appreciate you all. Park looks noticeably better every month we come out.",
            minutesAgo: 20,
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seeding logic
// ---------------------------------------------------------------------------

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_API_KEY;
  assert(url, "SUPABASE_URL missing");
  assert(serviceKey, "SUPABASE_API_KEY (service role) missing");

  const db = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("→ Locating Dylan’s auth user…");
  const dylanId = await findUserIdByEmail(db, DYLAN_EMAIL);
  assert(dylanId, `Could not find auth user for ${DYLAN_EMAIL}`);
  console.log(`  ✓ Dylan user id: ${dylanId}`);

  console.log("→ Wiping Dylan’s existing organizations…");
  await wipeUsersOrganizations(db, dylanId);

  console.log("→ Pruning stale demo auth users…");
  await pruneStaleDemoUsers(db);

  console.log("→ Ensuring fake user pool exists…");
  const emailToUserId = await ensureFakeUsers(db);

  console.log("→ Creating organizations, projects, and chats…");
  for (const org of ORGS) {
    await seedOrg(db, org, dylanId, emailToUserId);
  }

  console.log("✅ Demo seed complete.");
}

async function findUserIdByEmail(
  db: ReturnType<typeof createClient>,
  email: string,
): Promise<UUID | null> {
  // admin.listUsers paginates. Demo DB is small, one page is fine.
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const match = data.users.find(
    (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
  );
  return match?.id ?? null;
}

async function wipeUsersOrganizations(
  db: ReturnType<typeof createClient>,
  userId: UUID,
): Promise<void> {
  const { data: memberships, error } = await db
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);
  if (error) throw error;

  const orgIds = Array.from(
    new Set((memberships ?? []).map((row: any) => row.organization_id as UUID)),
  );
  if (orgIds.length === 0) {
    console.log("  (no orgs to remove)");
    return;
  }
  console.log(`  Removing ${orgIds.length} org(s): ${orgIds.join(", ")}`);

  // message sessions in these orgs (org-level and project-level both set organization_id)
  const { data: sessions } = await db
    .from("message_session")
    .select("id")
    .in("organization_id", orgIds);
  const sessionIds = (sessions ?? []).map((r: any) => r.id as UUID);

  if (sessionIds.length > 0) {
    const { error: msgErr } = await db
      .from("message")
      .delete()
      .in("message_session_id", sessionIds);
    if (msgErr) throw msgErr;

    const { error: susErr } = await db
      .from("message_session_users")
      .delete()
      .in("message_session", sessionIds);
    if (susErr) throw susErr;

    const { error: sessErr } = await db
      .from("message_session")
      .delete()
      .in("id", sessionIds);
    if (sessErr) throw sessErr;
  }

  // Projects cascade to project_teams, project_team_members, project_hex_assignments.
  const { error: projErr } = await db
    .from("projects")
    .delete()
    .in("organization_id", orgIds);
  if (projErr) throw projErr;

  const { error: memErr } = await db
    .from("organization_members")
    .delete()
    .in("organization_id", orgIds);
  if (memErr) throw memErr;

  const { error: orgErr } = await db
    .from("organization")
    .delete()
    .in("id", orgIds);
  if (orgErr) throw orgErr;

  console.log("  ✓ Wiped orgs and all cascading data");
}

async function pruneStaleDemoUsers(
  db: ReturnType<typeof createClient>,
): Promise<void> {
  const keepEmails = new Set(FAKE_USERS.map((u) => u.email.toLowerCase()));
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const stale = data.users.filter((u) => {
    const email = (u.email ?? "").toLowerCase();
    return (
      email.startsWith(DEMO_EMAIL_PREFIX) && !keepEmails.has(email)
    );
  });

  if (stale.length === 0) {
    console.log("  (nothing to prune)");
    return;
  }

  for (const u of stale) {
    // Messages authored by the stale user need to be removed since messages
    // have a required FK (not null effectively) and we don't want them
    // dangling. They're only demo data anyway.
    await db.from("message").delete().eq("user_id", u.id);
    await db.from("message_session_users").delete().eq("user_id", u.id);
    await db.from("organization_members").delete().eq("user_id", u.id);
    await db.from("project_team_members").delete().eq("user_id", u.id);
    await db.from("profiles").delete().eq("id", u.id);
    const { error: delErr } = await db.auth.admin.deleteUser(u.id);
    if (delErr) throw delErr;
    console.log(`  − pruned: ${u.email}`);
  }
}

async function ensureFakeUsers(
  db: ReturnType<typeof createClient>,
): Promise<Map<string, UUID>> {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const emailToId = new Map<string, UUID>();
  for (const u of data.users) {
    if (u.email) emailToId.set(u.email.toLowerCase(), u.id);
  }

  for (const user of FAKE_USERS) {
    const existing = emailToId.get(user.email.toLowerCase());
    if (existing) {
      console.log(`  ✓ existing: ${user.email}`);
      await db
        .from("profiles")
        .upsert(
          { id: existing, full_name: user.fullName },
          { onConflict: "id" },
        );
      continue;
    }
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email: user.email,
      password: randomPassword(),
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });
    if (createErr) throw createErr;
    const newId = created.user?.id;
    assert(newId, `createUser returned no id for ${user.email}`);
    emailToId.set(user.email.toLowerCase(), newId);
    await db
      .from("profiles")
      .upsert({ id: newId, full_name: user.fullName }, { onConflict: "id" });
    console.log(`  + created: ${user.email}`);
  }

  return emailToId;
}

function randomPassword(): string {
  return `demo-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function seedOrg(
  db: ReturnType<typeof createClient>,
  org: OrgSpec,
  dylanId: UUID,
  emailToUserId: Map<string, UUID>,
): Promise<void> {
  console.log(`\n=== ${org.name} ===`);

  // 1. Create organization
  const { data: orgRow, error: orgErr } = await db
    .from("organization")
    .insert({ name: org.name, description: org.description })
    .select("id")
    .single();
  if (orgErr) throw orgErr;
  const organizationId = orgRow!.id as UUID;
  console.log(`  org id: ${organizationId}`);

  // 2. Dylan joins as owner
  const memberships: Array<{
    organization_id: UUID;
    user_id: UUID;
    role: string;
  }> = [{ organization_id: organizationId, user_id: dylanId, role: "owner" }];

  const adminEmails = new Set(
    (org.adminEmails ?? []).map((e) => e.toLowerCase()),
  );
  for (const email of org.memberEmails) {
    const uid = emailToUserId.get(email.toLowerCase());
    assert(uid, `Missing fake user for email ${email}`);
    memberships.push({
      organization_id: organizationId,
      user_id: uid,
      role: adminEmails.has(email.toLowerCase()) ? "admin" : "member",
    });
  }
  const { error: memErr } = await db
    .from("organization_members")
    .insert(memberships);
  if (memErr) throw memErr;
  console.log(`  ✓ ${memberships.length} members added`);

  // 3. Org-wide chat (no project_id)
  await seedOrgChat(db, org, organizationId, dylanId, emailToUserId);

  // 4. Projects
  for (const project of org.projects) {
    await seedProject(
      db,
      organizationId,
      project,
      dylanId,
      emailToUserId,
    );
  }
}

function resolveAuthor(
  author: ProjectChatAuthor,
  dylanId: UUID,
  emailToUserId: Map<string, UUID>,
): UUID {
  if (author === "dylan") return dylanId;
  const uid = emailToUserId.get(author.email.toLowerCase());
  assert(uid, `Missing author user for email ${author.email}`);
  return uid;
}

async function seedOrgChat(
  db: ReturnType<typeof createClient>,
  org: OrgSpec,
  organizationId: UUID,
  dylanId: UUID,
  emailToUserId: Map<string, UUID>,
): Promise<void> {
  const { data: sessionRow, error: sessErr } = await db
    .from("message_session")
    .insert({
      organization_id: organizationId,
      title: org.orgChat.title,
    })
    .select("id")
    .single();
  if (sessErr) throw sessErr;
  const sessionId = sessionRow!.id as UUID;

  // Include Dylan + all org members in the org chat
  const userIds = new Set<UUID>([dylanId]);
  for (const email of org.memberEmails) {
    const uid = emailToUserId.get(email.toLowerCase());
    if (uid) userIds.add(uid);
  }
  const susRows = Array.from(userIds).map((uid) => ({
    user_id: uid,
    message_session: sessionId,
    unread_messages: 0,
  }));
  const { error: susErr } = await db
    .from("message_session_users")
    .insert(susRows);
  if (susErr) throw susErr;

  // Seed messages
  const now = Date.now();
  const sorted = [...org.orgChat.messages].sort(
    (a, b) => b.minutesAgo - a.minutesAgo,
  );
  const rows = sorted.map((m) => ({
    message_session_id: sessionId,
    user_id: resolveAuthor(m.author, dylanId, emailToUserId),
    message: m.text,
    kind: "text",
    timestamp: new Date(now - m.minutesAgo * 60_000).toISOString(),
  }));
  if (rows.length > 0) {
    const { error: msgErr } = await db.from("message").insert(rows);
    if (msgErr) throw msgErr;
    // Update preview with last message
    const last = sorted[sorted.length - 1];
    await db
      .from("message_session")
      .update({ last_message_sent: last.text })
      .eq("id", sessionId);
  }
  console.log(`  ✓ org chat seeded (${rows.length} msgs)`);
}

async function seedProject(
  db: ReturnType<typeof createClient>,
  organizationId: UUID,
  project: ProjectSpec,
  dylanId: UUID,
  emailToUserId: Map<string, UUID>,
): Promise<void> {
  console.log(`  ▸ project: ${project.name}`);
  const { data: projRow, error: projErr } = await db
    .from("projects")
    .insert({
      organization_id: organizationId,
      name: project.name,
      description: project.description,
      h3_resolution: project.h3Resolution,
      city: project.city,
      center_lat: project.centerLat,
      center_lng: project.centerLng,
      created_by: dylanId,
    })
    .select("id")
    .single();
  if (projErr) throw projErr;
  const projectId = projRow!.id as UUID;

  // Teams
  const teamIdByName = new Map<string, UUID>();
  const allTeamMemberIds = new Set<UUID>();
  for (const team of project.teams) {
    const { data: teamRow, error: teamErr } = await db
      .from("project_teams")
      .insert({
        project_id: projectId,
        name: team.name,
        color_hex: team.colorHex.toUpperCase(),
      })
      .select("id")
      .single();
    if (teamErr) throw teamErr;
    const teamId = teamRow!.id as UUID;
    teamIdByName.set(team.name, teamId);

    // project_team_members uniqueness: (project_id, user_id) — same user can’t
    // be in two teams of the same project. De-dupe before inserting.
    const teamMembers = team.memberEmails
      .map((email) => emailToUserId.get(email.toLowerCase()))
      .filter((uid): uid is UUID => typeof uid === "string")
      .filter((uid) => !allTeamMemberIds.has(uid));
    teamMembers.forEach((uid) => allTeamMemberIds.add(uid));

    if (teamMembers.length > 0) {
      const rows = teamMembers.map((uid) => ({
        project_id: projectId,
        team_id: teamId,
        user_id: uid,
        assigned_by: dylanId,
      }));
      const { error: ptmErr } = await db
        .from("project_team_members")
        .insert(rows);
      if (ptmErr) throw ptmErr;
    }
  }

  // Project chat
  const { data: chatRow, error: chatErr } = await db
    .from("message_session")
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      title: `${project.name} - Team Chat`,
    })
    .select("id")
    .single();
  if (chatErr) throw chatErr;
  const sessionId = chatRow!.id as UUID;

  const sessionUserIds = new Set<UUID>([dylanId, ...allTeamMemberIds]);
  const susRows = Array.from(sessionUserIds).map((uid) => ({
    user_id: uid,
    message_session: sessionId,
    unread_messages: 0,
  }));
  const { error: susErr } = await db
    .from("message_session_users")
    .insert(susRows);
  if (susErr) throw susErr;

  const now = Date.now();
  const sorted = [...project.chat].sort(
    (a, b) => b.minutesAgo - a.minutesAgo,
  );
  const messageRows = sorted.map((m) => ({
    message_session_id: sessionId,
    user_id: resolveAuthor(m.author, dylanId, emailToUserId),
    message: m.text,
    kind: "text",
    timestamp: new Date(now - m.minutesAgo * 60_000).toISOString(),
  }));
  if (messageRows.length > 0) {
    const { error: msgErr } = await db.from("message").insert(messageRows);
    if (msgErr) throw msgErr;
    const last = sorted[sorted.length - 1];
    await db
      .from("message_session")
      .update({ last_message_sent: last.text })
      .eq("id", sessionId);
  }
  console.log(
    `    ✓ ${project.teams.length} teams, ${sessionUserIds.size} chat members, ${messageRows.length} messages`,
  );
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
