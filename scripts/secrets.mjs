// Secret patterns that must never be committed. This repository is public.
export const SECRET_PATTERNS = [
  { name: "Anthropic API key", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "Stripe secret or restricted key", pattern: /\b(sk|rk)_(live|test)_[A-Za-z0-9]{16,}/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub token", pattern: /\b(ghp|gho|ghs|ghu)_[A-Za-z0-9]{36}\b|github_pat_[A-Za-z0-9_]{40,}/ },
  { name: "Slack token", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Private key", pattern: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  {
    name: "Hard-coded credential",
    pattern: /\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][A-Za-z0-9_\-+/=]{24,}["']/i,
  },
];

/** Env files may only be committed as .env.example, and only with empty values. */
export function envFileProblem(path, text) {
  const name = path.split("/").pop();
  if (!name.startsWith(".env")) return null;
  if (name !== ".env.example") return `${path}: env files must not be committed`;
  const filled = text.split("\n").find((line) => /^[A-Z0-9_]+=\S/.test(line.trim()));
  return filled ? `${path}: .env.example must leave values empty (${filled.split("=")[0]})` : null;
}

export function findSecrets(text) {
  return SECRET_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ name }) => name);
}
