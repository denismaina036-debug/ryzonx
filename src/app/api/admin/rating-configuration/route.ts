import { NextResponse } from "next/server";
import { ratingConfigurationService } from "@/services/rating-configuration.service";
import type { RatingCategory } from "@/constants/rating";

export async function GET() {
  try {
    const config = await ratingConfigurationService.getActiveProfile();
    const profiles = await ratingConfigurationService.listProfiles();
    return NextResponse.json({ active: config, profiles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load configuration";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      profileId: string;
      weights?: Array<{ category: RatingCategory; weight: number }>;
      name?: string;
      description?: string;
    };

    if (body.weights && body.profileId) {
      const weights = await ratingConfigurationService.updateWeights(body.profileId, body.weights);
      return NextResponse.json({ weights });
    }

    if (body.profileId && (body.name !== undefined || body.description !== undefined)) {
      const profile = await ratingConfigurationService.updateProfile(body.profileId, {
        name: body.name,
        description: body.description,
      });
      return NextResponse.json({ profile });
    }

    return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update configuration";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
