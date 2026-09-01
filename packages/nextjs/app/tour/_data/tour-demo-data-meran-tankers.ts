/**
 * ACTIVE demo dataset — Meran Tankers / Strait of Hormuz routing decision
 * (Voice Influence case C1, "shipping-company voice").
 *
 * Intake is the real C1 intake (see `lib/hormuz-voice-cases.ts`). The provider
 * briefs, lenses, and clarifications are excerpted from the real harness run
 * (decision 6f0435f1-cf02-40be-b7ba-ca8f573ca12b, run #4, 2026-08-21) so the
 * tour shows substantive model output rather than paraphrase. Lists are trimmed
 * to a representative selection; individual statements are verbatim.
 *
 * The Unified Brief and cross-model disagreement table are synthesized by hand
 * from those four real briefs (no Unified Brief was generated for this case).
 */

import type {
  TourClarification,
  TourDisagreement,
  TourIntake,
  TourProviderRun,
  TourScenario,
  TourUnifiedBrief,
} from "./tour-demo-types";

export const TOUR_SCENARIO: TourScenario = {
  decisionId: "demo-meran-tankers-hormuz",
  label: "Meran Tankers — Strait of Hormuz routing",
};

export const TOUR_INTAKE: TourIntake = {
  situation:
    "We operate a mid-size fleet of fourteen crude and products tankers, chartered primarily to trading houses and two national oil companies. Six of our vessels have standing charter obligations that require Gulf-origin loading, which means transiting the Strait of Hormuz.\n\nThe Strait has been effectively closed to routine commercial shipping since the war began in late February, reopened briefly under the June ceasefire framework, and has been closed again since early July after renewed attacks on commercial vessels. A naval escort program has been running convoys through the Strait since April, and war-risk insurers are still willing to underwrite Hormuz transits under escort, at a substantially elevated premium.\n\nWe are deciding whether to keep accepting and fulfilling Hormuz-transiting charters under the escort program, or to shift our Gulf-facing contracts entirely to the alternate routing around the Cape of Good Hope, which adds roughly three weeks and meaningfully higher fuel cost per voyage.\n\nWe have not locked a direction yet. Two of our six Gulf-facing contracts renew in five weeks, and our customers are already asking which way we're leaning — we need a decision within this charter cycle, but we want the commercial case pressure-tested before we commit.",
  constraints:
    "Three of our direct competitors with comparable fleets have continued Hormuz transits throughout the war under escort. One paused entirely in March and has not resumed. Customers have been clear that continued willingness to service Gulf-origin loads is a factor in which operators keep getting offered charters when contracts come up for renewal.\n\nWar-risk insurance for Hormuz transits is available through our existing underwriters, at a premium of roughly 5% of hull value per voyage, up from a pre-war baseline near 0.05%. That's priced in to the charter rates we'd quote. Underwriters wouldn't be offering this coverage if they'd concluded the risk was uninsurable at any price — they've priced it, not declined it.\n\nThe escort program requires transiting in convoy on a fixed schedule set by the naval task force, which limits our routing flexibility but has been running consistently since April.\n\nCrew compensation for Gulf transits currently includes a hazard-pay supplement, negotiated with our crewing agencies and in line with what the rest of the industry is paying for war-zone transits. That arrangement is settled and hasn't been a point of friction with the unions we work with.\n\nFleet-wide risk profile for Hormuz transits since the war began: seventeen merchant vessels damaged in the Strait, of which seven were declared total losses or abandoned; two vessels captured and their crews detained for periods ranging from days to several weeks before release; one tugboat sunk; twelve seafarers killed or reported missing across the crisis. None of these incidents involved our fleet. Convoy transits under escort have had a materially lower incident rate than unescorted transits earlier in the war, though escorted convoys have still taken fire on at least two occasions.",
  posture: "pressure_test",
  leaning_direction:
    "Leaning toward continuing Hormuz-transiting charters under escort — mainly to protect competitive position with Gulf-facing customers versus operators still sailing the lane — but this is an inclination, not a decision. Treat insurance cost and the escort schedule as priced inputs for the commercial math, not as settled moral clearance. Pressure-test whether staying in-lane is actually the right call for the next contract cycle versus ceding the lane and routing Cape.",
  knowns_assumptions:
    "FACTS (as we understand the theater mid-August 2026): Strait closed to routine commercial shipping since early July after a brief June reopen; naval escort convoys running since April; war-risk premium ~5% of hull value per Hormuz voyage vs ~0.05% pre-war; Cape adds ~three weeks and higher fuel; six Gulf-facing charters of which two renew in five weeks; industry casualty tally since the war began includes 17 damaged merchant vessels (7 total losses/abandoned), 2 captures with crew detention, 1 tug sunk, 12 seafarers killed or missing — none involving our fleet; escorted convoys have taken fire at least twice.\nASSUMPTIONS (want tested — treat as open, not settled): that the escort program's safety record so far is a useful guide to near-term risk; that insurers' willingness to keep underwriting these transits is a reasonably informed signal about risk; that our crew hazard-pay arrangement is adequate; that customers' preference for operators who keep servicing this lane will persist rather than soften as the war continues. Our own clean incident record is a fact about the past; we are not treating it as proof about the next transit.",
  unknowns:
    "Whether the cost gap between Hormuz-under-escort and the Cape route will narrow or widen over the next two quarters, and which way that should push contracts we'd be locking in now. Whether losing this lane to competitors now would be recoverable later if we wanted back in, or whether wartime customer relationships would make re-entry costly. Whether the escort program's schedule and capacity would even support shifting more of the fleet this way if the commercial case held — and conversely, what we give up if we step back for a cycle and later want in again.",
};

