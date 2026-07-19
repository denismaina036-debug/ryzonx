import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { PLATFORM_EVENT_AUDIT_ACTIONS } from "@/constants/platform-events";
import type { AutomationRule, AutomationRuleAction } from "@/domain/platform-events/types";
import type { PlatformEventCategory } from "@/constants/platform-events";
import { auditService } from "@/services/audit.service";
import { eventDispatcherService } from "@/services/event-dispatcher.service";

type RuleRow = {
  id: string;
  rule_key: string;
  name: string;
  description: string | null;
  event_type: string;
  category: PlatformEventCategory;
  status: AutomationRule["status"];
  priority: number;
  conditions: Record<string, unknown>;
  actions: AutomationRuleAction[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapRule(row: RuleRow): AutomationRule {
  return {
    id: row.id,
    ruleKey: row.rule_key,
    name: row.name,
    description: row.description,
    eventType: row.event_type,
    category: row.category,
    status: row.status,
    priority: row.priority,
    conditions: row.conditions ?? {},
    actions: Array.isArray(row.actions) ? row.actions : [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const automationRuleService = {
  async list(): Promise<AutomationRule[]> {
    return eventDispatcherService.listRules();
  },

  async create(input: {
    ruleKey: string;
    name: string;
    description?: string;
    eventType: string;
    category?: PlatformEventCategory;
    priority?: number;
    conditions?: Record<string, unknown>;
    actions: AutomationRuleAction[];
    actorId: string;
  }): Promise<AutomationRule> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data, error } = await db
      .from("automation_rules")
      .insert({
        rule_key: input.ruleKey,
        name: input.name.trim(),
        description: input.description ?? null,
        event_type: input.eventType,
        category: input.category ?? "system",
        priority: input.priority ?? 100,
        conditions: input.conditions ?? {},
        actions: input.actions,
        status: "active",
        created_by: input.actorId,
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const rule = mapRule(data as unknown as RuleRow);

    await auditService.log({
      actorId: input.actorId,
      action: PLATFORM_EVENT_AUDIT_ACTIONS.AUTOMATION_RULE_CREATED,
      entityType: "automation_rule",
      entityId: rule.id,
      newValues: { ruleKey: rule.ruleKey, eventType: rule.eventType },
    });

    return rule;
  },

  async update(
    ruleId: string,
    input: Partial<{
      name: string;
      description: string;
      status: AutomationRule["status"];
      priority: number;
      conditions: Record<string, unknown>;
      actions: AutomationRuleAction[];
    }>,
    actorId: string
  ): Promise<AutomationRule> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const update: Record<string, unknown> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
    if (input.status !== undefined) update.status = input.status;
    if (input.priority !== undefined) update.priority = input.priority;
    if (input.conditions !== undefined) update.conditions = input.conditions;
    if (input.actions !== undefined) update.actions = input.actions;

    const { data, error } = await db
      .from("automation_rules")
      .update(update as never)
      .eq("id", ruleId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await auditService.log({
      actorId,
      action: PLATFORM_EVENT_AUDIT_ACTIONS.AUTOMATION_RULE_UPDATED,
      entityType: "automation_rule",
      entityId: ruleId,
      newValues: update,
    });

    return mapRule(data as unknown as RuleRow);
  },
};
