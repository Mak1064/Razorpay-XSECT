import {
  analyticsEventsTable, availabilityRulesTable, connectionTable, conversationTable, db,
  eventAdminTable, eventRsvpTable, eventTable, introductionRequestsTable, messageTable,
  offersTable, organizationMembersTable, organizationOpportunitiesTable, organizationsTable,
  planOverridesTable, professionalProfileTable, reputationEventsTable, reviewsTable,
  standingAlertsTable, wantsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { AREAS } from "../../lib/geo";
import { engine } from "../xsect-engine";
import {
  COMPANIES, FIRST_NAMES, INDUSTRIES, LAST_NAMES, MESSAGE_SEQUENCES, ORG_NAMES,
  ROLE_DATA, ROLE_KINDS, type RoleKind,
} from "./data";
import { daysAgo, SeededRandom } from "./random";
import { resetSeedData } from "./reset";

export type SeedPhase = "profiles" | "graph" | "activity" | "all";
const USER_COUNT = 160;
const ids = Array.from({ length: USER_COUNT }, (_, index) => `seed_u_${String(index + 1).padStart(3, "0")}`);
const now = new Date();
const expires = (days: number) => new Date(now.getTime() + days * 86_400_000);
const cityCounts: Array<[string, number]> = [["Bengaluru", 88], ["Mumbai", 20], ["Delhi/Gurgaon", 20], ["Hyderabad", 17], ["Pune", 15]];

async function inBatches<T>(items: readonly T[], size: number, task: (item: T) => Promise<unknown>) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(task));
  }
}

function assignedAreas() {
  const output: typeof AREAS = [];
  for (const [group, count] of cityCounts) {
    const candidates = AREAS.filter((area) => group === "Delhi/Gurgaon" ? area.city === "Delhi" || area.city === "Gurgaon" : area.city === group);
    for (let index = 0; index < count; index++) output.push(candidates[index % candidates.length]!);
  }
  return output;
}

const categoriesFor = (kind: RoleKind) => {
  const data = ROLE_DATA[kind];
  return [data.want, data.offer, kind === "founder" ? "cofounder" : kind === "investor" ? "mentor" : "collaboration"];
};

const wantCopy: Record<string, [string, string]> = {
  job: ["Exploring a high-impact role", "Looking for a team with strong product thinking, clear customer value, and meaningful ownership."],
  investor: ["Seeking aligned early-stage investors", "Looking to meet investors who understand the sector and support founders beyond the cheque."],
  cofounder: ["Looking for a complementary co-founder", "Seeking a thoughtful builder with aligned ambition, values, and appetite for the early journey."],
  freelancer: ["Need an experienced product freelancer", "Looking for hands-on support to ship a focused product milestone over the next few weeks."],
  client: ["Looking for a new client engagement", "Open to a well-scoped engagement with a team that values craft, clarity, and measurable outcomes."],
  introduction: ["Seeking a relevant professional introduction", "Looking for a warm path to operators and decision-makers with shared professional context."],
  partnership: ["Exploring a strategic partnership", "Interested in a complementary partner for a practical, outcome-led collaboration."],
  mentor: ["Seeking experienced mentorship", "Looking for candid guidance from someone who has navigated a similar stage of growth."],
  advice: ["Looking for practical advice", "Seeking a focused conversation with someone experienced in this problem space."],
};

const offerCopy: Record<string, [string, string]> = {
  hiring: ["Hiring for a growing team", "Offering a high-ownership role with direct access to customers, product decisions, and company leadership."],
  investment: ["Investing in ambitious early-stage teams", "Offering founder-friendly capital, strategic support, and relevant portfolio introductions."],
  partnership: ["Open to strategic partnerships", "Offering complementary distribution, domain expertise, and a bias toward practical pilots."],
  expertise: ["Offering specialist expertise", "Happy to share practical experience and help a strong team make progress on a defined challenge."],
  freelancing: ["Available for a focused product engagement", "Offering senior hands-on delivery from discovery through a production-ready release."],
  consulting: ["Offering a focused advisory sprint", "Helping teams make sharper strategic decisions with research, analysis, and an executable plan."],
  services: ["Startup legal and commercial support", "Offering pragmatic support designed for fast-moving companies and responsible growth."],
  introductions: ["Offering relevant professional introductions", "Happy to connect credible people where the context and mutual value are clear."],
  mentoring: ["Offering founder and operator mentorship", "Available for candid, practical conversations grounded in operating experience."],
};

