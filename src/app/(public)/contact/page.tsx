import type { Metadata } from "next";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { ContactSection } from "@/features/public/components/contact-section";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description: "Get in touch with the RyvonX team for support, partnerships, and investor inquiries.",
  path: ROUTES.contact,
  keywords: ["contact RyvonX", "investor support", "RyvonX help"],
});

export default function ContactPage() {
  return (
    <>
      <SectionContainer className="!pb-0 !pt-8">
        <PageHeader
          title="Contact Us"
          description="We're here to answer your questions about Ryvonx."
        />
      </SectionContainer>
      <ContactSection className="!pt-8" />
    </>
  );
}
