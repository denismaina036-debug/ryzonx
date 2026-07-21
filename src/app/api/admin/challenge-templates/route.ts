import { NextResponse } from "next/server";
import { challengeTemplateService } from "@/services/challenge-template.service";

export async function GET() {
  try {
    const templates = await challengeTemplateService.listAll();
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load templates";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
