# Advisor Desktop, as an advisor sees it

**Reviewer persona:** lead advisor, independent SEC-registered RIA, CFP, 15 years. About 120 households, mostly $1–10M. One client-service associate, a part-time analyst. Daily tools: custodian portal, Redtail, Orion, Nitrogen, MoneyGuidePro, Outlook.
**Target:** https://workspace-advisor-desktop.joel-e-lewis.workers.dev, walked on 16 Oct 2026 at 1440 px with Playwright. I followed the README's eight steps as Adrian Hale. I then ran the annual review again in a fresh session, because my first script missed a link. I also viewed the app as Mark Davis and as Robert Johnson.
**Out of scope:** the visibility labels and the product vocabulary ("Take to", "binding", "reading", MAY / MAY NOT). Those are covered in `2026-10-15-advisor-clarity-critique.md`, and so is Robert's Moderate tolerance against the Growth model. I don't repeat them here.

---

## Before anything else

This was built by someone who has done the job, or who listened closely to someone who has. Some details I almost never see in a demo:
- wash-sale matching by taxpayer, with the IRA permanent-disallowance case;
- "Private Equity cannot be sold at market; it can only be reduced at the fund's periodic repurchase windows";
- a Coinbase feed that closes at "19:00 ET (midnight UTC)";
- a billing exception for a client whose agreement says "in arrears" while the custodian's file says "in advance".

I checked the numbers by hand where I could, and they tie:
- the 10,422 USD tax on v1 (net long-term gain of 43,788 at 23.8%);
- Robert's first RMD year, 2031;
- the Johnson tier breakdown, 124,250 USD;
- Dr. Pell's fee, 20,850 USD (20,000 + 850);
- the one-month VaR (1.645 × 14.1% ÷ √12 on 4.5M ≈ 300,664).

So my criticisms are of a serious product, not a toy.

---

## 1. More clever than clear

### The thread is the unit of work, and an advisor's unit of work is the household
Everything happens in a chat thread:
- the Brief's Intel finding is "carried by Adrian Hale" into *Johnson Rebalance Review*;
- proposals v1, v2 and v3 each post as messages;
- the approval sits in a side panel.

By v3, the thread holds four agent posts, two proposal embeds, a drift table and a workbench note. To know where the Johnsons actually stand, I have to read a conversation. In Orion I open the household and see it.

The Brief makes this worse at scale:
- **Needs a decision** lists three items. All three come from one account, *Robert Johnson Individual*.
- **Context** holds five more cards from that same account.

At 120 households, a feed of one card per finding is a firehose. I'd want a household-level queue first, with the thread one click under it.

### The left rail spends its space on agent permissions, not on my book
Under "AGENTS ON THIS DESK", eight agents each show two lines of what they may and may not do, on every screen. That is fine for an auditor once. Day to day it takes the space where my households, my tasks, or the five open compliance alerts should be.

The alerts are only on *Supervision*:
- "Large wire deposit — source-of-funds required · CRITICAL";
- "RMD calculation needed — Thompson Traditional IRA", raised 2 Feb.

None of them reaches my Brief.

### The guided story picks the weaker trade
The README path ticks **Harvest only: sell only lots at a loss**. Look at what that produces in *Proposal · v2*:
- It realizes −45,850 USD on top of the year's −32,750.
- It realizes zero gains, so "Net for the year −78,600".
- It leaves US Equity at **+8.8 pp, OUT** and Digital Assets at **+5.4 pp, OUT**.

The client carries a 78k loss he can use only $3k a year against income, and the account is still out of band. v1 was the better trade: it spent the harvested loss against SPY and crypto gains, put every sleeve back IN, and cost 10,422 USD in tax.

The revise dialog has the right control, **Cap realized gains**. Capping gains at the harvested loss is the trade I'd actually place. The demo shows off the constraint system with the constraint a CFP would least choose.

### Agent agenda ordering is a machine's order
Meeting Prep's agenda v1 opens with "Wash-sale windows: what not to buy back". Plan goals and the beneficiary mismatch come later.

I would never open an annual review with a list of things the client mustn't buy. "Ordered by what needs attention first" means attention by the system's severity, not the client's priorities.

### Concentration expressed as HHI
*Practice* shows "HHI of household shares 1,828" and "Effective number of households 5.47". The table right above it already says what I need: Chen-Wong is 26.8% of revenue and Johnson is 18.3%. The index is clever and adds nothing I'd act on.

