import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/** Delete only rows owned by, or directly referencing, synthetic seed users. */
export async function resetSeedData(): Promise<void> {
  const statements = [
    sql`delete from xsect_factors where xsect_id in (select id from xsects where user_id like 'seed\_%' escape '\' or counterpart_user_id like 'seed\_%' escape '\')`,
    sql`delete from alert_triggers where user_id like 'seed\_%' escape '\' or alert_id in (select id from standing_alerts where user_id like 'seed\_%' escape '\')`,
    sql`delete from moments where user_id like 'seed\_%' escape '\' or related_user_id like 'seed\_%' escape '\'`,
    sql`delete from missed_xsects where user_id like 'seed\_%' escape '\' or counterpart_user_id like 'seed\_%' escape '\'`,
    sql`delete from xsects where user_id like 'seed\_%' escape '\' or counterpart_user_id like 'seed\_%' escape '\'`,
    sql`delete from crossings where user_a_id like 'seed\_%' escape '\' or user_b_id like 'seed\_%' escape '\'`,
    sql`delete from ai_agent_findings where user_id like 'seed\_%' escape '\' or target_user_id like 'seed\_%' escape '\'`,
    sql`delete from ai_agents where user_id like 'seed\_%' escape '\'`,
    sql`delete from ai_recommendations where user_id like 'seed\_%' escape '\' or target_user_id like 'seed\_%' escape '\'`,
    sql`delete from ai_queries where user_id like 'seed\_%' escape '\'`,
    sql`delete from professional_twins where user_id like 'seed\_%' escape '\'`,
    sql`delete from introduction_requests where requester_id like 'seed\_%' escape '\' or intermediary_id like 'seed\_%' escape '\' or target_user_id like 'seed\_%' escape '\'`,
    sql`delete from reputation_events where user_id like 'seed\_%' escape '\'`,
    sql`delete from reviews where reviewer_id like 'seed\_%' escape '\' or reviewee_id like 'seed\_%' escape '\'`,
    sql`delete from social_messages where sender_id like 'seed\_%' escape '\' or conversation_id in (select id from social_conversations where participant_a like 'seed\_%' escape '\' or participant_b like 'seed\_%' escape '\')`,
    sql`delete from social_conversations where participant_a like 'seed\_%' escape '\' or participant_b like 'seed\_%' escape '\'`,
    sql`delete from social_consent_audit where actor_id like 'seed\_%' escape '\' or connection_id in (select id from social_connections where requester_id like 'seed\_%' escape '\' or recipient_id like 'seed\_%' escape '\')`,
    sql`delete from social_reports where reporter_id like 'seed\_%' escape '\' or subject_id like 'seed\_%' escape '\' or connection_id in (select id from social_connections where requester_id like 'seed\_%' escape '\' or recipient_id like 'seed\_%' escape '\')`,
    sql`delete from social_connections where requester_id like 'seed\_%' escape '\' or recipient_id like 'seed\_%' escape '\'`,
    sql`delete from social_introductions where requester_id like 'seed\_%' escape '\' or target_id like 'seed\_%' escape '\'`,
    sql`delete from social_notifications where user_id like 'seed\_%' escape '\'`,
    sql`delete from social_event_rsvps where user_id like 'seed\_%' escape '\' or event_id in (select id from social_events where created_by like 'seed\_%' escape '\')`,
    sql`delete from social_event_admins where user_id like 'seed\_%' escape '\' or event_id in (select id from social_events where created_by like 'seed\_%' escape '\')`,
    sql`delete from social_event_generations where user_id like 'seed\_%' escape '\' or event_id in (select id from social_events where created_by like 'seed\_%' escape '\')`,
    sql`delete from social_events where created_by like 'seed\_%' escape '\'`,
    sql`delete from organization_members where user_id like 'seed\_%' escape '\' or organization_id in (select id from organizations where created_by like 'seed\_%' escape '\')`,
    sql`delete from organization_opportunities where created_by like 'seed\_%' escape '\' or organization_id in (select id from organizations where created_by like 'seed\_%' escape '\')`,
    sql`delete from organizations where created_by like 'seed\_%' escape '\'`,
    sql`delete from availability_rules where user_id like 'seed\_%' escape '\'`,
    sql`delete from wants where user_id like 'seed\_%' escape '\'`,
    sql`delete from offers where user_id like 'seed\_%' escape '\'`,
    sql`delete from standing_alerts where user_id like 'seed\_%' escape '\'`,
    sql`delete from xsect_paths where user_id like 'seed\_%' escape '\' or target_user_id like 'seed\_%' escape '\'`,
    sql`delete from analytics_events where user_id like 'seed\_%' escape '\'`,
    sql`delete from plan_overrides where user_id like 'seed\_%' escape '\'`,
    sql`delete from professional_profiles where user_id like 'seed\_%' escape '\'`,
  ];
  for (const statement of statements) await db.execute(statement);
}
