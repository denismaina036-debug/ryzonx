import type { SupportTicket } from "@/features/investor/types/account";

export function groupSupportConversations(tickets: SupportTicket[]) {
  const groups = new Map<string, SupportTicket[]>();
  for (const ticket of tickets) {
    // Never merge customers by display name or missing profile information.
    const key = ticket.investorId ? `investor:${ticket.investorId}` : `ticket:${ticket.id}`;
    groups.set(key, [...(groups.get(key) ?? []), ticket]);
  }
  return [...groups.entries()].map(([id, entries]) => {
    const ordered = [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const latest = ordered[0]!; // Every group is created with at least one ticket.
    const messages = ordered.flatMap((ticket) => ticket.messages)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    const latestCustomerMessage = [...messages].reverse().find((message) => !message.isAdmin);
    return {
      ...latest,
      id,
      replyTicketId: latestCustomerMessage?.ticketId ?? latest.id,
      messages,
      ticketCount: entries.length,
    };
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
