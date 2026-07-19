import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { USER_PREFERENCE_CATEGORIES } from "@/constants/communication";
import type { CommunicationCategory, CommunicationChannel } from "@/domain/communication/types";

export interface NotificationPreference {
  category: CommunicationCategory;
  channel: CommunicationChannel;
  isEnabled: boolean;
}

export const notificationPreferenceService = {
  async getForCurrentUser(): Promise<NotificationPreference[]> {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data } = await supabase
      .from("communication_preferences")
      .select("category, channel, enabled")
      .eq("user_id", user.id);

    const rows = (data ?? []) as Array<{
      category: CommunicationCategory;
      channel: CommunicationChannel;
      enabled: boolean;
    }>;

    if (rows.length === 0) {
      return USER_PREFERENCE_CATEGORIES.flatMap((category) =>
        (["in_app", "email"] as CommunicationChannel[]).map((channel) => ({
          category,
          channel,
          isEnabled: true,
        }))
      );
    }

    return rows.map((r) => ({
      category: r.category,
      channel: r.channel,
      isEnabled: r.enabled,
    }));
  },

  async updatePreference(
    category: CommunicationCategory,
    channel: CommunicationChannel,
    isEnabled: boolean
  ): Promise<void> {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("communication_preferences")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", category)
      .eq("channel", channel)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("communication_preferences")
        .update({ enabled: isEnabled } as never)
        .eq("id", (existing as { id: string }).id);
    } else {
      await supabase.from("communication_preferences").insert({
        user_id: user.id,
        category,
        channel,
        enabled: isEnabled,
      } as never);
    }
  },

  async updateMany(preferences: NotificationPreference[]): Promise<void> {
    for (const pref of preferences) {
      await this.updatePreference(pref.category, pref.channel, pref.isEnabled);
    }
  },
};