### Every account against tolerance, one at a time
*Risk* scores each account against the client's tolerance:
- Robert Johnson Individual is "+34 pts above Moderate".
- Robert Johnson Traditional IRA is "−29 pts below Moderate".
- James Thompson's Traditional IRA and Inherited IRA are both 40+ points below.

That is not a risk problem. It is asset location, deliberately: equities in taxable, bonds in the IRA. Suitability is judged on the relationship, not on each account. The view flags 18 of 47 accounts, which teaches me to ignore it. It also leaves a regulator a list of 18 accounts my own system says are unsuitable (see §3).

---

## 2. Instantly useful: what I'd want on Monday

### 1. Meeting Prep plus cited Meeting Notes, filed as a record
This is the one I'd pay for. Prep pulled together:
- the household's drift;
- both wash-sale windows with their days left;
- the plan's probabilities, "Legacy / Estate 78.0%";
- held-away balances, with their as-of dates and "as reported by the client";
- "the beneficiary on Robert's Vanguard plan does not match the estate plan";
- the first RMD year, 2031.

That is 45 minutes of my associate's Tuesday.

The notes then split into Discussion, Decisions, Client requests and Follow-ups:
- Every line cites a transcript line (t-02, t-09/t-11…).
- Owners and due dates came straight from what was said. "By this Friday" became 27 Feb, and "Friday next week" became 6 Mar.
- The rules say "MAY NOT … add a recommendation nobody made".

That last rule is exactly what keeps me out of trouble. If this filed into Redtail as a note, with tasks, I'd switch note-taking tools tomorrow. I'd pay $100–150 a month per advisor for it on its own.

### 2. The tax-aware proposal and the workbench tax panel
Each leg shows ST, LT and washed amounts and "No buy-back to 27 Mar 2026". The panel nets the proposal against "Year-to-date realized −32,750 USD", and it says plainly what it excludes (§1211(b), §1212, state tax).

That is more honest than the "estimated tax impact" in most rebalancers I've used. The repurchase-restriction timeline, 21 Jan → 20 Feb → 22 Mar with "25 d left", is the clearest wash-sale display I've seen. And "iShares Core US Aggregate Bond ETF is bought here, so its loss cannot be harvested for thirty days" is the kind of warning that would have saved me a phone call to a client's CPA last year.

I'd switch from my current rebalancer if this worked at household level across the IRAs.

### 3. Reconciliation and billing exceptions, in plain sentences
Two examples:
- "Her advisory agreement bills in arrears; the custodian's fee file still lists her as billed in advance. Correct the custodian file before the April run."
- "The 2 January run's fee debit failed: not enough cash in the primary account. Retried and collected on 22 January."

Those are the two billing problems that actually bite an RIA. Seeing every custodian feed with its last sync ("MoneyGuidePro · PENDING … a delay on the provider's side") is what my operations person wants every morning.

**Honourable mention:** the Pell best-interest record. It considered "Balanced Growth" and "Staying self-directed · 0 USD a year", with the fee written out. That is the documentation an examiner asks for, generated at the moment I make the recommendation.

---

## 3. Where I would not trust it

### Numbers I'd double-check

- **The blotter and the holdings don't reconcile for 20 Feb.**
  - The blotter shows `ord-014 · Buy UST-10Y · 50,000 USD par · 47,600 USD · FILLED` in *Robert Johnson Individual*. That account's holdings list 11 positions and no Treasury.
  - Holdings show "SMH 20 Feb 2026 · 180 sh", the harvest replacement. The blotter has no SMH order.

  A tool that claims "every figure is derived from one mock book" can't have its own blotter and its own holdings disagree. That is the first thing I'd find, and I'd stop trusting the rest.

- **The open order the rebalancer ignored.** The blotter shows `ord-005 · WORKING · Buy QQQ 200 sh · 480.00 limit`, placed 24 Feb 16:35 in the same account. The rebalance was built against an account already +13.2 pp overweight in US Equity, and neither the Proposal Agent nor the Pre-trade Check mentions the working order. If it fills, the account moves further out. Real rebalancers net open orders or block on them.

- **The Brief recommends selling what we just bought.** After the fills, *Needs a decision* shows "iShares Core US Aggregate Bond ETF can be sold at a loss today … Washed · AGG −285". That finding is stamped 09:36, three minutes after v3's 490 AGG filled at 09:33, and after the Proposal Agent warned that the purchase blocks the harvest. The agents don't remember each other's work. A junior who did this would get a talking-to.