async function clearProfilePhase() {
  const statements = [
    sql`delete from social_event_rsvps where user_id like 'seed\_%' escape '\' or event_id in (select id from social_events where created_by like 'seed\_%' escape '\')`,
    sql`delete from social_event_admins where user_id like 'seed\_%' escape '\' or event_id in (select id from social_events where created_by like 'seed\_%' escape '\')`,
    sql`delete from social_events where created_by like 'seed\_%' escape '\'`,
    sql`delete from organization_members where user_id like 'seed\_%' escape '\' or organization_id in (select id from organizations where created_by like 'seed\_%' escape '\')`,
    sql`delete from organization_opportunities where created_by like 'seed\_%' escape '\' or organization_id in (select id from organizations where created_by like 'seed\_%' escape '\')`,
    sql`delete from organizations where created_by like 'seed\_%' escape '\'`,
    sql`delete from availability_rules where user_id like 'seed\_%' escape '\'`,
    sql`delete from wants where user_id like 'seed\_%' escape '\'`,
    sql`delete from offers where user_id like 'seed\_%' escape '\'`,
  ];
  for (const statement of statements) await db.execute(statement);
}

export async function seedProfiles(): Promise<void> {
  await clearProfilePhase();
  const random = new SeededRandom(101);
  const areas = assignedAreas();
  const profiles = ids.map((userId, index) => {
    const kind = ROLE_KINDS[index % ROLE_KINDS.length]!;
    const roleData = ROLE_DATA[kind];
    const area = areas[index]!;
    const trustLevel = index % 20 < 8 ? "contact" as const : index % 20 < 17 ? "professional" as const : "enhanced" as const;
    const visibility = index % 100 === 0 ? "ghost" as const : index % 25 < 1 ? "stealth" as const : index % 13 === 0 ? "trusted_only" as const : "discoverable" as const;
    const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index * 7 + Math.floor(index / FIRST_NAMES.length)) % LAST_NAMES.length]}`;
    const skillCount = random.int(4, Math.min(10, roleData.skills.length));
    const skills = random.shuffle(roleData.skills).slice(0, skillCount);
    const company = COMPANIES[(index * 5 + random.int(0, 4)) % COMPANIES.length]!;
    const startYear = 2010 + (index % 11);
    const radius = [5, 10, 15, 25, 50][index % 5]!;
    const jitterLat = (random.next() - 0.5) * 0.012;
    const jitterLng = (random.next() - 0.5) * 0.012;
    return {
      userId, displayName: name, role: roleData.role, intent: roleData.intent, photoUrl: null,
      company, industry: INDUSTRIES[index % INDUSTRIES.length],
      identity: { pronouns: index % 2 ? "they/them" : "she/her", location: `${area.area}, ${area.city}` },
      experience: [
        { title: roleData.role, company, startYear: 2021 + index % 4, description: `Leading ${skills.slice(0, 2).join(" and ")} initiatives.` },
        { title: kind === "founder" ? "Product Lead" : `Senior ${roleData.role.replace("Senior ", "")}`, company: COMPANIES[(index + 9) % COMPANIES.length]!, startYear, endYear: 2021 + index % 3 },
      ],
      links: [], skills,
      wants: [(wantCopy[roleData.want] ?? wantCopy.advice)![0]],
      offers: [(offerCopy[roleData.offer] ?? offerCopy.expertise)![0]],
      opportunityCategories: categoriesFor(kind),
      availability: index % 10 < 3 ? "available_now" : index % 10 < 6 ? "this_week" : index % 10 < 9 ? "flexible" : "not_available",
      urgency: index % 10 < 2 ? "urgent" : index % 10 < 7 ? "active" : "exploring",
      discoveryRadius: radius,
      notificationPreferences: { email: true, push: index % 4 !== 0, matches: true, messages: true },
      privacy: { trustedConnectionsOnly: visibility === "trusted_only", womenOnly: index % 20 === 3, stealthMode: visibility === "stealth", fieldVisibility: {} },
      trustReputation: { score: trustLevel === "contact" ? random.int(20, 48) : trustLevel === "professional" ? random.int(50, 78) : random.int(80, 96), completedConnections: 0, endorsements: 0 },
      onboardingComplete: true, city: area.city, area: area.area,
      approxLat: area.lat + jitterLat, approxLng: area.lng + jitterLng, trustLevel, visibility,
      stealthIntents: visibility === "stealth" ? [roleData.want, roleData.offer] : [],
      lastActiveAt: daysAgo(Math.floor(Math.pow(random.next(), 2.2) * 30), random, now),
      createdAt: daysAgo(random.int(1, 180), random, now),
    };
  });
  await db.insert(professionalProfileTable).values(profiles).onConflictDoUpdate({
    target: professionalProfileTable.userId,
    set: { onboardingComplete: true, updatedAt: now },
  });

  const wants = profiles.flatMap((profile, index) => {
    const kind = ROLE_KINDS[index % ROLE_KINDS.length]!;
    const primary = ROLE_DATA[kind].want;
    const count = index % 5 < 3 ? 2 : 1; // 256 total
    return Array.from({ length: count }, (_, offset) => {
      const category = (offset ? (kind === "founder" ? "cofounder" : kind === "investor" ? "introduction" : "advice") : primary) as "job" | "investor" | "cofounder" | "freelancer" | "client" | "introduction" | "partnership" | "mentor" | "advice";
      const copy = wantCopy[category] ?? wantCopy.advice!;
      return { userId: profile.userId, title: copy[0], description: copy[1], category, skills: profile.skills.slice(0, 4), industry: profile.industry, locationPreference: `${profile.area}, ${profile.city}`, radiusKm: profile.discoveryRadius, intent: index % 9 === 0 ? "urgent" as const : index % 4 === 0 ? "casual" as const : "active" as const, availability: profile.availability, workMode: index % 3 === 0 ? "hybrid" as const : index % 3 === 1 ? "remote" as const : "flexible" as const, visibility: profile.visibility === "trusted_only" ? "trusted_only" as const : "discoverable" as const, trustRequirement: index % 8 === 0 ? "professional" as const : "contact" as const, expiresAt: expires(30 + index % 61), createdAt: daysAgo(index % 45, random, now) };
    });
  });
  const offers = profiles.flatMap((profile, index) => {
    const kind = ROLE_KINDS[index % ROLE_KINDS.length]!;
    const primary = ROLE_DATA[kind].offer;
    const count = index % 5 < 4 ? 2 : 1; // 288 total
    return Array.from({ length: count }, (_, offset) => {
      const category = (offset ? (kind === "founder" ? "hiring" : kind === "investor" ? "mentoring" : "expertise") : primary) as "hiring" | "investment" | "partnership" | "expertise" | "freelancing" | "consulting" | "services" | "introductions" | "mentoring";
      const copy = offerCopy[category] ?? offerCopy.expertise!;
      return { userId: profile.userId, title: copy[0], description: copy[1], category, skills: profile.skills.slice(0, 4), industry: profile.industry, locationPreference: `${profile.area}, ${profile.city}`, radiusKm: profile.discoveryRadius, intent: index % 11 === 0 ? "urgent" as const : "active" as const, availability: profile.availability, workMode: index % 3 === 0 ? "in_person" as const : index % 3 === 1 ? "remote" as const : "flexible" as const, visibility: "discoverable" as const, trustRequirement: index % 10 === 0 ? "professional" as const : "contact" as const, expiresAt: expires(45 + index % 60), createdAt: daysAgo(index % 40, random, now) };
    });
  });
  await db.insert(wantsTable).values(wants);
  await db.insert(offersTable).values(offers);

  const rules: Array<typeof availabilityRulesTable.$inferInsert> = profiles.flatMap((profile, index): Array<typeof availabilityRulesTable.$inferInsert> => {
    if (index % 10 >= 7) return [];
    const count = 2 + index % 3;
    const recurring: Array<typeof availabilityRulesTable.$inferInsert> = Array.from({ length: count }, (_, offset) => ({ userId: profile.userId, mode: "recurring", weekday: (index + offset * 2) % 7, date: null, startTime: offset % 2 ? "14:00" : "09:30", endTime: offset % 2 ? "17:30" : "12:30", timezone: "Asia/Kolkata" }));
    if (index % 12 === 0) recurring.push({ userId: profile.userId, mode: "one_off", weekday: null, date: new Date(now.getTime() + (index % 14 + 1) * 86_400_000).toISOString().slice(0, 10), startTime: "16:00", endTime: "18:00", timezone: "Asia/Kolkata" });
    return recurring;
  });
  await db.insert(availabilityRulesTable).values(rules);

  const organizations = ORG_NAMES.map((name, index) => {
    const ownerIndex = index * 6 % USER_COUNT;
    const area = areas[ownerIndex]!;
    return { name, slug: `seed-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, logoUrl: null, description: `${name} brings experienced builders, operators, and partners together around practical outcomes.`, industry: INDUSTRIES[index % INDUSTRIES.length], size: index % 4 === 0 ? "2–10" : index % 4 === 1 ? "11–50" : index % 4 === 2 ? "51–200" : "Community", city: area.city, area: area.area, website: null, verificationState: index % 6 === 0 ? "pending" as const : index % 4 === 0 ? "unverified" as const : "verified" as const, createdBy: ids[ownerIndex]! };
  });
  const insertedOrgs = await db.insert(organizationsTable).values(organizations).returning();
  for (let index = 0; index < insertedOrgs.length; index++) {
    const organization = insertedOrgs[index]!;
    const owner = profiles.findIndex((profile) => profile.userId === organization.createdBy);
    const sameCity = profiles.filter((profile) => profile.city === organization.city);
    const memberCount = 3 + index % 7;
    const members = Array.from({ length: memberCount }, (_, memberIndex) => ({
      organizationId: organization.id,
      userId: memberIndex === 0 ? ids[owner]! : sameCity[(index * 3 + memberIndex) % sameCity.length]!.userId,
      role: memberIndex === 0 ? "owner" as const : memberIndex === 1 && index % 3 === 0 ? "admin" as const : "member" as const,
    }));
    await db.insert(organizationMembersTable).values(members).onConflictDoNothing();
    const types = ["job", "partnership", "freelance", "mentorship", "investor", "event"] as const;
    await db.insert(organizationOpportunitiesTable).values(types.slice(0, 3).map((type, offset) => ({
      organizationId: organization.id, type,
      title: type === "job" ? `Join ${organization.name}'s product team` : type === "investor" ? "Founder office hours" : `${type[0]!.toUpperCase()}${type.slice(1)} opportunity`,
      description: `A current ${type} opportunity for experienced professionals who value clear goals and collaborative delivery.`,
      skills: profiles[owner]!.skills.slice(offset, offset + 3), industry: organization.industry,
      workMode: offset === 0 ? "hybrid" as const : "flexible" as const, city: organization.city, area: organization.area,
      intent: offset === 0 ? "urgent" as const : "active" as const, expiresAt: expires(30 + index + offset * 10), createdBy: organization.createdBy,
    })));
  }

  const eventTitles = ["SaaS Founders Roundtable", "Responsible AI Builders", "Climate Operators Evening", "Fintech Product Forum", "Design Systems Exchange", "Healthtech Partnership Circle", "D2C Growth Breakfast", "Engineering Leadership Salon"];
  for (let index = 0; index < eventTitles.length; index++) {
    const area = areas[index * 19 % areas.length]!;
    const creator = ids[index * 19 % USER_COUNT]!;
    const [event] = await db.insert(eventTable).values({ title: eventTitles[index]!, description: "A curated professional gathering for substantive conversations, practical learning, and relevant introductions.", location: `${area.area}, ${area.city}`, startsAt: new Date(now.getTime() + (5 + index * 5) * 86_400_000), capacity: String(35 + index * 5), createdBy: creator, intentTags: [INDUSTRIES[index % INDUSTRIES.length]!.toLowerCase(), "partnership", index % 2 ? "hiring" : "fundraising"], womenOnly: index === 6 }).returning();
    await db.insert(eventAdminTable).values([{ eventId: event!.id, userId: creator, role: "owner" }, { eventId: event!.id, userId: ids[(index * 19 + 1) % USER_COUNT]!, role: "admin" }]);
    const attendeePool = profiles.filter((profile) => profile.city === area.city);
    const rsvpCount = Math.min(10 + index * 4, attendeePool.length);
    await db.insert(eventRsvpTable).values(Array.from({ length: rsvpCount }, (_, attendee) => ({ eventId: event!.id, userId: attendeePool[(attendee * 3 + index) % attendeePool.length]!.userId, status: attendee < rsvpCount - 2 ? "confirmed" as const : "waitlisted" as const }))).onConflictDoNothing();
  }
}

