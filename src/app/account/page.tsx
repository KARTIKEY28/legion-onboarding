"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { trackOnce, useTrackOnce } from "@/analytics/hooks";
import { maskedFromFields } from "@/components/form";
import { Portrait } from "@/components/Portrait";
import { ActionBar, LoadingScreen, PrimaryButton, Progress, Screen, TextLink, barPrimary } from "@/components/ui";
import { formatCentral } from "@/time";
import { getAnswers, useAnswers } from "@/session/store";

/**
 * Account step. No password: Legion emails a sign-in link after booking, so the
 * patient never types a secret here. The date of birth is shown read-only from
 * the About you step (changing it means going back, so the eligibility check runs
 * again). Names, email, phone and the date of birth stay in the session store and
 * never reach an analytics event; account.created carries only whether the email
 * was pre-filled.
 */

/**
 * Synthetic "already registered" emails, for the returning-patient path only.
 * There is no real account store in the prototype; this just shows the sign-in-link
 * flow when one of these is entered.
 */
const REGISTERED_EMAILS = new Set(["returning@example.com", "existing@example.com"]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountPage() {
  const answers = useAnswers();
  if (!answers) return <LoadingScreen />;
  return <AccountForm />;
}

interface Fields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

function AccountForm() {
  const router = useRouter();
  const saved = getAnswers();
  const prefilledEmail = saved.notifyEmail ?? "";
  const dob = saved.dob ? maskedFromFields(saved.dob) : "";

  const [fields, setFields] = useState<Fields>({ firstName: "", lastName: "", email: prefilledEmail, phone: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [existing, setExisting] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  useTrackOnce("account.viewed", "account.viewed");

  const set = (key: keyof Fields) => (value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    if (key === "email") setExisting(false);
  };

  const validate = (f: Fields): Partial<Record<keyof Fields, string>> => {
    const next: Partial<Record<keyof Fields, string>> = {};
    if (!f.firstName.trim()) next.firstName = "Please add your first name.";
    if (!f.lastName.trim()) next.lastName = "Please add your last name.";
    if (!f.email.trim()) next.email = "Please add your email.";
    else if (!EMAIL_RE.test(f.email.trim())) next.email = "That email doesn't look right. Please check it.";
    if (!f.phone.trim()) next.phone = "Please add a phone number.";
    return next;
  };

  const emailWasPrefilled = useMemo(() => Boolean(prefilledEmail), [prefilledEmail]);

  function submit() {
    const found = validate(fields);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    if (REGISTERED_EMAILS.has(fields.email.trim().toLowerCase())) {
      // Returning patient: offer a sign-in link instead of creating an account.
      setExisting(true);
      return;
    }
    trackOnce("account.created", "account.created", { email_prefilled: emailWasPrefilled });
    router.push("/payment");
  }

  return (
    <Screen>
      <Progress step="account" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-ink-muted">So we can hold your details and send your sign-in link. Nothing is booked or charged yet.</p>
      </div>

      {saved.selectedClinician && (
        <section aria-label="Your chosen visit" className="flex items-start gap-3 rounded-lg bg-accent-soft p-4">
          <Portrait id={saved.selectedClinician.id} name={saved.selectedClinician.name} size={48} />
          <div className="flex flex-col gap-1">
            <p className="text-sm text-ink-muted">Your first visit</p>
            <p className="text-lg font-semibold">{saved.selectedClinician.name}</p>
            {saved.selectedSlot && <p className="text-base">{formatCentral(saved.selectedSlot.iso)}</p>}
          </div>
        </section>
      )}

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field id="firstName" label="First name" autoComplete="given-name" value={fields.firstName} onChange={set("firstName")} error={errors.firstName} />
        <Field id="lastName" label="Last name" autoComplete="family-name" value={fields.lastName} onChange={set("lastName")} error={errors.lastName} />
        <Field
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={fields.email}
          onChange={set("email")}
          error={errors.email}
          note={emailWasPrefilled ? "From the email you gave us earlier. Change it if you'd like." : undefined}
        />
        <Field id="phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={fields.phone} onChange={set("phone")} error={errors.phone} />

        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold">Date of birth</span>
          <div className="flex items-center gap-3">
            <span data-testid="account-dob" className="text-base text-ink">
              {dob || "Not provided"}
            </span>
            <TextLink href="/about" className="text-sm">
              Edit
            </TextLink>
          </div>
          <p className="text-sm text-ink-muted">From the About you step. We only use it to confirm you&apos;re an adult.</p>
        </div>

        <p className="rounded-md bg-surface px-4 py-3 text-sm text-ink-muted">
          No password needed. We&apos;ll email you a link to sign in after you book.
        </p>

        {existing && (
          <div role="status" className="flex flex-col gap-3 rounded-md bg-accent-soft px-4 py-3">
            {linkSent ? (
              <p>Check your inbox. We&apos;ve sent a sign-in link so you can continue.</p>
            ) : (
              <>
                <p>Looks like you already have an account with that email. We can email you a link to sign in.</p>
                <button
                  type="button"
                  onClick={() => setLinkSent(true)}
                  className="self-start rounded-md border border-accent px-4 py-2 text-base font-medium text-accent"
                >
                  Send me a sign-in link
                </button>
              </>
            )}
          </div>
        )}

        <ActionBar backHref="/cost">
          <PrimaryButton type="submit" className={barPrimary}>
            Continue to payment
          </PrimaryButton>
        </ActionBar>
      </form>
    </Screen>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  note,
  type = "text",
  inputMode,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  note?: string;
  type?: string;
  inputMode?: "email" | "tel" | "text";
  autoComplete?: string;
}) {
  const describedBy = [note && `${id}-note`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-lg font-semibold">
        {label}
      </label>
      {note && (
        <p id={`${id}-note`} className="text-sm text-ink-muted">
          {note}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-danger">
          {error}
        </p>
      )}
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(error)}
        className={`min-h-11 w-full rounded-md border bg-surface px-3 text-base text-ink ${error ? "border-danger" : "border-line"}`}
      />
    </div>
  );
}
