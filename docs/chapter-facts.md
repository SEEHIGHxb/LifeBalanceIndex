# Chapter-ending facts — inventory and outcome

Status: **PARTLY COMPLETE — 2026-09-11.** Six sources verified and added to
`SOURCES`. Five of eight chapters searched; **three searches died on a rate limit
and have not run** (see below).

## What this is for

The redesigned onboarding flow (`onboarding-flow-redesign.md`) ends each of its eight
chapters by reading the reader's own answers back to them and adding one fact about
the world. This document records which facts exist, which do not, and which were
rejected.

The starting position, audited before any searching: 20 sources in `SOURCES` yielding
about 31 figures, but distributed very unevenly — The Highlands held nine, while
**The Still Water held none that could be used at all.** All three of its entries are
clinical thresholds (WHO-5 "below 50/100 indicates likely depression", ST-5 ">= 7
problem"), and a screening cut-off shown to someone who has just answered ten
questions about their own mood reads as a diagnosis.

## What shipped

Six new entries in `SOURCES`. **Each was re-opened at the publisher on 2026-09-11 and
the figure read off the page** — not accepted from a search result and not taken on an
agent's word.

| Key | Chapter | Fact |
|---|---|---|
| `whrThaiSupport` | The Commons | 87.6% of Thai adults have relatives or friends to count on (Gallup/WHR 2025, ages 15+) |
| `nsoHappiness` | The Still Water | Thailand's mean TMHI-15 wellbeing score held between 31.4 and 33.6 of 45 for eight straight years |
| `nsoSkillDev` | The Workshop | 9.3% of Thais 15+ wanted to develop their skills; 22.24 million cited having no free time |
| `nsoInformal` | The Lookout | 52.4% of Thailand's 39.9m workers are in informal employment, with no social-security coverage |
| `unWppAgeing` | The Lookout | 15.4% of Thailand was 65 or over in 2024, up from 10.3% in 2015 |
| `thaiSleep2015` | The Highlands | 56.4% of Thai adults met the 7-9 hour sleep recommendation in 2015 |

**They are deliberately not in any benchmark's `sources:` array.** Every other entry
in the registry backs a claim the app makes on screen; these back claims the chapter
endings will make once built. Listing them on an aspect page today would tell a reader
that the aspect's ranking rests on them, which is false for all six — none is a scoring
input and none is a norm. They get wired in with the chapter that states them.

### Why these two matter most

**The Commons** was the harder problem. This app's two relationship instruments are
normed on the over-57s (UCLA-3 on US adults 57-85, LSNS-6 on European over-65s), and
quoting either at a working-age reader is an error the project has refused three times.
`whrThaiSupport` is nationally representative, **Thai**, and **ages 15+**. It is not a
norm for either instrument and cannot rank anyone — it is a population prevalence,
which is precisely why it is safe to state and useless for scoring. The `unranked`
text on that aspect remains true word for word.

**The Still Water** went from zero usable facts to one that is genuinely well shaped:
a national average that has barely moved in eight years. The steadiness is the story,
and it is about the country rather than the reader.

## Held back

| Fact | Why |
|---|---|
| Thai fruit and vegetable intake, 3.24 servings/day (Public Health Nutrition 2009) | The gram weight of a "serving" was never confirmed, so it cannot sit beside the WHO 80g portion the app already cites without silently equating two different units. Also NHES **III** (2004) against the app's NHES V (2014) — mixing waves |
| Thai Cohort happiness, 57.6% happy all or most of the time | Warmest-toned fact found, but an open-university cohort rather than a probability sample. Usable only with that caveat stated |
| Thai life satisfaction 25.5 of 35 (2019) | Sound, but its headline is a pandemic decline to 22.4 — the wrong note immediately after a mood questionnaire |
| US water intake, 3.0 L/2.2 L from fluids (National Academies 2005) | Verified and usable, but US data, and the report's headline 3.7/2.7 L figures are **total** water including food moisture. Presenting either as a drinking target misrepresents the source |
| Thai informal employment among the over-60s | Same publication and sample as `nsoInformal`, so not independent — and one step from "people who did not save are still working at 70", the verdict this aspect refuses |

## Rejected outright

- **UIS SDG 4.3.1 for Thailand, "0.3% of adults participated in adult learning" (2022).**
  Real, correctly quoted by the OECD, and verified at the UIS API — but every record
  carries the `UIS_EST` qualifier, meaning it is an estimate derived from formal
  enrolment rather than measured by survey. A reader told that 0.3% of Thais did any
  learning last year would be reading a data artefact.
- **WIEGO's 65% Thai informality figure.** An advocacy organisation re-analysing NSO
  microdata, so excluded by the sourcing rule — and it would contradict the NSO's own
  52.4% if placed beside it without explaining the definitional difference.
- **Thai sleep of 9.44 hours/day** (PLOS ONE 2023, same time-use surveys). Sample is
  ages 10+ and the measure counts time in bed including napping. It would read as
  plainly false to an adult reader. Two of the searches disagreed on this figure; the
  one that rejected it was right.

## NOT FOUND — treat as non-existent

Recording these so no future round spends money re-deriving them.

- **Observed Thai water or fluid intake.** Thailand is not in the international
  fluid-intake survey series, and Thai Ministry of Public Health water work is
  drinking-water *quality* surveillance, not consumption.
- **Thai adult learning hours, weekly or annual.** Thailand does not participate in
  PIAAC and the NSO measures appetite, not duration. If an hours figure for Thai adults
  ever appears in a research return, it is very likely invented.
- **Thai loneliness prevalence, average number of close friends, frequency of seeing
  family.** The Department of Mental Health's National Mental Health Epidemiology
  Survey 2023 was opened and reports nothing on any of them.
- **Thai WHO-5 general-population norms.** Now the fourth round to agree. The only Thai
  WHO-5 psychometric work is a primary-care clinic sample, and its figures could not be
  verified at the publisher.
- Thai Social Security Office coverage counts, Government Pension Fund membership, and
  National Savings Fund participation — every figure that surfaced came from news
  outlets, which the sourcing rule excludes.

## Scoring-grade finding — reported, not acted on

Thai national distributions **do** exist for the TMHI-15, the Thai Department of Mental
Health's own wellbeing instrument: NSO 2015, N=95,707, mean 31.44/45, with band shares
of 16.4% / 64.9% / 18.7%.

This is **not new and not a fix.** `round-2-findings.md` verified equivalent band
proportions on 2026-07-30 and recorded why they cannot be used: the mental aspect
administers WHO-5 and ST-5, so *"using it would be an instrument swap"* rather than a
norm swap. The German WHO-5 community norms stay. Noted here only because a search
returned it as though it were a discovery.

## The three chapters that did not run

**The Market (finance), The Wildwood (environment) and The Crossroads (social
contribution)** each hit a session rate limit and returned nothing. None is in a bad
position — finance holds four figures, environment two, social contribution three —
but The Crossroads and The Wildwood are both still single-source, and a second
independent source for either would be worth having.

Outstanding leads for whoever picks this up:

- **Environment:** no cited figure exists for Thai household air-conditioning or
  electricity use, despite the app's own note that air-conditioning is the dominant
  household energy behaviour in Thailand. The most valuable gap remaining anywhere.
- **Social contribution:** Thai NSO volunteering or household charitable-expenditure
  data; or World Giving Index historical figures for Thailand, which would let a
  chapter say how giving has moved rather than only where it stands.
- **Finance:** a Thai savings or emergency-buffer statistic. The reader is asked for
  their monthly savings and gets no context for it at all.
- **The Lookout:** OECD *Economic Surveys: Thailand 2025*, "Tackling informality"
  chapter, returned HTTP 403. A legitimate primary publisher and the best unexplored
  lead, for anyone with OECD iLibrary access.

## Method note

Eight narrow single-chapter searches were run in parallel rather than one broad round,
because this project's record is unambiguous: the broad rounds returned fabrications
buried in good material, and the narrow ones did not. Each brief carried the specific
fabrication history — the DOI that 404s, the page-18 table that does not exist, the two
invented Thai sources — and required a verbatim quote plus a confirmed-open URL for
every figure, with NOT FOUND named as an acceptable answer.

It worked. The returns marked their own weak points: one refused an EFSA figure because
the publisher served 403 on every route, one flagged its own 87% as a derivation rather
than a printed figure, one excluded an advocacy source for contradicting the government
statistics office on a different definition. No fabricated source reached this document.

Every figure that shipped was then re-opened independently: the World Bank API returned
15.3627543814492 for 2024 against a reported 15.4%, and `Thailand(0.876)` was read on
page 77 of the World Happiness Report appendix exactly as claimed. One reported sample
size (83,880 households) was absent from the summary PDF and found in the companion
160-page full report — cited correctly, from the other file of the pair.
