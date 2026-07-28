import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { landingPageService } from "@/services/landing-page.service";
import type { LandingPageContent } from "@/domain/landing-page/types";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== USER_ROLES.ADMINISTRATOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const content = await landingPageService.getAdminContent();
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load landing page content" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== USER_ROLES.ADMINISTRATOR) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as { content?: LandingPageContent };
    if (!body.content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }
    const saved = await landingPageService.saveContent(body.content, user.id);
    revalidatePath("/", "layout");
    revalidatePath("/");
    return NextResponse.json({ content: saved });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save landing page content" },
      { status: 500 }
    );
  }
}