export const TOUR_CLARIFICATIONS: TourClarification[] = [
  {
    lens: "risk",
    question:
      "For a representative renewing contract, what are the vessel hull value, expected number of Hormuz voyages during the term, and expected contribution margin per voyage before the 5% war-risk premium?",
    answer:
      "Take the Suezmax on the NOC contract renewing in five weeks as representative: insured hull value is about $62M, and the term as drafted implies 8–9 Hormuz round-trip transits over twelve months. Contribution margin before war-risk premium runs roughly $1.4–1.7M per voyage at current wartime rates. At 5% of hull, the premium is ~$3.1M per voyage — which is why the whole case depends on customers absorbing that in the quoted rate, as they have been so far. If premiums move to 7–8% after another convoy incident, the voyage math goes negative unless rates reprice with them.",
  },
  {
    lens: "reversibility",
    question:
      "What is the standard term of the two renewing charters, and would customers accept a shorter term or a break clause tied to defined war-risk triggers?",
    answer:
      "Both charters have historically renewed on 12-month terms, and the charterers have signaled they want the same again to lock capacity while the lane is constrained. We have not formally proposed a 6-month term or a break clause tied to defined war-risk triggers (escort suspension, premium above a set percentage of hull value, or a casualty within the convoy program), though our chartering lead believes one of the two — the trading house — would probably trade a modest rate discount for that flexibility. The NOC is expected to resist anything that looks like conditional commitment, but that read is based on informal conversations, not a tabled proposal.",
  },
  {
    lens: "people",
    question:
      "Who inside the company has authority to stop taking Hormuz fixtures after a premium spike, crew incident, or convoy attack, and how fast can that bind commercial booking?",
    answer:
      "Formally, the CEO and the Head of Fleet Operations jointly can suspend Hormuz fixtures, and the DPA/HSSE director can halt a specific transit on safety grounds. In practice the chartering desk keeps booking until told otherwise, and there is no written trigger list — after the two convoy-fire incidents earlier this year, the pause decision took about 48 hours of internal debate before ops confirmed the next sailing. So the authority exists but it is discretionary and slower than a pre-agreed stop rule would be, which the board has not yet fixed.",
  },
];

