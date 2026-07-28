"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from "lucide-react";
import { useOptionalLandingContent } from "@/providers/landing-content-provider";
import { DEFAULT_LANDING_PAGE_CONTENT } from "@/domain/landing-page/defaults";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.3 4.4A17.2 17.2 0 0 0 15.5 3c-.2.4-.5 1-.7 1.4a15.9 15.9 0 0 0-4.8 0C9.8 4 9.5 3.4 9.3 3a17.2 17.2 0 0 0-4.8 1.4C2.2 8.1 1.5 11.6 1.8 15c2 .1 3.9.7 5.7 1.7-.5-.9-.9-1.8-1.2-2.8 1.1.8 2.3 1.5 3.6 2a11.5 11.5 0 0 0 9.8 0c1.3-.5 2.5-1.2 3.6-2-.3 1-.7 1.9-1.2 2.8 1.8-1 3.7-1.6 5.7-1.7.4-3.9-.6-7.4-2.7-10.6ZM8.7 13.1c-1 0-1.9-.9-1.9-2s.8-2 1.9-2 1.9.9 1.9 2-.8 2-1.9 2Zm6.6 0c-1 0-1.9-.9-1.9-2s.8-2 1.9-2 1.9.9 1.9 2-.8 2-1.9 2Z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M9.9 15.6 9.7 19c.4 0 .6-.2.8-.4l2-1.9 4.1 3c.8.4 1.3.2 1.5-.7l2.7-12.7c.3-1.2-.4-1.7-1.2-1.3L3.6 9.8c-1.2.5-1.2 1.1-.2 1.4l4.9 1.5L18.5 7c.5-.3 1-.1.6.2" />
    </svg>
  );
}

export function Footer() {
  const landing = useOptionalLandingContent();
  const footer = landing?.footer ?? DEFAULT_LANDING_PAGE_CONTENT.footer;
  const contact = landing?.contact ?? DEFAULT_LANDING_PAGE_CONTENT.contact;
  const social = landing?.social ?? DEFAULT_LANDING_PAGE_CONTENT.social;

  const socialLinks = [
    { key: "facebook", href: social.facebook, icon: Facebook, label: "Facebook" },
    { key: "instagram", href: social.instagram, icon: Instagram, label: "Instagram" },
    { key: "twitter", href: social.twitter, icon: Twitter, label: "X (Twitter)" },
    { key: "linkedin", href: social.linkedin, icon: Linkedin, label: "LinkedIn" },
    { key: "telegram", href: social.telegram, icon: TelegramIcon, label: "Telegram" },
    { key: "youtube", href: social.youtube, icon: Youtube, label: "YouTube" },
    { key: "discord", href: social.discord, icon: DiscordIcon, label: "Discord" },
  ].filter((item) => item.href?.trim());

  const email = contact.supportEmail || contact.generalEmail;

  return (
    <footer className="border-t border-border bg-navy-950 text-navy-300">
      <div className="page-container py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <Image
                src={footer.logoUrl || "/images/logo.png"}
                alt={`${footer.aboutText} logo`}
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <span className="text-lg font-semibold text-white">{footer.aboutText}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-navy-400">
              {footer.companyDescription}
            </p>
            {socialLinks.length > 0 ? (
              <div className="mt-6 flex gap-3">
                {socialLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-navy-400 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label={item.label}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-3">
              {footer.quickLinks.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-navy-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Legal
            </h4>
            <ul className="mt-4 space-y-3">
              {footer.legalLinks.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-navy-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Contact
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-navy-400">
              {email ? <li>{email}</li> : null}
              {contact.phone ? <li>{contact.phone}</li> : null}
              {contact.officeAddress ? (
                <li>
                  {contact.officeAddress.split("\n").map((line, index) => (
                    <span key={`${line}-${index}`}>
                      {line}
                      {index < contact.officeAddress.split("\n").length - 1 ? <br /> : null}
                    </span>
                  ))}
                </li>
              ) : null}
            </ul>
            {footer.newsletterTitle ? (
              <div className="mt-6">
                <p className="text-sm font-medium text-white">{footer.newsletterTitle}</p>
                {footer.newsletterDescription ? (
                  <p className="mt-1 text-xs text-navy-400">{footer.newsletterDescription}</p>
                ) : null}
              </div>
            ) : null}
            {footer.ctaText && footer.ctaLink ? (
              <Link
                href={footer.ctaLink}
                className="mt-4 inline-block text-sm font-medium text-royal-400 hover:text-royal-300"
              >
                {footer.ctaText}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-xs text-navy-500">{footer.copyrightText}</p>
          <p className="text-xs text-navy-500">{footer.disclaimerText}</p>
        </div>
      </div>
    </footer>
  );
}
