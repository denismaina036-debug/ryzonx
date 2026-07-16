"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { toast } from "sonner";

export function ContactSection({ className }: { className?: string } = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success("Message sent!", {
      description: "We'll get back to you within 24 hours.",
    });
    setIsSubmitting(false);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <SectionContainer className={className ?? "bg-surface-1"}>
      <SectionHeader
        badge="Contact"
        title="Get in Touch"
        description="Have questions about Ryvonx? We'd love to hear from you."
        align="center"
      />
      <div className="mx-auto grid max-w-4xl gap-12 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy-950">Email</p>
              <p className="text-sm text-navy-500">hello@ryvonx.com</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy-950">Phone</p>
              <p className="text-sm text-navy-500">+1 (555) 000-0000</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy-950">Office</p>
              <p className="text-sm text-navy-500">
                100 Financial District
                <br />
                New York, NY 10005
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-3 lg:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="First Name" htmlFor="firstName" required>
              <Input id="firstName" name="firstName" placeholder="John" required />
            </FormField>
            <FormField label="Last Name" htmlFor="lastName" required>
              <Input id="lastName" name="lastName" placeholder="Smith" required />
            </FormField>
          </div>
          <FormField label="Email" htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              required
            />
          </FormField>
          <FormField label="Message" htmlFor="message" required>
            <textarea
              id="message"
              name="message"
              rows={4}
              required
              placeholder="How can we help you?"
              className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-navy-950 placeholder:text-navy-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FormField>
          <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full sm:w-auto">
            <Send className="h-4 w-4" />
            Send Message
          </Button>
        </form>
      </div>
    </SectionContainer>
  );
}
