import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import {
  PLATFORM_EVENT_AUDIT_ACTIONS,
  PLATFORM_EVENT_SEVERITY_WEIGHT,
} from "@/constants/platform-events";
import type { CommunicationCategory, CommunicationChannel, CommunicationPriority } from "@/domain/communication/types";
import type {
  AutomationRule,
  AutomationRuleAction,
  NotificationQueueItem,
  PlatformEvent,
} from "@/domain/platform-events/types";
import { auditService } from "@/services/audit.service";
import { platformEventService } from "@/services/platform-event.service";
import { notificationQueueService } from "@/services/notification-queue.service";
import { webhookService } from "@/services/webhook.service";
import { adminNotifyService } from "@/services/communication/admin-notify.service";

type RuleRow = {
  id: string;
  rule_key: string;
  name: string;
  description: string | null;
  event_type: string;
  category: AutomationRule["category"];
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

function matchesConditions(rule: AutomationRule, event: PlatformEvent): boolean {
  const conditions = rule.conditions;
  if (!conditions || Object.keys(conditions).length === 0) return true;

  if (conditions.minSeverity) {
    const min = PLATFORM_EVENT_SEVERITY_WEIGHT[conditions.minSeverity as keyof typeof PLATFORM_EVENT_SEVERITY_WEIGHT] ?? 0;
    const actual = PLATFORM_EVENT_SEVERITY_WEIGHT[event.severity];
    if (actual < min) return false;
  }

  if (conditions.entityType && conditions.entityType !== event.entityType) return false;
  return true;
}

function resolveRecipientId(event: PlatformEvent, field?: string): string | null {
  if (!field) return null;
  const payload = event.payload;
  const value = payload[field];
  return typeof value === "string" ? value : null;
}

export const eventDispatcherService = {
  async dispatch(event: PlatformEvent): Promise<void> {
    try {
      const rules = await this.getMatchingRules(event.eventType);
      for (const rule of rules) {
        if (rule.status !== "active") continue;
        if (!matchesConditions(rule, event)) continue;
        await this.executeActions(rule.actions, event);
      }

      await webhookService.enqueueForEvent(event);
      void notificationQueueService.processPending(25).catch(() => undefined);
      void webhookService.processPending(10).catch(() => undefined);

      await platformEventService.markProcessed(event.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Dispatch failed";
      await platformEventService.markFailed(event.id, message);
      throw err;
    }
  },

  async getMatchingRules(eventType: string): Promise<AutomationRule[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("automation_rules")
      .select("*")
      .eq("status", "active")
      .eq("event_type", eventType)
      .order("priority", { ascending: true });

    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as RuleRow[]).map(mapRule);
  },

  async executeActions(actions: AutomationRuleAction[], event: PlatformEvent): Promise<void> {
    for (const action of actions) {
      if (action.type === "notify_user") {
        const recipientId = resolveRecipientId(event, action.recipientField);
        if (!recipientId || !action.templateSlug) continue;

        await notificationQueueService.enqueue({
          platformEventId: event.id,
          recipientUserId: recipientId,
          templateSlug: action.templateSlug,
          channels: (action.channels ?? ["in_app"]) as CommunicationChannel[],
          category: (action.category ?? "system") as CommunicationCategory,
          priority: "normal" as CommunicationPriority,
          variables: this.buildVariables(event),
          metadata: { eventType: event.eventType, entityType: event.entityType, entityId: event.entityId },
        });
      }

      if (action.type === "notify_admins") {
        if (action.minSeverity) {
          const min = PLATFORM_EVENT_SEVERITY_WEIGHT[action.minSeverity] ?? 0;
          if (PLATFORM_EVENT_SEVERITY_WEIGHT[event.severity] < min) continue;
        }

        await adminNotifyService.platformAlert({
          title: `Platform event: ${event.eventType}`,
          message: String(event.payload.summary ?? event.payload.message ?? event.eventType),
          metadata: { platformEventId: event.id, ...event.payload },
        });
      }

      if (action.type === "enqueue_webhook") {
        await webhookService.enqueueForEvent(event);
      }
    }
  },

  buildVariables(event: PlatformEvent): Record<string, string | number | boolean | null | undefined> {
    const vars: Record<string, string | number | boolean | null | undefined> = {};
    for (const [key, value] of Object.entries(event.payload)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null ||
        value === undefined
      ) {
        vars[key] = value;
      } else {
        vars[key] = JSON.stringify(value);
      }
    }
    vars.event_type = event.eventType;
    return vars;
  },

  async listRules(): Promise<AutomationRule[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("automation_rules")
      .select("*")
      .order("priority", { ascending: true });

    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as RuleRow[]).map(mapRule);
  },

  async updateRuleStatus(ruleId: string, status: AutomationRule["status"], actorId: string): Promise<void> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { error } = await db
      .from("automation_rules")
      .update({ status } as never)
      .eq("id", ruleId);

    if (error) throw new Error(error.message);

    await auditService.log({
      actorId,
      action: PLATFORM_EVENT_AUDIT_ACTIONS.AUTOMATION_RULE_UPDATED,
      entityType: "automation_rule",
      entityId: ruleId,
      newValues: { status },
    });
  },
};

export type { NotificationQueueItem };
