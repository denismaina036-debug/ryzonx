import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import type { InvestorSettingsData } from "@/features/investor/types/account";

export const profileService = {
  async getInvestorSettings(): Promise<InvestorSettingsData> {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, phone, avatar_url, role, account_status, show_activity_publicly, created_at, updated_at"
      )
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        accountStatus: "active",
        showActivityPublicly: false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }

    const row = data as {
      id: string;
      email: string;
      full_name: string;
      phone: string | null;
      avatar_url: string | null;
      role: string;
      account_status: string;
      show_activity_publicly: boolean;
      created_at: string;
      updated_at: string;
    };

    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      role: row.role,
      accountStatus: row.account_status,
      showActivityPublicly: row.show_activity_publicly,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async updateInvestorSettings(input: {
    fullName?: string;
    phone?: string;
    showActivityPublicly?: boolean;
  }): Promise<InvestorSettingsData> {
    const user = await requireAuth();
    const supabase = await createClient();

    const updates: Record<string, unknown> = {};
    if (input.fullName?.trim()) updates.full_name = input.fullName.trim();
    if (input.phone != null) updates.phone = input.phone.trim() || null;
    if (input.showActivityPublicly != null) {
      updates.show_activity_publicly = input.showActivityPublicly;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates as never)
      .eq("id", user.id);

    if (error) throw new Error(error.message);
    return this.getInvestorSettings();
  },
};