async function clearGraphPhase() {
  const statements = [
    sql`delete from reputation_events where user_id like 'seed\_%' escape '\'`,
    sql`delete from reviews where reviewer_id like 'seed\_%' escape '\' or reviewee_id like 'seed\_%' escape '\'`,
    sql`delete from social_messages where sender_id like 'seed\_%' escape '\' or conversation_id in (select id from social_conversations where participant_a like 'seed\_%' escape '\' or participant_b like 'seed\_%' escape '\')`,
    sql`delete from social_conversations where participant_a like 'seed\_%' escape '\' or participant_b like 'seed\_%' escape '\'`,
    sql`delete from social_connections where requester_id like 'seed\_%' escape '\' or recipient_id like 'seed\_%' escape '\'`,
    sql`delete from introduction_requests where requester_id like 'seed\_%' escape '\' or intermediary_id like 'seed\_%' escape '\' or target_user_id like 'seed\_%' escape '\'`,
    sql`delete from standing_alerts where user_id like 'seed\_%' escape '\'`,
    sql`delete from plan_overrides where user_id like 'seed\_%' escape '\'`,
  ];
  for (const statement of statements) await db.execute(statement);
}

export async function seedGraph(): Promise<void> {
  await clearGraphPhase();
  const random = new SeededRandom(202);
  const areas = assignedAreas();
  const byCity = new Map<string, number[]>();
  areas.forEach((area, index) => byCity.set(area.city, [...(byCity.get(area.city) ?? []), index]));
  const pairs = new Set<string>();
  for (const members of byCity.values()) {
    for (let pos = 0; pos < members.length; pos++) {
      for (const offset of [1, 2, 3]) {
        const pair = [members[pos]!, members[(pos + offset) % members.length]!].sort((a, b) => a - b);
        pairs.add(`${pair[0]}:${pair[1]}`);
      }
    }
  }
  for (let index = 0; index < 20; index++) pairs.add(`${index}:${88 + index % 20}`);
  const accepted = [...pairs].map((pair, index) => {
    const [a, b] = pair.split(":").map(Number);
    return { requesterId: ids[a!]!, recipientId: ids[b!]!, status: "accepted" as const, createdAt: daysAgo(1 + index % 150, random, now), updatedAt: daysAgo(index % 25, random, now) };
  });
  const pending = Array.from({ length: 24 }, (_, index) => ({ requesterId: ids[index]!, recipientId: ids[(index + 17) % USER_COUNT]!, status: "pending" as const }));
  const connections = await db.insert(connectionTable).values([...accepted, ...pending]).onConflictDoNothing().returning();
  const acceptedRows = connections.filter((connection) => connection.status === "accepted");

  for (let index = 0; index < acceptedRows.length; index += 2) {
    const connection = acceptedRows[index]!;
    const [a, b] = [connection.requesterId, connection.recipientId].sort();
    const [conversation] = await db.insert(conversationTable).values({ participantA: a!, participantB: b!, createdAt: connection.updatedAt }).returning();
    const sequence = MESSAGE_SEQUENCES[index % MESSAGE_SEQUENCES.length]!;
    const messageCount = 2 + index % 11;
    await db.insert(messageTable).values(Array.from({ length: messageCount }, (_, messageIndex) => ({
      conversationId: conversation!.id, senderId: messageIndex % 2 ? b! : a!,
      body: sequence[messageIndex % sequence.length]!,
      status: messageIndex < messageCount - 1 ? "read" : "sent",
      readAt: messageIndex < messageCount - 1 ? daysAgo(index % 14, random, now) : null,
      createdAt: new Date(connection.updatedAt.getTime() + messageIndex * 3_600_000),
    })));
  }

  const reviewed = acceptedRows.filter((_, index) => index % 10 < 3);
  const reviewRows = reviewed.map((connection, index) => {
    const rating = index % 10 < 7 ? 5 : 4;
    return { connectionId: connection.id, reviewerId: connection.requesterId, revieweeId: connection.recipientId, rating, professionalism: rating, reliability: index % 6 === 0 ? 4 : 5, helpfulness: rating, comment: index % 3 === 0 ? "Thoughtful, responsive, and generous with practical context." : "A constructive professional conversation with clear follow-through.", createdAt: daysAgo(index % 60, random, now) };
  });
  await db.insert(reviewsTable).values(reviewRows);
  await db.insert(reputationEventsTable).values(reviewRows.flatMap((review, index) => [
    { userId: review.revieweeId, kind: "review_received" as const, delta: review.rating, metadata: { connectionId: review.connectionId } },
    ...(index % 2 === 0 ? [{ userId: review.reviewerId, kind: "connection_success" as const, delta: 2, metadata: { connectionId: review.connectionId } }] : []),
  ]));
  await db.execute(sql`update professional_profiles p set trust_reputation = jsonb_build_object(
    'score', least(100, 35 + coalesce(r.avg_rating, 0) * 10),
    'completedConnections', coalesce(c.connection_count, 0),
    'endorsements', coalesce(r.review_count, 0))
    from (select user_id, count(*)::int connection_count from (
      select requester_id user_id from social_connections where status='accepted' and requester_id like 'seed\_%' escape '\'
      union all select recipient_id from social_connections where status='accepted' and recipient_id like 'seed\_%' escape '\'
    ) q group by user_id) c
    left join (select reviewee_id user_id, count(*)::int review_count, avg(rating)::int avg_rating from reviews where reviewee_id like 'seed\_%' escape '\' group by reviewee_id) r on r.user_id=c.user_id
    where p.user_id=c.user_id`);

  const statuses = ["pending", "accepted", "declined", "ignored", "completed"] as const;
  await db.insert(introductionRequestsTable).values(Array.from({ length: 10 }, (_, index) => ({ requesterId: ids[index * 4]!, intermediaryId: ids[index * 4 + 1]!, targetUserId: ids[index * 4 + 2]!, reason: "A warm introduction would help us explore a specific professional opportunity with the right context.", status: statuses[index % statuses.length], intermediaryNote: index % 2 ? "Happy to introduce you both with this context." : null, decidedAt: index % statuses.length === 0 ? null : daysAgo(index + 1, random, now), expiresAt: expires(14 + index) })));
  await db.insert(standingAlertsTable).values(Array.from({ length: 25 }, (_, index) => ({ userId: ids[index * 5 % USER_COUNT]!, title: index % 3 === 0 ? "Founders seeking product leadership" : index % 3 === 1 ? "Relevant investment opportunities" : "Teams needing my expertise", criteria: { keywords: [INDUSTRIES[index % INDUSTRIES.length]!.toLowerCase()], skills: ROLE_DATA[ROLE_KINDS[index % ROLE_KINDS.length]!].skills.slice(0, 2), industries: [INDUSTRIES[index % INDUSTRIES.length]!], wantCategories: ["job", "investor"], offerCategories: ["hiring", "investment"], minScore: 70 + index % 16 }, radiusKm: [10, 25, 50][index % 3]!, trustRequirement: index % 4 === 0 ? "professional" : "contact", frequency: index % 4 === 0 ? "daily" as const : "instant" as const, expiresAt: expires(45 + index), triggerCount: index % 6 })));
  await db.insert(planOverridesTable).values(ids.filter((_, index) => index % 5 === 0 || index % 12 === 0).map((userId, index) => ({ userId, plan: index % 4 === 0 ? "pro_plus" as const : "pro" as const, setBy: "seed_script" }))).onConflictDoNothing();
}

