import { PrimaryLink, Screen } from "@/components/ui";

// Placeholder: signing in is not part of this prototype. See docs/DECISIONS.md.
export default function SignInPlaceholder() {
  return (
    <Screen>
      <h1 className="text-xl font-semibold">Signing in isn&apos;t available in this prototype</h1>
      <p className="text-ink-muted">
        Your answers are saved in this browser tab while you go, so you can pick up where you left off without signing in.
      </p>
      <PrimaryLink href="/start" className="self-start">
        Back to the start
      </PrimaryLink>
    </Screen>
  );
}
