import { NextResponse } from "next/server";
import { userAdminService } from "@/services/user-admin.service";
import { getCurrentUser } from "@/lib/auth/session";
import type { UserRole } from "@/constants/roles";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const role = (searchParams.get("role") as UserRole | null) ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "50");

    const result = await userAdminService.list({
      search,
      role,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load users." },
      { status: 403 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = (await request.json()) as {
      userId?: string;
      role?: UserRole;
      isActive?: boolean;
    };

    if (!body.userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const updated = await userAdminService.update(
      body.userId,
      { role: body.role, isActive: body.isActive },
      user.id
    );

    return NextResponse.json({ user: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update user." },
      { status: 400 }
    );
  }
}
