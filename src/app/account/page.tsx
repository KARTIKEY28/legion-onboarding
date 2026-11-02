import { Progress, Screen, TextLink } from "@/components/ui";

// Placeholder until slice 6 builds Account and payment. Fires no events.
export default function AccountPlaceholder() {
  return (
    <Screen>
      <Progress step="account" />
      <h1 className="text-xl font-semibold">Creating your account comes next</h1>
      <p className="text-ink-muted">This prototype currently stops here. Nothing has been booked or charged.</p>
      <TextLink href="/cost" className="self-start">
        Back to cost and terms
      </TextLink>
    </Screen>
  );
}
