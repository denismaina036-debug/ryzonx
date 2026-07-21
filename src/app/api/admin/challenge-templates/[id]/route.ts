import { NextResponse } from "next/server";
import { challengeTemplateService } from "@/services/challenge-template.service";
import type { ChallengeTemplateUpdateInput } from "@/domain/challenge/challenge-template";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await challengeTemplateService.getById(id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load template";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { template?: ChallengeTemplateUpdateInput };

    if (!body.template) {
      return NextResponse.json({ error: "template is required" }, { status: 400 });
    }

    const template = await challengeTemplateService.update(id, body.template);
    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
