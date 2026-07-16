import type { Metadata } from "next";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { ContactSection } from "@/features/public/components/contact-section";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Ryvonx team.",
};

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
