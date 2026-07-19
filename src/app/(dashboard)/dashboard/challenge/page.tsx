import { requireAuth } from "@/lib/auth/session";
import { challengeCenterService } from "@/services/challenge-center.service";
import { ChallengeCenterView } from "@/features/challenge/components/challenge-center-view";

export default async function ChallengeCenterPage() {
  await requireAuth();
  const initialState = await challengeCenterService.getChallengeCenterState();

  return <ChallengeCenterView initialState={initialState} />;
}
