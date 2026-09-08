import { describe, expect, it } from "vitest";
import { groupSupportConversations } from "./support-conversations";
import type { SupportTicket } from "@/features/investor/types/account";

function ticket(id: string, investorId?: string, date = "2026-09-08T10:00:00Z"): SupportTicket {
  return { id, investorId, investorName: "Same name", subject: id, status: "open", createdAt: date, updatedAt: date, messages: [{ id: `message-${id}`, ticketId: id, senderId: investorId ?? "unknown", senderName: "Customer", body: id, isAdmin: false, createdAt: date }] };
}
describe("support conversations", () => {
  it("combines a customer's tickets in chronological order and replies to their latest message", () => {
    const older = ticket("old", "customer", "2026-09-08T09:00:00Z");
    const newer = ticket("new", "customer");
    older.updatedAt = "2026-09-08T11:00:00Z";
    older.messages.push({ ...older.messages[0]!, id: "admin-reply", isAdmin: true, createdAt: older.updatedAt });
    const result = groupSupportConversations([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0]!.messages.map(message => message.id)).toEqual(["message-old", "message-new", "admin-reply"]);
    expect(result[0]!.replyTicketId).toBe("new");
    expect(result[0]!.id).toBe("investor:customer");
  });
  it("keeps different customers and unknown profiles separate even with matching names", () => {
    expect(groupSupportConversations([ticket("a", "one"), ticket("b", "two"), ticket("c"), ticket("d")])).toHaveLength(4);
  });
  it("retains closed-ticket history and handles empty conversations", () => {
    const old = { ...ticket("old", "one"), status: "closed" };
    const empty = { ...ticket("empty", "two"), messages: [] };
    const result = groupSupportConversations([old, ticket("new", "one"), empty]);
    expect(result.find(item => item.id === "investor:one")?.messages).toHaveLength(2);
    expect(result.find(item => item.id === "investor:two")?.replyTicketId).toBe("empty");
    expect(groupSupportConversations([])).toEqual([]);
  });
});
