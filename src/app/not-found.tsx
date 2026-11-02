import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-12">
      <h1 className="text-xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-ink-muted">The link may be old. You can start from the beginning.</p>
      <Link href="/" className="self-start rounded-md bg-accent px-6 py-3 font-medium text-accent-ink">
        Go to the start
      </Link>
    </main>
  );
}