- **Staging Stryker shows no benefit.** The Pell v2 "Staged sale option" puts the same tax in each year: 57,284 in 2026 and 57,284 in 2027, both at "the top federal rate". Splitting a gain across two years matters only because of brackets: the 15%/20% line and the NIIT threshold. At a flat top rate, the table proves that staging is pointless, and Dr. Pell's CPA will say so. Either model her bracket or don't show the option.

- **Top marginal rate everywhere.** "Estimated at top federal marginal rates including the 3.8% net investment income tax" is defensible as a disclaimer. But for a 66-year-old retiree couple planning Roth conversions, the bracket *is* the analysis.

### Agent output I'd never send unedited

- **The recap went out as "agent draft, unedited".** The record says so. One click on **Send to Robert**, no edit, no second pair of eyes. The tool should push me to edit. Instead it records that I didn't, and lets it go.

- **It went to Robert only.** The recap says "Thank you both" and contains Patricia's own decision: "No trades in Patricia's accounts until her risk profile and models are reviewed". Yet the thread's "Who can see" lists Robert, Adrian, Sarah and Mark, and not Patricia. She is a client in her own right with her own accounts. Her suitability conversation goes to her husband's inbox, and she gets nothing.

- **The notes record a fact the book contradicts.** In the transcript (t-09), Adrian says "Patricia, your accounts sit well away from the models they are assigned to". The notes file it as reviewed. But:
  - *Risk* shows both her accounts WITHIN TOLERANCE: Roth 36 against her 35, Individual 33 against 35.
  - Meeting Prep named only "Johnson Family Trust and Robert Johnson Individual" as out of band.

  The notes agent cites the transcript faithfully and checks nothing against the data. Citing what was said isn't the same as being right.

- **The notes don't check what actually happened.** In my second session I held the review without placing the trade. The transcript still says "This morning we rebalanced Robert's individual account". The filed notes still say "Reviewed this morning's rebalance and the Intel harvest". On the same page, Meeting Prep said "No orders have been filled in the household's accounts today."

  The transcript is canned, so part of this is a demo limit. But nothing compared the notes against the blotter, and that is a product flaw.

- **The recap omits the dates the client cares about.** The follow-ups had them: "Roth conversion analysis · Mike Chen · due 6 Mar", "Contact the clients' CPA · due 27 Feb". The recap drops them. "Comparison to follow" with no date is what a client forwards to their CPA with a question mark.

- **Small, but a client would catch it.** "Reinvested dividends count as buying" Intel. Intel suspended its dividend in late 2024.

### Compliance and regulatory claims that seem off

- **Compliance pre-releases every trade.** "Only compliance releases, returns or escalates its orders." *Supervision* says "Orders appear here once an advisor approves a proposal."

  That is a broker-dealer model. At an RIA, the advisor or trader places discretionary trades within the IPS. Compliance does exception and post-trade surveillance under its written policies, plus pre-clearance of personal trades. A CCO gating every client rebalance would be the bottleneck of the firm, and in the demo Mark "released" a five-leg trade in two minutes with "the default compliance rationale". An examiner reads that as a rubber stamp, which is worse than having no gate.

  Meanwhile, client correspondence, the thing that does warrant review, is reviewed *after* sending ("CORRESPONDENCE TO REVIEW · Message to Robert Johnson · sent 25 Feb 15:21 ET"). The controls are the wrong way round.

- **The Risk view is a deficiency letter waiting to be written.** "Accounts above tolerance 8 of 47", "Accounts below tolerance 10 of 47", and Patel's custom mandate at "+45 pts above". If my own system shows 38% of accounts outside client tolerance, and the file shows no documented review of each, that is the first exhibit in a deficiency letter. Flag at household level, let me record "asset location" or "client-directed" as the reason, and keep the reason on file.

- **The rebalance came before the review.** The flagship story trades Robert's account at 07:13 toward a more aggressive model. At 14:00 the same day, the annual review discusses risk and Patricia's caution. With a review six hours away, any careful advisor waits, unless a tax deadline forces the trade, and here it doesn't: the loss was there all morning. The workflow puts the trade before the conversation that should inform it.

- **Overseas custodians.** UBS ("Zurich file"), DBS Singapore, HSBC Hong Kong and Coinbase all appear as custodians. A US RIA with discretion over accounts at foreign banks and a crypto custodian has custody-rule and qualified-custodian questions to answer. The demo doesn't need to answer them, but a CCO watching it will ask.