export async function seedActivity(): Promise<void> {
  const cleanup = [
    sql`delete from xsect_factors where xsect_id in (select id from xsects where user_id like 'seed\_%' escape '\' or counterpart_user_id like 'seed\_%' escape '\')`,
    sql`delete from alert_triggers where user_id like 'seed\_%' escape '\' or xsect_id in (select id from xsects where user_id like 'seed\_%' escape '\' or counterpart_user_id like 'seed\_%' escape '\')`,
    sql`delete from moments where user_id like 'seed\_%' escape '\' or related_user_id like 'seed\_%' escape '\'`,
    sql`delete from missed_xsects where user_id like 'seed\_%' escape '\' or counterpart_user_id like 'seed\_%' escape '\'`,
    sql`delete from xsects where user_id like 'seed\_%' escape '\' or counterpart_user_id like 'seed\_%' escape '\'`,
    sql`delete from crossings where user_a_id like 'seed\_%' escape '\' or user_b_id like 'seed\_%' escape '\'`,
    sql`delete from analytics_events where user_id like 'seed\_%' escape '\'`,
  ];
  for (const statement of cleanup) await db.execute(statement);
  const random = new SeededRandom(303);
  const areas = assignedAreas();
  const repeatedPairs = Array.from({ length: 24 }, (_, index) => [index * 3 % USER_COUNT, (index * 3 + 1) % USER_COUNT] as const);
  const crossings: Array<{ a: number; b: number; occurrence: number }> = [];
  for (let index = 0; index < 360; index++) {
    const a = index % USER_COUNT;
    const sameArea = areas.map((area, candidate) => area.area === areas[a]!.area && candidate !== a ? candidate : -1).filter((candidate) => candidate >= 0);
    const b = sameArea[index % sameArea.length] ?? ((a + 1) % USER_COUNT);
    crossings.push({ a, b, occurrence: index });
  }
  repeatedPairs.forEach(([a, b], pairIndex) => {
    for (let repeat = 0; repeat < 2 + pairIndex % 3; repeat++) crossings.push({ a, b, occurrence: 360 + pairIndex * 4 + repeat });
  });
  const bands = ["lt_250m", "lt_250m", "250m_500m", "250m_500m", "500m_1km", "1km_2km", "2km_5km"] as const;
  for (const crossing of crossings) {
    const area = areas[crossing.a]!;
    await engine.recordCrossing({ userAId: ids[crossing.a]!, userBId: ids[crossing.b]!, city: area.city, area: area.area, distanceBand: bands[crossing.occurrence % bands.length]!, occurredAt: daysAgo(crossing.occurrence % 21, random, now), durationMinutes: 3 + crossing.occurrence % 28, source: "simulated", createdBy: "seed_script" });
  }
  await inBatches(ids, 8, (userId) => engine.recomputeIntentXsects(userId, { limit: 60 }));
  await inBatches(ids.slice(0, 40), 8, (userId) => engine.recomputeTimeXsects(userId));
  await engine.expireStale(now);
  await db.execute(sql`update xsects set status = case when mod(abs(hashtext(id::text)), 20)=0 then 'requested'::xsect_status when mod(abs(hashtext(id::text)), 29)=0 then 'connected'::xsect_status when mod(abs(hashtext(id::text)), 13)=0 then 'dismissed'::xsect_status else status end where user_id like 'seed\_%' escape '\'`);
  await db.execute(sql`update missed_xsects set status = case when mod(abs(hashtext(id::text)), 18)=0 then 'requested'::missed_xsect_status when mod(abs(hashtext(id::text)), 31)=0 then 'connected'::missed_xsect_status when mod(abs(hashtext(id::text)), 11)=0 then 'dismissed'::missed_xsect_status else status end where user_id like 'seed\_%' escape '\'`);
  const funnel: Array<[typeof analyticsEventsTable.$inferInsert.name, number]> = [
    ["signup", 160], ["profile_completed", 153], ["want_created", 310], ["offer_created", 340],
    ["xsect_created", 520], ["request_sent", 118], ["request_accepted", 79], ["chat_started", 61], ["subscription_started", 44],
  ];
  for (const [name, count] of funnel) {
    await db.insert(analyticsEventsTable).values(Array.from({ length: count }, (_, index) => ({ userId: ids[index % USER_COUNT]!, name, properties: { source: "seed", simulated: true }, createdAt: daysAgo((index * 7 + name.length) % 30, random, now) })));
  }
}

