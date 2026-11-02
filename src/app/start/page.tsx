import { ActionBar, PrimaryLink, Progress, Screen, TextLink, barPrimary } from "@/components/ui";
import { eligibility } from "@/facts";
import { flags } from "@/flags";
import { StartTracker } from "./StartTracker";

const STEPS = [
  "A few short questions about you and what you're looking for.",
  "See your matches and the full cost before you create an account or add a card.",
  "Book a time that works for you.",
];

export default function StartPage() {
  return (
    <Screen>
      <StartTracker />
      <Progress step="start" />
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Find a clinician who fits you</h1>
        <p>
          Legion offers virtual visits with clinicians, for adults {eligibility.minimumAge.value} and older who are in{" "}
          {eligibility.stateName.value}.
        </p>
      </div>

      <section aria-labelledby="what-to-expect" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 id="what-to-expect" className="text-lg font-semibold">
          What to expect
        </h2>
        <ol className="flex flex-col gap-2">
          {STEPS.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="font-medium text-accent">
                {i + 1}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
        <p className="text-ink-muted">It takes a few minutes.</p>
      </section>

      <ActionBar>
        <PrimaryLink href="/about" className={barPrimary}>
          Get started
        </PrimaryLink>
        {flags.signIn && (
          <TextLink href="/sign-in" className="self-center md:self-auto">
            Already started? Sign in
          </TextLink>
        )}
      </ActionBar>
    </Screen>
  );
}
