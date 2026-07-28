import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { landingPageService } from "@/services/landing-page.service";

export async function LandingCtaBanner() {
  const content = await landingPageService.getPublicContent();
  const cta = content.copy.ctaBanner;

  return (
    <SectionContainer className="bg-navy-950">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center md:px-10">
        <SectionHeader
          badge={cta.badge}
          title={cta.title}
          description={cta.description}
          align="center"
          className="[&_h2]:text-white [&_p]:text-navy-300 [&_span]:border-white/20 [&_span]:bg-white/10 [&_span]:text-navy-200"
        />
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg">
            <Link href={cta.primaryButtonLink}>
              {cta.primaryButtonText}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {cta.secondaryButtonText ? (
            <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
              <Link href={cta.secondaryButtonLink}>{cta.secondaryButtonText}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </SectionContainer>
  );
}