export const TOUR_RUNS: TourProviderRun[] = [
  {
    provider: "openai",
    brief: {
      title: "Hormuz Escort Charters Versus Alternative Gulf Contract Structures",
      summary:
        "Continuing limited escorted service may preserve market presence, but the commercial case does not support an unconditional fleet-wide commitment. The proposed NOC renewal is especially unattractive as drafted: its twelve-month guarantees expose the company to premium escalation, convoy disruption, and performance risk without automatic reimbursement or routing relief. A short, protected trading-house renewal offers a more reversible way to retain lane access while Cape and outside-Strait alternatives are formally tested.",
      recommendation:
        "Pursue a capped six-month trading-house pilot under escort, decline to sign the NOC renewal as drafted, and make any NOC commitment conditional on automatic premium pass-through, advance funding, and objective Cape-switch, suspension, and termination rights.",
      next_steps: [
        "Submit revised renewal terms requiring automatic war-risk premium pass-through, advance payment or escrow, convoy-delay relief, and objective Cape-switch, suspension, and termination triggers.",
        "Offer the trading house a six-month contract with a three-voyage cap or minimum, no automatic extension, and formal review after each transit or after three voyages.",
        "Model contract economics at 5%, 7%, and 8% premiums, including delayed or disputed reimbursement, convoy waiting, missed slots, substitute tonnage, and outside-Strait vessel-day earnings.",
      ],
    },
    lenses: {
      risk: {
        confidence: "high",
        top: [
          "The NOC renewal appears commercially unattractive unless war-risk premiums are fully and continuously passed through. At a $3.1 million premium against only $1.4–1.7 million of contribution margin before that premium, even one unreimbursed or disputed charge can erase approximately two voyages of operating contribution.",
          "A twelve-month commitment for eight guaranteed NOC liftings is a long-dated exposure being priced from a highly unstable spot security and insurance environment. The contract could convert a voluntary risk into a firm-performance obligation precisely when escorts, insurance, ports, or crews become unavailable.",
          "The competitive argument may be overstated because competitor behavior does not reveal their economics, contractual protections, risk retention, vessel values, state support, or willingness to absorb losses. Matching their route without matching their contract terms could preserve utilization while destroying risk-adjusted margin.",
          "A casualty would create losses beyond insured hull value, including injury or death, detention, pollution, salvage, wreck removal, sanctions complications, loss of customer confidence, crew availability problems, and management distraction. Insurance availability and hazard pay do not establish that these exposures are fully transferred.",
        ],
      },
      reversibility: {
        hard_to_undo: [
          "Signing the NOC renewal for twelve months and eight guaranteed liftings without automatic war-risk repricing, escort-availability relief, or a Cape-routing right would convert a currently priced risk into a largely irreversible performance and margin obligation.",
          "A fatality, serious injury, prolonged crew detention, or traumatic exposure during an attack cannot be commercially repaired. Hazard pay, union acceptance, insurance, and naval escort may allocate or reduce risk, but they do not make these outcomes reversible.",
          "Stepping away from the NOC lane for a full cycle may effectively surrender incumbency and move the company to spot-backup status. Re-entry could then depend on a competitor failing, a future tender, or accepting lower margins.",
        ],
        safe_first: [
          "Use the trading-house renewal as the primary reversible pilot: propose six months, a three-voyage minimum, a mutual review after each convoy transit or after three voyages, and no automatic extension. This preserves preferred-list status while limiting exposure.",
          "Do not execute either renewal until legal completes the wartime addenda. Make automatic premium pass-through, a defined premium ceiling, escort suspension relief, convoy-delay treatment, and a unilateral Cape-routing or termination right approval conditions rather than optional negotiating points.",
          "Formally test the assumption that Cape routing loses customer standing. Submit or discuss a Cape alternative with each counterparty that states the longer transit time and price, then ask specifically whether it preserves preferred-bidder or incumbent status.",
        ],
      },
      people: {
        impacts: [
          {
            who: "Masters, officers, and crews on the six Gulf-facing vessels",
            sentiment: "negative",
            note: "Continuing under escort preserves employment continuity and hazard pay but exposes them to casualty, detention, trauma, and repeated convoy uncertainty. The absence of union friction does not establish informed individual consent.",
          },
          {
            who: "Chartering desk and commercial leadership",
            sentiment: "positive",
            note: "Continuing supports utilization, renewal odds, and customer relationships. However, utilization-linked incentives may encourage the desk to underweight downside risk or avoid protective clauses that make bids appear conditional.",
          },
          {
            who: "National oil company customer and procurement team",
            sentiment: "neutral",
            note: "A firm twelve-month escorted commitment best matches their preference for eight guaranteed liftings. It also creates the largest execution conflict because the customer resists conditional performance while convoy access, insurance pricing, and safe passage remain outside the operator's control.",
          },
          {
            who: "Board, lenders, shareholders, and fleet asset managers",
            sentiment: "neutral",
            note: "Staying in-lane may protect franchise value but creates concentrated exposure: at a $62 million hull value, each 5% premium is about $3.1 million, before deductibles, uninsured losses, detention, off-hire, reputational damage, or asset loss.",
          },
        ],
      },
    },
  },
  {
    provider: "anthropic",
    brief: {
      title: "Hormuz Escorted Transits Versus Cape Routing for Gulf Charter Renewals",
      summary:
        "Two of six Gulf-facing charters renew in five weeks, and the commercial case for staying in-lane under escort (14–16% margin vs 9–11% Cape) is real but fragile: it depends on the 5% war-risk premium holding and clean pass-through, neither of which is contractually secured mid-term. The bigger exposure is not lane choice but contract architecture — signing 12-month terms with the narrowed war clause charterers want converts an inclination into a year-long obligation with no clean exit if premiums spike, escorts suspend, or cover is withdrawn.",
      recommendation:
        "Stay in-lane for the trading-house renewal only if you secure defined break triggers (escort suspension, premium above a set hull-value cap, insurance withdrawal, convoy casualty) and contractual premium pass-through; do not accept the narrowed war clause or an unconditional 12-month NOC term until the split option and NOC flexibility have been formally tested.",
      next_steps: [
        "Formally table a term sheet with the trading house this week: in-lane renewal with break triggers (escort suspension, premium cap at a defined % of hull value, insurance withdrawal, convoy casualty) plus explicit premium pass-through/reprice mechanism, offering a modest rate discount in exchange.",
        "Put a conditional-commitment proposal to the NOC rather than pre-conceding — test whether they will accept any trigger structure before deciding to renew as drafted, let it go, or split the book.",
        "Ask crewing agencies and masters directly about willingness to continue Hormuz transits over the next 12 months and quantify likely refusal-with-reassignment rates, rather than inferring consent from silence.",
      ],
    },
    lenses: {
      risk: {
        confidence: "medium",
        top: [
          "Locking 12-month terms with the war clause narrowed to deem escorted transits acceptable converts today's inclination into a binding obligation with no clean exit if conditions deteriorate; you would be arguing frustration under pressure rather than exercising a trigger.",
          "The 4-6 point margin advantage over Cape is fragile: a single convoy casualty could spike premiums to 8-10% of hull value mid-contract, and you have not stress-tested whether reprice pass-through survives a post-incident negotiation with a resistant NOC counterparty.",
          "Insurance withdrawal mid-term has no contractual suspension right in the drafts; if underwriters pull Hormuz cover after an incident, you face uninsured performance obligations or breach exposure on six vessels simultaneously, a correlated fleet-level event, not a per-voyage risk.",
          "Crew consent is thinner than it looks: right to refuse with reassignment has not been paired with actually asking crews; a refusal wave after a convoy incident could leave you unable to man committed transits, and hazard pay silence so far is weak evidence of durable willingness.",
        ],
      },
      reversibility: {
        hard_to_undo: [
          "Signing 12-month charters with the narrowed war-risk clause the charterers want would lock you into escorted Hormuz transits for a full year with no clean exit if premiums spike, the escort program is suspended, or insurers withdraw cover mid-term.",
          "A casualty, capture, or crew detention involving your fleet cannot be undone; crew deaths, detained seafarers, and a lost hull are permanent outcomes regardless of how well the commercial math was priced.",
          "Ceding the lane entirely for a 12-month cycle likely means Gulf-facing charterers reallocate to the three competitors still sailing, and wartime relationship loyalty may make re-entry costly or impossible at comparable rates later.",
        ],
        safe_first: [
          "Formally table a 6-month term or defined break clauses (escort suspension, premium above a set hull-value percentage, convoy casualty) with the trading house, trading a modest rate discount for it; your chartering lead already believes they would take it, and asking costs nothing.",
          "Split the two renewals: renew the trading house charter in-lane with break triggers, and test whether the NOC will accept any conditionality before deciding whether to renew it as drafted or let it go.",
          "Stress-test the quoted rates against an 8-10% premium scenario now, and negotiate an explicit premium pass-through or repricing mechanism into the renewal terms instead of assuming clean pass-through.",
        ],
      },
      people: {
        impacts: [
          {
            who: "Seafarers assigned to Hormuz transits",
            sentiment: "negative",
            note: "Bear the direct physical and psychological risk of convoy transits that have taken fire twice; they have a refusal-with-reassignment right, but that right has not been tested at scale and hazard pay adequacy is inferred from silence rather than asked.",
          },
          {
            who: "National oil company charterer",
            sentiment: "negative",
            note: "Expected to resist conditional commitments and is pushing to narrow the war-risk clause so escorted transits are deemed acceptable; agreeing gives revenue certainty but transfers escalation risk to you with no clean exit if insurance withdraws or premiums spike.",
          },
          {
            who: "Trading house charterer (renewing in five weeks)",
            sentiment: "positive",
            note: "Wants a 12-month lock on Hormuz capacity; likely willing to trade a modest rate discount for a break clause tied to war-risk triggers, so a well-structured proposal could preserve the relationship while limiting your downside.",
          },
          {
            who: "Underwriters",
            sentiment: "neutral",
            note: "Continue to earn elevated premiums and effectively set your economics; a post-incident reprice to 8-10% would erase most of the 4-6 point margin advantage, and you have not verified how they updated after the July closure.",
          },
        ],
      },
    },
  },
  {
    provider: "gemini",
    brief: {
      title: "Evaluating Hormuz Escort Transits Versus Cape Routing for Tanker Charters",
      summary:
        "Evaluating whether to continue Hormuz transits under naval escort or shift to Cape of Good Hope routing for six Gulf-facing tanker charters, including two expiring in five weeks. While war-risk insurance premiums are successfully passed through at cost plus a 10% handling margin, uncompensated convoy delays under 72 hours and unhedged operational tail risks pose significant commercial exposure. Tabling dual-option quotes (Hormuz transit versus Cape routing) and renegotiating delay thresholds in the upcoming renewals will test actual customer flexibility while preserving operational reversibility.",
      recommendation:
        "Submit dual-option renewal quotes for the two expiring charters—offering escorted Hormuz transits paired with tighter delay thresholds alongside Cape routing terms—to pressure-test charterer demand before committing to fixed long-term transit obligations.",
      next_steps: [
        "Instruct the chartering desk to table dual-option renewal proposals (escorted Hormuz transit vs. Cape routing) for the two expiring contracts within five business days.",
        "Negotiate tighter demurrage terms in draft charter parties to lower the uncompensated convoy delay window from 72 hours to 24 hours.",
        "Incorporate route-flexibility and mutual opt-out clauses triggered if war-risk premiums exceed established threshold caps.",
      ],
    },
    lenses: {
      risk: {
        confidence: "medium",
        top: [
          "Uncompensated delay costs: Convoy schedule delays occurring once or twice per transit window will erode charter profitability because demurrage coverage only kicks in after a 72-hour waiting period, and charterers are resisting even that threshold.",
          "Severe downside asymmetry: While war-risk premiums are passed through to customers, vessel detention, crew capture, hull deductibles, and off-hire periods during naval investigations remain unhedged liabilities on the shipowner.",
          "Premature assumption of market loss: Assuming customers will defect to competitors if Hormuz transit is refused, despite charterers showing openness to alternative routing and the shipowner having not yet formally tested Cape pricing in active negotiations.",
          "Escalation risk outstripping fixed margins: War-risk insurance premiums at 5 percent reflect high loss expectancy; a sudden spike in hostile actions could lead underwriters to suspend coverage mid-voyage or alter terms, leaving the fleet exposed to stranded assets.",
        ],
      },
      reversibility: {
        hard_to_undo: [
          "Signing multi-year fixed-term renewals for the two expiring charters without exit triggers for escort suspension or premium spikes.",
          "Accepting charter party agreements with weak delay coverage that leave convoy demurrage uncompensated below 72 hours, permanently locking in margin erosion per delay.",
          "Suffering vessel damage, capture, or crew casualty during an escorted transit, which permanently impacts fleet insurance rates, reputation, and crew retention.",
        ],
        safe_first: [
          "Offer charterers a dual-rate quote presenting both an escorted Hormuz transit rate and a Cape routing rate to directly test customer price elasticity and willingness to accept Cape transit timelines.",
          "Negotiate short-term contract extensions of three to six months for the two renewing vessels rather than committing to standard multi-year terms while observing post-July security developments.",
          "Include route-flexibility and mutual opt-out clauses in draft terms that allow switching to Cape routing if war-risk premiums exceed threshold caps or escort schedules stall.",
        ],
      },
      people: {
        impacts: [
          {
            who: "Seagoing crew and vessel masters",
            sentiment: "negative",
            note: "Exposed to direct security threats and combat risks during Strait transits; experience operational stress and potential physical danger despite hazard pay supplements.",
          },
          {
            who: "Commercial and chartering desk",
            sentiment: "neutral",
            note: "Gains commercial leverage with Gulf customers and earns a margin on premium pass-throughs, but faces tough negotiations over convoy delay demurrage terms.",
          },
          {
            who: "Gulf-facing charterers (trading houses and NOCs)",
            sentiment: "positive",
            note: "Maintains direct, faster export access from Gulf loading ports, though subject to potential convoy scheduling delays and war-risk cost surcharges.",
          },
          {
            who: "Fleet operations and technical management",
            sentiment: "negative",
            note: "Required to manage complex convoy scheduling dependencies, emergency response protocols, and tight naval task force arrival windows.",
          },
        ],
      },
    },
  },
  {
    provider: "xai",
    brief: {
      title: "Hormuz escort charters versus Cape routing for Gulf tankers",
      summary:
        "Six Gulf-facing tankers drive about 45% of expected gross margin (two renewals in five weeks alone ~18% at peak wartime rates), while three comparable competitors still transit Hormuz under escort and customers treat lane willingness as a renewal factor—though how much the two renewing customers weight routing versus rate and reliability is still split or unclear. War-risk cover remains available at ~5% of hull per voyage and escorted convoys have a better record than earlier unescorted traffic, but the real risk budget is zero crew deaths and only short detention; stop authority is discretionary and took ~48 hours after prior convoy-fire incidents, and fixture language on routing lock-in is unreviewed. Continuing in-lane protects competitive position and headline margin but loads irreversible fatality/detention tails onto the most profitable slice of the book; ceding to the Cape collapses that tail risk but may hand fixtures to rivals with unknown re-entry cost.",
      recommendation:
        "Do not lock full-term Hormuz-only renewals this cycle; run a hybrid for the next five weeks—dual-route quotes and short/optional terms only, with written stop triggers and redlined fixture exits in place before any in-lane commitment—and default to Cape (or non-Gulf employment) wherever customers refuse real optionality.",
      next_steps: [
        "Obtain and redline draft fixture language for both renewals within two weeks, focusing on routing obligations, Cape substitution rights, war-risk and convoy-delay allocation, suspension/termination, and damages if escort or insurance conditions change.",
        "Present parallel escorted-Hormuz and Cape (or dual-route) commercial packages to the two renewing customers and document in writing how each weights lane willingness versus delivered cost, laycan reliability, and counterparty safety.",
        "Table a board-level written stop-trigger list this cycle—fatality, detention beyond a stated duration, convoy taking fire, insurer withdrawal or premium above a ceiling, crew/agency fill failure—with named authority to freeze new Hormuz fixtures inside hours, not days.",
      ],
    },
    lenses: {
      risk: {
        confidence: "medium",
        top: [
          "Concentration risk is severe: the six Gulf-facing charters are about 45 percent of expected gross margin and the two renewals alone are about 18 percent at the highest wartime rates, so a single detention, damage event, or forced exit hits the most profitable slice of the book first rather than a diversified portfolio.",
          "Your real risk budget is zero crew deaths and only short detention, yet stop authority is discretionary with roughly 48 hours of debate after prior convoy-fire incidents, which is too slow if an escort transit is already under fire or a vessel is being boarded.",
          "Competitive-position logic may be self-reinforcing bias: customers say lane willingness matters, but you do not yet know how much each renewing customer weights routing versus rate, reliability, and counterparty risk, so you may be paying war-risk and crew hazard cost to defend a preference that is softer than chartering anxiety implies.",
          "Insurance priced at roughly 5 percent of hull value per voyage is not moral or operational clearance; underwriters can reprice, restrict, or withdraw after the next loss cluster, leaving you mid-cycle with fixtures written on assumptions that no longer hold.",
        ],
      },
      reversibility: {
        hard_to_undo: [
          "Signing the two renewals in five weeks with fixture language that locks Gulf-origin loading and Hormuz transit for the full term would commit roughly 18 percent of next-twelve-month gross margin to the lane with unclear mid-cycle exit rights until drafts are reviewed.",
          "Any crew fatality on an owned or operated vessel would, on leadership's own working rule, force immediate exit from the lane regardless of the commercial case, and would permanently change reputation with crews, agencies, insurers, and customers.",
          "Booking additional escorted voyages without a pre-agreed written stop-trigger list leaves you dependent on the current discretionary CEO plus Head of Fleet Operations process, which already took about 48 hours of debate after convoy-fire incidents before ops confirmed the next sailing.",
        ],
        safe_first: [
          "Before any lean becomes a renewal offer, obtain and redline draft fixture language for the two contracts renewing in five weeks specifically for routing obligations, war-risk termination, convoy-delay allocation, and substitution rights to Cape.",
          "Present both an escorted-Hormuz price and a Cape price or dual-route option to the two renewing customers in parallel and record which factors they actually weight, since lane preference is still split or unclear.",
          "Put a written board-level stop rule in place now covering fatality, detention beyond a stated duration, convoy taking fire, insurance withdrawal or premium above a ceiling, and crew-agency failure to fill billets, with named authority to freeze new Hormuz fixtures inside hours not days.",
        ],
      },
      people: {
        impacts: [
          {
            who: "Chartering and commercial team",
            sentiment: "positive",
            note: "Staying in-lane protects the two renewals that carry about 18 percent of expected gross margin and the broader Gulf book at roughly 45 percent. Their anxiety about rivals keeping Hormuz service is the main internal pressure toward continue.",
          },
          {
            who: "Seafarers on Gulf-facing vessels and crewing agencies",
            sentiment: "negative",
            note: "Continued Hormuz under escort keeps hazard-pay income but also keeps them inside a theater where escorted convoys have still taken fire. Acceptance is only adequate while hazard pay and agency backfill hold; any fatality would collapse the informal risk budget and force exit.",
          },
          {
            who: "Two renewing Gulf-facing customers",
            sentiment: "neutral",
            note: "In-lane service matches what three comparable competitors still offer and may preserve fixture preference at renewal. The weight they actually put on lane willingness is split or unclear, so the commercial upside of staying is not guaranteed.",
          },
          {
            who: "Board and finance / covenants owners",
            sentiment: "negative",
            note: "Hull loss is modeled as painful but absorbable after insurance. They have not set an explicit ceiling on crew casualties or detention length, yet leadership's real budget is zero deaths and short detention only. A bad incident on the most profitable 45 percent of margin hits earnings, reputation, and financing optics hardest.",
          },
        ],
      },
    },
  },
];

