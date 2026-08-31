import type { Metadata } from "next";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { ContactSection } from "@/features/public/components/contact-section";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { landingPageService } from "@/services/landing-page.service";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description: "Get in touch with the RyvonX team for support, partnerships, and investor inquiries.",
  path: ROUTES.contact,
  keywords: ["contact RyvonX", "investor support", "RyvonX help"],
});

export default async function ContactPage() {
  const content = await landingPageService.getRawContent();

  return (
    <>
      <SectionContainer className="!pb-0 !pt-8">
        <PageHeader
          title="Contact Us"
          description="We're here to answer your questions about Ryvonx."
        />
      </SectionContainer>
      <ContactSection contact={content.contact} copy={content.copy.contact} className="!pt-8" />
    </>
  );
}