export async function runSeed(options: { reset?: boolean; phase?: SeedPhase } = {}): Promise<Record<string, number>> {
  if (options.reset) await resetSeedData();
  const phase = options.phase ?? "all";
  if (phase === "profiles" || phase === "all") await seedProfiles();
  if (phase === "graph" || phase === "all") await seedGraph();
  if (phase === "activity" || phase === "all") await seedActivity();
  return seedStats();
}

export async function seedStats(): Promise<Record<string, number>> {
  const result = await db.execute(sql`
    select 'professional_profiles' name, count(*)::int count from professional_profiles where user_id like 'seed\_%' escape '\'
    union all select 'wants', count(*)::int from wants where user_id like 'seed\_%' escape '\'
    union all select 'offers', count(*)::int from offers where user_id like 'seed\_%' escape '\'
    union all select 'organizations', count(*)::int from organizations where created_by like 'seed\_%' escape '\'
    union all select 'organization_opportunities', count(*)::int from organization_opportunities where created_by like 'seed\_%' escape '\'
    union all select 'events', count(*)::int from social_events where created_by like 'seed\_%' escape '\'
    union all select 'connections', count(*)::int from social_connections where requester_id like 'seed\_%' escape '\' or recipient_id like 'seed\_%' escape '\'
    union all select 'conversations', count(*)::int from social_conversations where participant_a like 'seed\_%' escape '\' or participant_b like 'seed\_%' escape '\'
    union all select 'messages', count(*)::int from social_messages where sender_id like 'seed\_%' escape '\'
    union all select 'reviews', count(*)::int from reviews where reviewer_id like 'seed\_%' escape '\' or reviewee_id like 'seed\_%' escape '\'
    union all select 'crossings', count(*)::int from crossings where user_a_id like 'seed\_%' escape '\' or user_b_id like 'seed\_%' escape '\'
    union all select 'xsects', count(*)::int from xsects where user_id like 'seed\_%' escape '\'
    union all select 'missed_xsects', count(*)::int from missed_xsects where user_id like 'seed\_%' escape '\'
    union all select 'analytics_events', count(*)::int from analytics_events where user_id like 'seed\_%' escape '\'
  `);
  return Object.fromEntries((result.rows as Array<{ name: string; count: number }>).map((row) => [row.name, Number(row.count)]));
}

export { resetSeedData };
