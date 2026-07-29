import { NextResponse } from "next/server";
import { legalDocumentService } from "@/services/legal-document.service";

export async function GET() {
  try {
    const links = await legalDocumentService.getPublicLinks();
    return NextResponse.json({ links });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load legal links" },
      { status: 500 }
    );
  }
}