### Workflows that don't match how an RIA runs

- **Fills at exactly the proposal's prices.** The orders were staged pre-market at 07:13 and filled 09:30–09:34 at exactly the prices the proposal used: INTC 28.45, EFA 82.30. INTC also sold at 28.45 on 20 Feb. That's a demo limit, but I'd want to see the proposal prices labelled as the prior close.
- **No block trading or allocation.** Every order is one account's. Rebalancing 13 Growth accounts after a model change would mean 13 threads.
- **The prospect proposal stops at the transfer.** The letter to Dr. Pell says "about 95% … would be in US stocks … against 55% in the Growth model. Reaching the model would take sales, each a tax decision to make with your CPA."

  That is honest. But the first question every prospect with a 1.46M SPY position at a 446k gain asks is "what will it cost me to get to your portfolio, and over how long?" The proposal stages Stryker and says nothing about SPY.

---

## 4. Missing: what I'd ask for first in a real evaluation

1. **CRM sync, both ways.** There is no Redtail or Wealthbox among the Integrations; only custodians and MoneyGuidePro are listed. Notes, tasks with owners and due dates, and the "Referred by James Thompson" source all need to land in the CRM, or my associate types everything twice.
2. **Household-level rebalancing across account types.** The Johnsons have five managed accounts, including an IRA, a Roth and a revocable trust. Drift, harvest and asset location need to be solved together. The household is where the tool would earn its money.
3. **The book's alerts in the Brief.** The Johnson Trust's open "Single-name concentration — MSFT" alert (comp-002) was missing from the Johnson annual review prep. The 3-week-old Thompson RMD alert and the critical wire source-of-funds alert were missing from my morning. One inbox, please.
4. **RMD and cash management.** There's an RMD alert, but no RMD dashboard: amounts due, distributed year to date, withholding, and the QCD option. There's no cash-need forecasting for distributions and fee debits. The failed Martinez fee debit is precisely a cash-management miss.
5. **Billing exceptions beyond the schedule.** "Every household is billed on the firm's tiered schedule." In real life a third of my households have something different: a negotiated rate, excluded assets, family-linked householding, or a planning fee. I also need proration for mid-quarter deposits and withdrawals, and a first partial quarter for Dr. Pell. "An account counts only if it was open by the valuation date" means she rides free until July.
6. **Unanswered client messages.** In the client view, Robert's thread opens with his 07:01 question, "When is my annual review this year?". The first reply he sees is the recap, eight hours later and after the meeting. Nothing in my Brief flagged a client waiting.
7. **IRMAA and Social Security in Roth-conversion prep.** Robert is 67. A conversion conversation that doesn't mention Medicare IRMAA tiers is half a conversation.
8. **A risk questionnaire that separates tolerance from capacity.** Dr. Pell's "score 66" maps straight to Growth. Her time horizon, income need and the 900k 403(b) don't enter into it.

---

## Demo limits (fine) versus product flaws (not fine)

**Demo limits I don't hold against it:**
- 13 households and 47 accounts;
- a scripted transcript;
- a frozen clock and prices that never move;
- quarter-end values labelled MODELED;
- Mark released through a presenter shortcut, and says so;
- one advisor acting live.

**Product flaws I do hold against it:**
- blotter and holdings that disagree (UST-10Y, SMH);
- a rebalancer blind to a working order;
- a harvest suggestion that contradicts the trade three minutes earlier;
- a flat top tax rate on a bracket-management decision;
- notes that don't check what they record against the book;
- a household letter sent to one spouse;
- compliance placed in the trade path rather than the surveillance path;
- risk judged account by account.

---

## 5. Verdict

Yes, I'd take a second meeting, which I can't say about most of these demos. The meeting prep, the cited notes and the tax-aware workbench show someone who understands the work, and the honesty about estimates is better than the incumbents'. But I'd come with my CCO and a list. The product is accurate one account at a time, and loses the thread across accounts and across agents:
- the blotter disagrees with the holdings;
- the rebalancer ignores a working order;
- the Brief recommends selling what we bought three minutes earlier;
- the risk view flags asset location as unsuitability;
- the household letter goes to one spouse.

**The one change that would most raise my confidence:** make the household, not the account or the thread, the unit everything reconciles to. Prep, proposal, risk, notes and letters should all check against one household ledger that includes open orders and today's fills, and the agents should read each other's output before they speak.
