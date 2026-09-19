import { Link } from 'wouter';
import type { ReactNode } from 'react';

const page = (title: string, children: ReactNode) => (
  <div className="min-h-[100dvh] bg-background text-foreground">
    <header className="border-b border-border bg-white px-6 py-4">
      <Link href="/" className="font-bold tracking-[.18em]">XSECT</Link>
    </header>
    <main className="mx-auto max-w-3xl px-6 py-12 prose prose-slate">
      <h1>{title}</h1>{children}
      <p className="not-prose mt-10"><Link href="/" className="font-semibold text-primary">Return to XSECT</Link></p>
    </main>
  </div>
);

export function PrivacyNotice() {
  return page('Privacy Notice',
    <><p>XSECT is a private opportunity network for people aged 18 and over. We use information you provide, your activity in the service, and (when you opt in) approximate foreground location to operate matching, safety, and communications.</p>
      <h2>Privacy by design</h2><p>Profiles and messages are not cached by the app shell or service worker. Identity details are shared only through the choices and interactions available in XSECT. We do not sell personal information.</p>
      <h2>Your choices</h2><p>You can change optional consent in Privacy Center, ask for access or deletion, and request a copy of your data. Contact support through the service if you need help.</p>
      <p>This notice is general information, not legal advice or a claim of legal certification. It may be updated as the product evolves.</p></>
  );
}

export function Terms() {
  return page('Terms of Service',
    <><p>By using XSECT you confirm that you are at least 18 years old and will use the service lawfully, honestly, and respectfully.</p>
      <h2>Private introductions</h2><p>XSECT helps people discover aligned opportunities; it does not guarantee an introduction, outcome, employment, or the accuracy of another member’s claims. Do not use the service for harassment, scraping, impersonation, or unsolicited commercial messages.</p>
      <h2>Changes and safety</h2><p>We may improve, suspend, or remove features to protect members and the service. Report abuse promptly. These terms are plain-language product terms and do not replace professional legal advice.</p></>
  );
}