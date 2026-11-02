import { crisisResources } from "@/facts";

/** Rendered by the root layout so crisis help is reachable on every screen. It never blocks progress. */
export function CrisisHelp() {
  return (
    <aside aria-label="Crisis help" className="border-b border-line bg-surface px-4 py-2 text-sm text-ink-muted">
      <p className="mx-auto max-w-xl">
        If you need help right now:{" "}
        {crisisResources.map((resource, i) => (
          <span key={resource.id}>
            {i > 0 && " · "}
            <a className="font-medium text-ink underline underline-offset-2" href={resource.href}>
              {resource.action}
            </a>
          </span>
        ))}
      </p>
    </aside>
  );
}
