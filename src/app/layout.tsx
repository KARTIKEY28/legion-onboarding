import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { CrisisHelp } from "@/components/CrisisHelp";
import { DevLabel } from "@/components/ui";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Get started · Legion (prototype)",
  description: "Prototype of Legion's patient onboarding rebuild. Synthetic data only.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} flex min-h-screen flex-col antialiased`}>
        <CrisisHelp />
        <DevLabel />
        <div className="flex-1">{children}</div>
        <footer className="flex flex-col gap-1 border-t border-line px-4 py-4 text-center text-sm text-ink-muted">
          <p>Prototype with synthetic data. Please don&apos;t enter real health information.</p>
          <p className="text-xs">
            Clinician portraits are illustrations generated with DiceBear (MIT), style &ldquo;personas&rdquo; by
            Draftbit (CC0). Not photos of real people.
          </p>
        </footer>
      </body>
    </html>
  );
}
