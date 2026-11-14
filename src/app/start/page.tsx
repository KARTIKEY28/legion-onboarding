import { PrimaryLink, Progress, Screen, TextLink, barPrimary } from "@/components/ui";
import { effort, eligibility, selfPayPrices, socialProof } from "@/facts";
import { flags } from "@/flags";
import { StartTracker } from "./StartTracker";

const STEPS = [
  "A few short questions about you and what you're looking for.",
  "See your matches and the full cost before you create an account or add a card.",
  "Book a time that works for you.",
];

/** Legion's published social-proof figures, each with a short label. Numbers come from facts. */
const STATS = [
  { value: `${socialProof.recommendShare.value}%`, label: "would recommend Legion" },
  { value: socialProof.patientsServed.value.toLocaleString("en-US"), label: "patients served" },
  { value: `${socialProof.visitsFirstYear.value}`, label: "visits in a patient's first year" },
];

export default function StartPage() {
  return (
    <Screen>
      <StartTracker />
      <Progress step="start" />
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Find a clinician who fits you</h1>
        <p>
          Legion offers virtual visits with clinicians, for adults {eligibility.minimumAge.value} and older in{" "}
          {eligibility.servedStates.value.join(" or ")}.
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
        <p>
          Often just your copay with insurance. ${selfPayPrices.initialVisit.value} if you pay without it. We&apos;ll
          estimate your cost before you book.
        </p>
        <p className="text-ink-muted">It takes about {effort.minutesToPayment.value} minutes.</p>
      </section>

      <div className="flex flex-col items-stretch gap-2 md:flex-row-reverse md:items-center md:justify-end md:gap-4">
        <PrimaryLink href="/about" className={barPrimary}>
          Get started
        </PrimaryLink>
        {flags.signIn && (
          <TextLink href="/sign-in" className="self-center md:self-auto">
            Already started? Sign in
          </TextLink>
        )}
      </div>

      {/* Social proof, matching Legion's pattern: three figures, then the sources line. */}
      <section aria-label="Why patients choose Legion" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <dl className="grid grid-cols-3 gap-3 text-center">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="flex flex-col gap-1">
                <span className="text-2xl font-semibold text-accent">{stat.value}</span>
                <span className="text-sm text-ink-muted">{stat.label}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="micro text-ink-muted">{socialProof.sourcesLine.value}</p>

        <figure className="flex flex-col gap-1 border-t border-line pt-3">
          <p className="micro text-ink-muted">Illustrative, not a real patient</p>
          <blockquote className="text-base">
            &ldquo;I put it off for months. The questions were quick and I had a visit booked the same day.&rdquo;
          </blockquote>
          <figcaption className="text-sm text-ink-muted">A Legion patient, Texas</figcaption>
        </figure>
      </section>
    </Screen>
  );
}
