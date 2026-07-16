import { profileService } from "@/services/profile.service";
import { InvestorSettingsView } from "@/features/investor/components/investor-settings-view";

export default async function SettingsPage() {
  const settings = await profileService.getInvestorSettings();
  return <InvestorSettingsView settings={settings} />;
}
