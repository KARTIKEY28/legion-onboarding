import { Progress, PrimaryLink, Screen, TextLink } from "@/components/ui";
import { effort, eligibility } from "@/facts";
import { StartTracker } from "./StartTracker";

export default function StartPage() {
  return (
    <Screen>
      <StartTracker />
      <Progress step="start" />
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Find a clinician who fits you</h1>
        <p>
          Legion offers virtual visits with clinicians, for adults {eligibility.minimumAge.value} and
          older who are in {eligibility.stateName.value}.
        </p>
      </div>

      <section aria-labelledby="what-to-expect" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 id="what-to-expect" className="text-lg font-semibold">
          What to expect
        </h2>
        <p>
          We&apos;ll ask a few short sections: {effort.sections.value.join(", ").toLowerCase()}. It takes
          about {effort.minutesToPayment.value} minutes.
        </p>
        <p>You&apos;ll see your matches and the cost before you create an account or add a card.</p>
      </section>

      <p className="text-ink-muted">
        <span className="font-medium text-ink">Why we ask first:</span> the next screen checks where
        you&apos;ll be and your age, so you know right away whether Legion can see you.
      </p>

      <div className="flex flex-col items-start gap-4">
        <PrimaryLink href="/about">Get started</PrimaryLink>
        <TextLink href="/sign-in">Already started? Sign in</TextLink>
      </div>
    </Screen>
  );
}
