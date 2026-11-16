import { CLINICIANS } from "./data";
import type { Clinician } from "./model";

/**
 * Deep, per-clinician profile content for the Match profile. Every bio is a
 * distinct first-person voice with a specific path into psychiatry and concrete
 * detail, so no two read interchangeably. SYNTHETIC: these are not real people.
 * A test asserts the bios are distinct and non-empty.
 *
 * `yearsExperience` is illustrative. Training/licensing lines are generated
 * elsewhere and labelled "Sample details for this prototype".
 */
export interface ProfileContent {
  yearsExperience: number;
  /** First-person "About me": a real-sounding person, not filler. */
  aboutMe: string;
  /** First-person "My approach to care": how they actually work. */
  approach: string;
  /** Treatment approaches, in plain language. */
  treatmentApproaches: string[];
}

export const PROFILE_CONTENT: Record<string, ProfileContent> = {
  c1: {
    yearsExperience: 14,
    aboutMe:
      "I started out as an ICU nurse, where I watched how hard the body and the mind pull on each other, especially when sleep falls apart. That's what pulled me toward psychiatry. These days I work mostly with people whose worry and insomnia feed each other at 2 a.m. I'm calm, and a little stubborn about finding what actually helps you rather than what's supposed to.",
    approach:
      "I like to start with sleep and the basics, because steadier nights make everything else easier to work on. We move one change at a time, and I check in often about side effects and what you're actually noticing.",
    treatmentApproaches: ["Medication management", "Sleep-focused care", "CBT-informed strategies"],
  },
  c2: {
    yearsExperience: 11,
    aboutMe:
      "I'm the son of two teachers, and I grew up translating for relatives at doctor's visits, which is probably why I care so much about explaining things plainly. I came to psychiatry after a few years in internal medicine. I work a lot with big mood swings and the intrusive thoughts that can ride along with them, in English or Spanish.",
    approach:
      "I show my work. I'll tell you what I'm considering and why, and we decide together. With mood I'm careful and unhurried, and I'd rather make a small change and watch it closely than chase a fast fix.",
    treatmentApproaches: ["Medication management", "Mood stabilization", "ERP-informed support for intrusive thoughts"],
  },
  c3: {
    yearsExperience: 9,
    aboutMe:
      "I almost became an engineer, and I still think like one: I want to find the specific gear that's grinding. I came to psychiatry through a research lab studying attention. I work with people whose worry and racing thoughts make it hard to focus, or who get blindsided by panic.",
    approach:
      "I'm practical and concrete. We name the pattern, pick one or two changes that fit your week, and measure whether they help. I lay out the trade-offs of any medication so you can decide with clear eyes.",
    treatmentApproaches: ["Medication management", "CBT-informed strategies", "Panic-focused skills"],
  },
  c4: {
    yearsExperience: 8,
    aboutMe:
      "I spent my twenties working a community crisis line, and that's where I learned the most important thing is often just not rushing someone. I became a psychiatric nurse practitioner to keep doing that with more tools. I work with people carrying hard past experiences and the worry that lingers after them.",
    approach:
      "You set the pace and the topics. I won't push you to retell anything before you're ready. We build steadiness first, and I'm honest that trauma work is slow and worth it.",
    treatmentApproaches: ["Trauma-informed care", "Medication management", "Grounding and coping skills"],
  },
  c5: {
    yearsExperience: 12,
    aboutMe:
      "I was a hospice nurse before this, sitting with people through grief and loss, and it changed how I listen. I became a psychiatric NP to work with the low moods and sleepless nights that so often follow hard experiences. I see patients in English or Spanish, and I don't rush the hard parts.",
    approach:
      "I meet you where you are, without a script. We take feelings one at a time, and I watch sleep and energy closely as early signs of whether something is helping.",
    treatmentApproaches: ["Medication management", "Grief-informed care", "Sleep support"],
  },
  c6: {
    yearsExperience: 20,
    aboutMe:
      "I've been a psychiatrist for two decades, much of it in a busy county clinic, and the long view has made me patient. I've seen how often mood, sleep, and focus tangle together in ways that aren't obvious at first. I'm the person who asks a lot of questions and makes no judgments about the answers.",
    approach:
      "I'm thorough and steady. I'd rather understand the whole picture before changing anything, and I keep adjustments small and well explained. Progress counts even when it isn't a straight line.",
    treatmentApproaches: ["Medication management", "Diagnostic clarification", "Collaborative care"],
  },
  c7: {
    yearsExperience: 7,
    aboutMe:
      "I came to this work after my own long detour through anxiety in grad school, which taught me how lonely intrusive thoughts can feel, and how treatable they are. I'm a psychiatric NP who works with worry, panic, and the thoughts or habits that are hard to control, gently and without shame.",
    approach:
      "I normalize first, because shame makes everything louder. Then we build concrete skills and, where it fits, medication. I'm clear that getting better rarely means feeling nothing.",
    treatmentApproaches: ["Medication management", "ERP-informed care", "Anxiety skills"],
  },
  c8: {
    yearsExperience: 10,
    aboutMe:
      "I worked nights as a hospital tech while finishing school, so I know firsthand what wrecked sleep and scattered focus do to a person. I became a psychiatric NP to help people get those back. I keep early and late visits open, in English or Spanish, for people juggling work and everything else.",
    approach:
      "I'm organized and down to earth. We set a couple of realistic targets, track them, and adjust. I won't bury you in jargon, and I'll always tell you what to watch for with any medication.",
    treatmentApproaches: ["Medication management", "ADHD-focused care", "Sleep and routine support"],
  },
  c9: {
    yearsExperience: 16,
    aboutMe:
      "I trained as a psychiatrist after years as a social worker, and I never left that lens: your history and the people in your life are part of the story. I work with low moods and hard past experiences, and with how old patterns show up in the present.",
    approach:
      "I connect the dots between then and now, at a pace you set. I use medication thoughtfully and pair it with concrete ways to interrupt the patterns that keep you stuck.",
    treatmentApproaches: ["Medication management", "Trauma-informed care", "Insight-oriented support"],
  },
  c10: {
    yearsExperience: 6,
    aboutMe:
      "I'm one of the newer clinicians here, and I lean into that: I stay current, and I ask rather than assume. I came to psychiatry from peer support work with young adults figuring out big mood shifts and focus. I keep weekend times open for people who can't meet during the week.",
    approach:
      "I keep it collaborative and jargon-free. We try one small change at a time, and I genuinely want your read on whether it's helping, because you're the expert on your own week.",
    treatmentApproaches: ["Medication management", "ADHD-focused care", "Mood tracking"],
  },
  c11: {
    yearsExperience: 15,
    aboutMe:
      "I grew up in a big, loud, loving family, and I still believe the people around you are part of healing. I'm a psychiatrist who works with mood, hard past experiences, and panic, in English or Spanish. Years in community mental health shaped my patience.",
    approach:
      "I make room for the whole context of your life, not just a symptom list. I'm careful with medication for mood and panic, and I explain each step so nothing feels like a black box.",
    treatmentApproaches: ["Medication management", "Trauma-informed care", "Panic-focused skills"],
  },
  c12: {
    yearsExperience: 13,
    aboutMe:
      "I spent a decade as a nurse on a med-surg floor before specializing in psychiatry, and I carry that practical, no-drama style with me. I work with sleep, low mood, and mood shifts, with afternoon and evening times. I'm steady, and I don't flinch at a hard week.",
    approach:
      "I'm matter-of-fact and encouraging. We set small, doable goals, and I count progress even when it isn't linear. I'll always walk you through the why behind any change.",
    treatmentApproaches: ["Medication management", "Sleep support", "Behavioral activation"],
  },
  c13: {
    yearsExperience: 12,
    aboutMe:
      "I'm Utah born and raised, and I came back to practice here after training out of state because I wanted to care for my own community. I'm a psychiatric NP with a broad focus, from low mood and worry to sleep and panic. I keep mornings and afternoons open to fit around work.",
    approach:
      "I start by getting the full picture, then we pick the one or two things most worth changing first. I check in often, adjust as we go, and keep my explanations plain.",
    treatmentApproaches: ["Medication management", "CBT-informed strategies", "Sleep support"],
  },
  c14: {
    yearsExperience: 14,
    aboutMe:
      "I was a high-school teacher before medicine, and spotting the kid who couldn't focus, or who was quietly panicking, is what pulled me into psychiatry. I work with focus, mood shifts, and the thoughts that are hard to control, in English or Spanish, here in Utah.",
    approach:
      "I'm curious and collaborative, and I teach as I go, because understanding what's happening is half the relief. I'm careful and clear with medication, and I want your feedback at every step.",
    treatmentApproaches: ["Medication management", "ADHD-focused care", "ERP-informed support"],
  },
  c15: {
    yearsExperience: 9,
    aboutMe:
      "I came to psychiatry after volunteering with a refugee resettlement program, where I saw how much steadiness and being truly heard can carry someone. I'm a psychiatric NP in Utah working with low mood, hard past experiences, and the worry around them. I keep morning and evening times open.",
    approach:
      "I sit with the hard parts without rushing, and I'm honest that healing is rarely a straight line. Where it fits, we pair medication with small, concrete steps you can actually keep.",
    treatmentApproaches: ["Medication management", "Trauma-informed care", "Anxiety skills"],
  },
};

const FALLBACK: ProfileContent = {
  yearsExperience: 8,
  aboutMe: CLINICIANS[0]?.bio ?? "",
  approach: "We work together, one step at a time, at a pace that feels right for you.",
  treatmentApproaches: ["Medication management"],
};

export function profileContent(id: string): ProfileContent {
  return PROFILE_CONTENT[id] ?? FALLBACK;
}

/**
 * What to expect in a first visit: concrete and reassuring, 3 to 4 lines. Shared
 * process (it's the same visit), lightly tailored by the clinician's first name
 * and role so it reads warmly, never generic filler.
 */
export function firstVisitLines(clinician: Clinician): string[] {
  const first = clinician.name.split(" ")[0];
  return [
    `Your first visit is about 50 minutes, by video. ${first} will ask what brought you in and what you're hoping changes.`,
    "You'll talk through your history, your sleep, and anything you've tried before. There's nothing to prepare, and you can share as much or as little as you want.",
    `If medication makes sense, ${first} will explain the options, the trade-offs, and what to watch for, and you decide together. Nothing is prescribed without your say.`,
    "You'll leave with a clear next step and a plan to check in, so you're never left wondering what happens next.",
  ];
}