export const TOUR_DISAGREEMENTS: TourDisagreement[] = [
  {
    label: "Core move",
    rows: [
      { provider: "openai", stance: "Capped six-month trading-house pilot under escort; decline the NOC 12-month renewal as drafted" },
      { provider: "anthropic", stance: "Stay in-lane for the trading-house renewal only, with break triggers; don't sign the NOC unconditionally" },
      { provider: "gemini", stance: "Submit dual-option quotes (escorted Hormuz vs Cape) to pressure-test charterer demand before committing" },
      { provider: "xai", stance: "Run a hybrid this cycle — short/optional terms with written stop triggers; default to Cape where customers refuse optionality" },
    ],
  },
  {
    label: "What protects the downside",
    rows: [
      { provider: "openai", stance: "Automatic premium pass-through, advance funding, and objective Cape-switch / suspension / termination rights" },
      { provider: "anthropic", stance: "Defined break triggers (escort suspension, premium cap, casualty) plus contractual premium pass-through" },
      { provider: "gemini", stance: "Route-flexibility and mutual opt-out clauses; tighten convoy-delay demurrage from 72h to 24h" },
      { provider: "xai", stance: "Board-level written stop-trigger list with named authority to freeze fixtures within hours, not days" },
    ],
  },
];

export const TOUR_UNIFIED_BRIEF: TourUnifiedBrief = {
  title: "Meran Tankers — don't lock a full-term Hormuz-only renewal this cycle",
  summary:
    "All four models agree the commercial case for staying in-lane under escort is real but fragile: it rests on the ~5% war-risk premium holding and being passed through cleanly, neither of which is contractually secured mid-term, while a single casualty or detention would hit the most concentrated, highest-margin part of the book first. They diverge on structure — a capped trading-house pilot, break-trigger renewals, dual-route quotes, or a hybrid with written stop rules — but converge on not converting a provisional lean into a twelve-month obligation before optionality, customer weights, and abort authority are fixed.",
  recommendation:
    "Renew the trading-house charter in-lane only with defined break triggers (escort suspension, a premium ceiling as a percentage of hull value, insurer withdrawal, convoy casualty) and contractual premium pass-through; put a conditional-terms proposal to the NOC rather than pre-conceding its twelve-month, eight-lifting structure; and present both an escorted-Hormuz and a Cape/dual-route price to each renewing customer to test how much lane willingness is actually worth. Do not sign either renewal until legal completes the wartime addenda and the board fixes a written stop-trigger list with named authority to freeze new Hormuz fixtures within hours.",
  key_considerations: [
    "At ~5% of a ~$62M hull, each voyage carries ~$3.1M of war-risk premium against ~$1.4–1.7M of contribution before it — the case depends entirely on customers absorbing that, and goes negative if premiums reprice to 7–8% without pass-through.",
    "Six Gulf-facing charters share one chokepoint, one escort program, and one insurance market — roughly 45% of gross margin, and ~18% in the two renewals alone — so a single event hits the whole book at once, which per-voyage math doesn't price.",
    "The real risk budget is informal — zero crew deaths, short detention only — yet stop authority is discretionary and took ~48 hours after prior convoy-fire incidents; a written trigger list is missing.",
    "Crew consent is inferred from union silence rather than asked directly; a refusal wave after an incident could leave committed transits unmanned.",
    "Whether Cape routing actually costs preferred-bidder standing is an untested assumption, not a negotiated fact.",
  ],
  next_steps: [
    "Table a trading-house term sheet with break triggers and explicit war-risk premium pass-through this week.",
    "Put a conditional-terms proposal to the NOC before deciding to renew as drafted, split the book, or let it go.",
    "Present parallel escorted-Hormuz and Cape (or dual-route) quotes to both renewing customers and record how each weights lane willingness versus delivered cost.",
    "Complete legal review of refusal rights and wartime addenda before any signature.",
    "Adopt a board-level written stop-trigger list with named authority to freeze new Hormuz fixtures within hours.",
  ],
  contributions: [
    { provider: "anthropic", note: "Break-trigger renewal structure and premium pass-through as walk-away conditions" },
    { provider: "openai", note: "Capped, reversible trading-house pilot and conditional NOC terms" },
    { provider: "xai", note: "Board-level written stop triggers and a hybrid dual-route default" },
    { provider: "gemini", note: "Dual-option (Hormuz vs Cape) quotes to pressure-test charterer demand" },
  ],
};
