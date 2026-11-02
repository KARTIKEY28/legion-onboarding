/**
 * Removes identifiers before any model call: emails, phone numbers, dates,
 * long ID-like numbers, web addresses, street addresses and stated names.
 * The text that remains is still health information and is never called
 * "anonymized". Pattern-based, so it can miss names written without a cue
 * ("my name is", "I'm"); the prototype uses synthetic personas only.
 */
const RULES: [RegExp, string | ((match: string, ...groups: string[]) => string)][] = [
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]"],
  [/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "[link]"],
  [/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[phone]"],
  [/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g, "[date]"],
  [/\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)\.? \d{1,2}(st|nd|rd|th)?,? \d{4}\b/gi, "[date]"],
  [/\b\d{3}-?\d{2}-?\d{4}\b/g, "[number]"],
  [/\b\d{6,}\b/g, "[number]"],
  [/\b\d+ [A-Za-z0-9 ]+ (street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct)\b\.?/gi, "[address]"],
  [/\b([Mm]y name is|I am|I'm|[Cc]all me|[Tt]his is) ([A-Z][a-z]+)( [A-Z][a-z]+)?/g, (_match: string, cue: string) => `${cue} [name]`],
];

export function removeIdentifiers(text: string): string {
  return RULES.reduce((result, [pattern, replacement]) => typeof replacement === "string" ? result.replace(pattern, replacement) : result.replace(pattern, replacement), text);
}
