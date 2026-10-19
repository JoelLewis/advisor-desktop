# Advisor clarity critique (impeccable:critique, second pass)

**Target:** `workspace` @e932a0b, the preview at https://workspace-advisor-desktop.joel-e-lewis.workers.dev
**Date:** 15 October 2026
**Focus:**
- Is the interface clear to a working advisor?
- Is who-sees-what (me, the firm, the client, the prospect) clear, or is it a clever concept?
- Is the language well judged for a public demo of a fictional RIA?

**Method:**
- I walked the preview at 1440 px as Adrian Hale, then as Robert Johnson.
- A separate pass captured the visible text of 59 screens and states, covering the README path and every View-as. That inventory, with the glossary and file:line references, is in `2026-10-15-language-findings.md`.

---

## Anti-patterns verdict: PASS

Nothing here reads as AI-generated:
- no gradients, glass, card grids or glowing dark mode;
- no generic type;
- colour is used only for status.

The risk is the opposite one. The interface is so individual that an advisor has to learn its private language before they can use it. "Clever concept" is the right worry. The look is not the cause; the words and the visibility system are.

## Overall impression

The practice content is strong. These read like someone who has done the job:
- the wash-sale handling;
- the rollover caution;
- the cited meeting notes;
- the Billing and Reconciliation methods;
- the onboarding checklist;
- the best-interest alternatives.

What makes it feel like a concept is the layer on top:
- an invented vocabulary: *Take to, carried, reading, binding act, moved book, full views, MAY / MAY NOT, desk, fingerprint*;
- a visibility system an advisor has to decode;
- a few places where the demo's honesty slips.

**The single biggest opportunity:** say who can see each thing in plain words, the same way everywhere, and make it unmissable at the one moment it matters, which is when the advisor is writing something a client will read.

## What's working

1. **The "Who can see" list in the context column.** "Robert Johnson · Client, Adrian Hale · Advisor, Sarah Mitchell · Client service, Mark Davis · Compliance (supervision)" is the clearest visibility statement in the product. It needs no learning and names real people. It just sits in the wrong place: the far right, at the same weight as everything else.
2. **Refusals and empty states that explain themselves.** Examples:
   - "You can read this thread but not post in it."
   - "File the record of the Johnson annual review first."
   - "Dr. Amanda Pell can't see Supervision; showing the workspace."

   They are human, specific, and tell you what to do next.
3. **The presenter shortcut's honesty.** "Demo · act as Mark Davis … marked as made through this shortcut" carries all the way into the record and the Archive. It is the model for every other demo device.

## Priority issues

### 1. Who-sees-what has three vocabularies and one quiet signal

**What.** The same fact is said several ways:

| Where | "Only me" | "The firm" | "The client" |
|---|---|---|---|
| Thread-list group headings | PRIVATE | INTERNAL | CLIENTS AND PROSPECTS |
| Legend | Only you | Firm only | Shared with the client or prospect |
| Thread band | Only you | Firm only · client can't see | CLIENT CAN SEE / PROSPECT CAN SEE |
| Client's own view | (n/a) | (n/a) | Shared with you and your advisor |

The visual signal is a 2 px rule pattern: dashed, hatched or solid. An advisor has to learn it from a legend. In a client thread the only cue that Robert will read what you write is that thin solid line and a small-caps "CLIENT CAN SEE" label. The composer then says "Write a draft for Robert", which is the right instinct, but it is grey placeholder text.

**Why it matters.** The worst error an advisor can make here is writing a firm-only thought where a client can read it. Nothing about this design is hard to use, yet that moment carries the least weight on the page. The hatch-and-dash system is elegant, but it is something to learn rather than something to read. That is the "clever concept" feeling in one place.

**Fix.**
- **One vocabulary, named people, everywhere.**
  - Thread groups: **Just me · Larkfield team · Client conversations**, with prospects inside client conversations.
  - Band: **"Just you"**, **"Larkfield team — Robert can't see this"**, **"Robert Johnson can read this"**. Use the name, never "the client".
  - Drop the PRIVATE/INTERNAL headings or rename them to match.
- **Make the client moment loud.**
  - In a client-visible thread, the composer's frame, label and button all say it: label "Message to Robert Johnson", button "Send to Robert".
  - Give the band a filled tint, not only a 2 px line.
  - Internal threads keep "Post to the team".
- **Keep the patterns as a secondary cue**, beside words, not instead of them. The legend can go once the words carry the meaning.
- **Lift the "Who can see" list to the top of the thread**, as a one-line roster under the title. It is the clearest thing you have.

**Command:** `/clarify`, then `/bolder` (the client-visible composer)

### 2. The client-side visibility line is not honest

**What.** Robert is told his thread is "Shared with you and your advisor". His "Who can see" list shows Robert, Adrian and Sarah, and omits Mark Davis (compliance). Yet compliance reviews every sent client message. That is the whole Phase 4 correspondence review.

**Why it matters.** This is a fiduciary firm's demo. A CCO judge will notice that the client is told less than the truth about who reads their messages. Real firms say so plainly; it is a disclosure point, not a secret.

**Fix.** Client and prospect side: **"You and the Larkfield team. Messages are kept and reviewed by compliance, as the law requires."** Put compliance in the client's "Who can see" list as "Larkfield compliance (review)".

**Command:** `/clarify`

### 3. Invented vocabulary an advisor has to decode

**What.** The terms come from the system's model rather than from practice:

| Now | An advisor would say |
|---|---|
| Take to ▾ / carried by | Share to ▾ / shared by |
| Binding acts | Audit trail (or Records) |
| Reading (a figure with its label) | (nothing; just the figure and label) |
| Thread context | Details |
| Full views | Related records |
| Desk / Reference | Firm / Reports |
| MAY / MAY NOT | Can / Can't |
| moved book, the engine | updated holdings, (nothing) |
| fingerprint, REC-0004 | in an "Audit details" disclosure, not in the main line |

The worst is **"binding"**. It is applied to:
- a disclosure delivery;
- a sent letter;
- Dr. Pell's "I'd like to go ahead". Her advisory agreement is still unsigned at that point.

**Why it matters.** Each term costs a judge a moment of decoding. The sum is the "concept" feeling. "Binding" is also wrong in a way a compliance reader will flag: a prospect's chat message is not a binding acceptance.

**Fix.**
- Make the swaps above.
- Retire "binding". Every act is a **record**. Approval and Release keep their names as sign-offs.
- Her step reads "Proposal accepted (agreement awaiting signature)".
- Fingerprints and IDs move into an "Audit details" disclosure on the record slip. They are never shown to prospects.

**Command:** `/clarify`

### 4. The story contradicts its own suitability check

**What.**
- Robert's risk profile is Moderate (55).
- Book risk flags his individual account well above tolerance.
- The proposal rebalances it toward Growth, a model that is itself above his tolerance band. No agent, pre-trade check or best-interest line says so.

**Why it matters.** It is the demo's flagship flow. The first thing a CFP or CCO checks in a rebalance is whether the target model fits the client. Here the product's own Risk view says it doesn't, and the proposal is silent.

**Fix.** Choose one:
- **(a) Change the seed** so acc-002 sits on a model inside Robert's band. For example, Balanced Growth, with the drift story kept.
- **(b) Make it a feature.** The Pre-trade Check or Proposal Agent flags "Growth sits above Robert's Moderate tolerance; the IPS allows it for this account because…". Record the reason in the approval.

Option (b) shows the product catching something, which is the stronger demo.

**Command:** `/clarify` (content) — engine work, not styling

### 5. The client-facing letters read like a system wrote them

**What.**
- The recap opens "Dear Robert, Thank you both…". It is addressed to one spouse but thanks two.
- It says "You will not buy Intel…" as an order.
- It uses passives like "comparison to follow".
- The Pell proposal letter opens "This is our proposal."

**Why it matters.** These are the only words a client ever reads. Judges will read them as the firm's voice. They are accurate but cold, and they undercut a product whose pitch is a better advisor experience.

**Fix.**
- "Dear Robert and Patricia".
- "Please don't buy Intel shares in any of your accounts until 27 March."
- "We'll model Roth conversion amounts and share them with your CPA."
- Pell: open with her goals and her concern about the Stryker position, then the proposal.

Keep every compliance-required phrase, but put each one in a sentence a person would write.

**Command:** `/clarify`

## Minor observations

- **The header names the product, not the person.** "ADVISOR DESKTOP" stays the title when viewing as Robert. His screen should read "Larkfield Advisory". "CLIENT CAN SEE" shown to the client himself refers to him in the third person.
- **The home steps are insider shorthand.** "Take the Intel finding to the team thread, ask the Proposal Agent, revise to harvest only, exclude QAI in the workbench, approve v3" asks a newcomer to know QAI and v3. Say why each step matters first, then the click: "Turn the Intel tax loss into a trade proposal…".
- **The demo devices are labelled three ways.** "Demo · act as…", "Advance to her reply · Thu 26 Feb 09:10 ET" and the CLOCK pane. Use "Demo ·" everywhere. Once the clock has moved, the home line "the date is frozen at 25 Feb 2026" is false. Say "starts at 25 Feb 2026; the presenter can move it forward".
- **The wash-sale window has several names:** "No buy-back to", "repurchase restrictions", "window closes", "open through". Use one: "Don't repurchase until 27 Mar 2026". Rename the pane "Wash-sale taxpayer" to "Wash-sale restrictions".
- **"Staged" means two things:** orders awaiting release, and the phased Stryker sale. Use "Pending compliance release" and "Phased sale over two tax years".
- **Guardrail contortions leak into copy.** The digit-free rule produces "in the year the citation states" and "the value the engine states". Let the claim name the figure by reference ("in 2031, at age 73"), with the figure rendered by the kit. The rule's purpose is no hand-typed numbers, not no numbers.
- **Small wording fixes:**
  - "pooled-vehicle limit" → "single-fund limit"
  - "Disposed today" → "Closed today"
  - Agenda "Drop" → "Remove"
  - Key sheet "Main" → "Conversation"

## Questions to consider

- **The 10-second test.** If an advisor sat down cold, could they say in ten seconds who will read the next thing they type? Today they couldn't. That test is the whole visibility design.
- **Do the patterns need to exist at all** once the words are there? Or are they decoration the concept wanted?
- **What would the demo lose by dropping "binding", "carry" and "reading" entirely?** Probably nothing.
- **Should the flagship story show the product catching a suitability problem**, rather than quietly containing one?
- **Is "Advisor Desktop" the right name** for a product whose point is that the client, compliance and the team share it?

## Suggested order

1. **`/clarify`: who sees what.** One vocabulary with named people, honest client-side wording that includes compliance, a loud client-visible composer, and the roster at the top of the thread. These are issues 1 and 2.
2. **`/clarify`: vocabulary.** Retire "binding"; swap the system nouns; move audit details into a disclosure. This is issue 3.
3. **Content.** Resolve the suitability contradiction, preferably by having the product flag it (issue 4), and rewrite the two letters (issue 5).
4. **The minors**, in one copy pass.
