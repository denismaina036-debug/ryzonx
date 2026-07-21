import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { communicationTriggers, adminNotifyService } from "@/services/communication";
import type { SupportMessage, SupportTicket } from "@/features/investor/types/account";

type TicketRow = {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  ticket_id: string;
  sender_id: string;
  body: string;
  is_admin: boolean;
  created_at: string;
};

async function loadMessages(ticketId: string): Promise<SupportMessage[]> {
  const db = createAdminClient();
  const { data: messages } = await db
    .from("support_messages")
    .select("id, ticket_id, sender_id, body, is_admin, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  const rows = (messages ?? []) as MessageRow[];
  if (rows.length === 0) return [];

  const senderIds = [...new Set(rows.map((m) => m.sender_id))];
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name")
    .in("id", senderIds);

  const nameMap = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string }>).map((p) => [
      p.id,
      p.full_name,
    ])
  );

  return rows.map((m) => ({
    id: m.id,
    ticketId: m.ticket_id,
    senderId: m.sender_id,
    senderName: nameMap.get(m.sender_id) ?? (m.is_admin ? "Support" : "You"),
    body: m.body,
    isAdmin: m.is_admin,
    createdAt: m.created_at,
  }));
}

export const supportService = {
  async getInvestorTickets(): Promise<SupportTicket[]> {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data } = await supabase
      .from("support_tickets")
      .select("id, user_id, subject, status, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    const tickets = (data ?? []) as TicketRow[];
    return Promise.all(
      tickets.map(async (t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        messages: await loadMessages(t.id),
      }))
    );
  },

  async createTicket(subject: string, message: string): Promise<SupportTicket> {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        status: "open",
      } as never)
      .select("id, user_id, subject, status, created_at, updated_at")
      .single();

    if (error || !ticket) {
      throw new Error(error?.message ?? "Could not create support ticket.");
    }

    const row = ticket as TicketRow;
    const { error: msgError } = await supabase.from("support_messages").insert({
      ticket_id: row.id,
      sender_id: user.id,
      body: message.trim(),
      is_admin: false,
    } as never);

    if (msgError) {
      throw new Error(msgError.message);
    }

    await communicationTriggers.supportTicketCreated({
      userId: user.id,
      subject: row.subject,
      ticketId: row.id,
    });
    await adminNotifyService.supportTicket({
      subject: row.subject,
      ticketId: row.id,
      userName: user.email ?? user.id,
      triggeredBy: user.id,
    });

    return {
      id: row.id,
      subject: row.subject,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: await loadMessages(row.id),
    };
  },

  async addInvestorMessage(ticketId: string, body: string): Promise<void> {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, user_id, status")
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!ticket) throw new Error("Ticket not found.");

    const { error } = await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      sender_id: user.id,
      body: body.trim(),
      is_admin: false,
    } as never);

    if (error) throw new Error(error.message);

    await supabase
      .from("support_tickets")
      .update({ status: "open", updated_at: new Date().toISOString() } as never)
      .eq("id", ticketId);
  },

  async getAdminTickets(): Promise<SupportTicket[]> {
    await requireRole("administrator");
    const db = createAdminClient();

    const { data } = await db
      .from("support_tickets")
      .select("id, user_id, subject, status, created_at, updated_at")
      .order("updated_at", { ascending: false });

    const tickets = (data ?? []) as TicketRow[];
    if (tickets.length === 0) return [];

    const userIds = [...new Set(tickets.map((t) => t.user_id))];
    const { data: profiles } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profileMap = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string; email: string }>).map(
        (p) => [p.id, p]
      )
    );

    return Promise.all(
      tickets.map(async (t) => {
        const profile = profileMap.get(t.user_id);
        return {
          id: t.id,
          subject: t.subject,
          status: t.status,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          investorName: profile?.full_name,
          investorEmail: profile?.email,
          messages: await loadMessages(t.id),
        };
      })
    );
  },

  async adminReply(ticketId: string, body: string): Promise<void> {
    const admin = await requireRole("administrator");
    const db = createAdminClient();

    const { data: ticket } = await db
      .from("support_tickets")
      .select("id, user_id, subject")
      .eq("id", ticketId)
      .maybeSingle();

    if (!ticket) throw new Error("Ticket not found.");

    const row = ticket as { id: string; user_id: string; subject: string };

    const { error } = await db.from("support_messages").insert({
      ticket_id: ticketId,
      sender_id: admin.id,
      body: body.trim(),
      is_admin: true,
    } as never);

    if (error) throw new Error(error.message);

    await db
      .from("support_tickets")
      .update({ status: "replied", updated_at: new Date().toISOString() } as never)
      .eq("id", ticketId);

    await communicationTriggers.supportReply({
      userId: row.user_id,
      subject: row.subject,
      replyPreview: body.trim().slice(0, 200),
      ticketId,
    });
  },

  async adminCloseTicket(ticketId: string): Promise<void> {
    const admin = await requireRole("administrator");
    const db = createAdminClient();

    const { data: ticket } = await db
      .from("support_tickets")
      .select("id, user_id, subject, status")
      .eq("id", ticketId)
      .maybeSingle();

    if (!ticket) throw new Error("Ticket not found.");

    const row = ticket as { id: string; user_id: string; subject: string; status: string };
    if (row.status === "closed") return;

    await db
      .from("support_tickets")
      .update({ status: "closed", updated_at: new Date().toISOString() } as never)
      .eq("id", ticketId);

    await communicationTriggers.supportClosed({
      userId: row.user_id,
      subject: row.subject,
      ticketId,
    });
  },
};
