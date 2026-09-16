import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/services/trading/repository", () => ({ readCatalogue: vi.fn(), updateConfiguration: vi.fn() }));
vi.mock("@/services/trading/provider", () => ({ providerStatus: () => ({ connected: false }) }));
import { getCurrentUser } from "@/lib/auth/session";
import { updateConfiguration } from "@/services/trading/repository";
import { PATCH } from "./route";
const admin = { id: "admin-from-session", role: "administrator", isActive: true } as Awaited<ReturnType<typeof getCurrentUser>>;
const value = { trading_enabled: true, display_mode: "LIVE_PREVIEW", execution_mode: "SIMULATED" };
function request(body: unknown, origin = "http://localhost:3000") { return new Request("http://localhost:3000/api/admin/trading", { method: "PATCH", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getCurrentUser).mockResolvedValue(admin); });
describe("trading control authorization", () => {
  it("rejects anonymous and non-admin writes", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect((await PATCH(request({ kind: "settings", value }))).status).toBe(403);
    vi.mocked(getCurrentUser).mockResolvedValue({ ...admin, role: "investor" } as NonNullable<typeof admin>);
    expect((await PATCH(request({ kind: "settings", value }))).status).toBe(403);
    expect(updateConfiguration).not.toHaveBeenCalled();
  });
  it("rejects cross-origin, forged actor and live environment", async () => {
    expect((await PATCH(request({ kind: "settings", value }, "https://other.example"))).status).toBe(403);
    expect((await PATCH(request({ kind: "settings", value, actorId: "forged" }))).status).toBe(400);
    expect((await PATCH(request({ kind: "settings", value: { ...value, execution_mode: "LIVE" } }))).status).toBe(400);
    expect(updateConfiguration).not.toHaveBeenCalled();
  });
  it("uses the authenticated administrator as audit actor", async () => {
    expect((await PATCH(request({ kind: "settings", value }))).status).toBe(200);
    expect(updateConfiguration).toHaveBeenCalledWith("admin-from-session", "settings", "platform", expect.objectContaining(value));
  });
});
