# TETRAD

**Four agents. Four tracks. One verdict. No trade without all four.**

TETRAD is a four-agent AI swarm that guards a NEAR testnet DeFi intent
before it is allowed to proceed. Four different AI models — each running
inside its own NEAR AI Cloud TEE — judge the same transaction intent in
parallel — two security checks, one DeFi risk check and one privacy
check; the four coordinating under a single consensus rule are the swarm:

| Agent | Track | Model | Job |
|---|---|---|---|
| **Auditor** | AI Security & Defense | z-ai/glm-5.3-flash | Contract facts from live chain state: does the target exist, does it have code, does its code hash match the canonical registry? |
| **Sentry** | AI Security & Defense | deepseek-ai/DeepSeek-V4.1-Flash-1017 (fallback: Qwen/Qwen3-VL-30B-A3B-Instruct) | Identity: exact canonical match vs lookalike / typosquat / unknown contract |
| **Actuary** | Unstoppable DeFi | Qwen/Qwen3.8-27B | Risk: judges the locally computed numbers (deposit vs balance) — it never invents numbers |
| **Warden** | Privacy & Private AI | Qwen/Qwen3.6-35B-A3B-FP8 | Privacy: scans the intent + memo for secrets/PII; the page redacts locally from a deterministic scan union the Warden's leak-type list |

**Disclosed fallback:** NEAR AI's per-model endpoints rate-limit under
load (HTTP 429/502). If — and only if — the Sentry's primary endpoint is
*unreachable* (no answer at all, after retries), the page runs that one
role on the equally TEE-verified Qwen3-VL-30B and marks the decision
record with `fallback_of`. A fallback never rescues a REJECT verdict or
a failed proof. This is not theory: gate-contract seals #2 and #3 were
both decided with the fallback live, and the records say so on-chain —
while seal #4 needed no fallback at all.

**Consensus is 4-of-4 APPROVE — and a verdict only counts when its TEE
proof verifies in the browser.** Every agent answer is checked against
NEAR AI Cloud's attestation evidence: signature kind must be
`provider_tee`, the signed text must equal the hash of this run's exact
request/response bytes, the signer must match the model's attestation
report, and the Ed25519 signature must verify in-browser. A gateway-only,
mismatched or unparseable answer is scored as a failure, never as an
approval. The gate fails safe — during development it blocked a good
trade twice (once on a model reply that was not strict JSON, once on an
empty reasoning-model reply) rather than wave it through.

The decision is then sealed on NEAR testnet in the TETRAD gate contract
(`record_decision`): intent hash, per-agent verdicts and TEE tiers, and
the locally redacted intent (deterministic scan + the Warden's leak
types; if the Warden is unavailable, the memo is withheld from the
record entirely rather than sealed unjudged).

## Try it (testnet, ~2 minutes)

Live demo: https://tetrad-5mr.pages.dev/
(mirror: https://mahidboss.github.io/tetrad/)

1. Click **SAFE preset** (wrap 0.1 NEAR on `wrap.testnet`) and
   **Build the evidence pack** — live testnet RPC state, no key needed.
2. Paste a NEAR AI API key (free $10 credit key from the
   [NEAR Builders dashboard](https://nearbuilders.org/dashboard)).
   The key stays in the tab and is only ever sent to cloud-api.near.ai.
3. **Run the TETRAD swarm** — expect 4/4 TEE-verified APPROVE.
4. Click **POISONED preset** (lookalike `wrapp.testnet` — an account with
   no contract code — an oversized 9.9 NEAR deposit, and a memo leaking an
   email + phone number), rebuild the evidence, run again — expect the
   swarm to BLOCK it.
5. Back on a SAFE 4/4 run: connect a testnet wallet, **Seal** the decision
   in the gate contract, then **Execute** — the page re-reads the on-chain
   record and the wallet signs the wrap.

## How it works

1. **Intent + evidence pack.** The page builds the pack from live NEAR
   testnet RPC (`view_account` for the target and the user): existence,
   code hash, canonical-registry match, edit distance to the nearest
   canonical name, balance, and the deposit's share of the balance —
   all numbers computed locally and shown to the user before any agent runs.
2. **Parallel TEE judging.** Four NEAR AI Cloud calls (different models,
   role-specific prompts, strict-JSON verdicts) run in parallel.
3. **In-browser proof verification**: preflight attestation report →
   `sha256(request) : sha256(response)` signed-text match → signer match
   → Ed25519 verify (WebCrypto / tweetnacl fallback for Chrome).
4. **Consensus + seal.** 4/4 verified approvals produce an
   `APPROVED_4_OF_4` decision record; anything else is `BLOCKED`.
   The record is sealed via the gate contract on testnet
   (`mahidboss.testnet`), and a lookup lets anyone re-read the
   recorded decision for an intent hash.
5. **Execute.** The Execute step never trusts the page's memory: it
   re-reads the decision from the gate contract and proceeds only if the
   on-chain record says `APPROVED_4_OF_4`, was sealed by the connected
   wallet itself, and exactly matches the record this session produced;
   then the connected wallet signs the intent's call itself. Wired for
   the canonical wrap intent (wrap.testnet · near_deposit). The full
   loop — run → seal → execute — has been completed on testnet,
   including a clean run where the judged account, the sealing account
   and the executing account are the same wallet (cheapxml5039.testnet —
   the demo wallet used for these live runs; its redacted tag in the
   records is the first 16 hex characters of the sha256 of its name).
   Two 0.1 NEAR wraps executed in total (0.19875 wNEAR balance after the
   wrap contract's standard one-time 0.00125 NEAR storage fee); the gate
   contract held 4 sealed decisions at the time of writing, all publicly
   readable (the page's lookup shows the latest record per intent hash;
   the full history is in the contract's `get_decisions`).

## The gate test (why these four models)

NEAR AI Cloud lists 60+ models, but most return **gateway-only**
signatures — proof the gateway handled the request, not that the model
ran in a TEE. TETRAD's swarm only accepts models that pass a public,
reproducible gate test (`model-test.html` / `model-test2.html` /
`model-test3.html` in this repo): provider_tee signature + all
in-browser checks green. (The test pages judge a fixed sample intent
and verify proof capability only — they do not test judgement quality.)

- ✅ **In the swarm:** z-ai/glm-5.3-flash, deepseek-ai/DeepSeek-V4.1-Flash-1017,
  Qwen/Qwen3.8-27B, Qwen/Qwen3.6-35B-A3B-FP8
- 🛟 **Backup pool (gate test v3):** Qwen/Qwen3-VL-30B-A3B-Instruct ✅
  (wired as the Sentry fallback), Qwen/Qwen3.8-27B-abliterated ✅
- ❌ **Tested and dropped (gateway-only / attestation unavailable):**
  deepseek/deepseek-v3.2, moonshotai/kimi-k2.6, moonshotai/kimi-k3,
  z-ai/glm-5.3, google/gemini-2.5-flash, openai/gpt-5-mini,
  deepseek/deepseek-v4.1-flash-1017 (alt route — gateway-only)

## Honest limits

- **Testnet only.** No mainnet funds are involved anywhere in the demo.
- The gate guards this page's verdict/execution path; it cannot stop a
  wallet used elsewhere.
- Agent verdicts are LLM judgements over the evidence pack, not formal
  verification of contract code.
- Wallet execution unlocks only after the page re-reads an
  on-chain `APPROVED_4_OF_4` record for the exact intent hash, and is
  wired only for the canonical wrap intent (wrap.testnet ·
  near_deposit) — other targets are record-only. Execution signs from
  the connected wallet, which must be the same wallet that sealed the
  record; the record must also byte-match the session's own verified
  record, so a forged or overwritten record moves nothing here.
- The gate contract is a passive record book — anyone can write a record
  to it. A record's credibility comes from its contents, not the
  contract: it carries each agent's completion ID and proof tier so the
  run can be cross-checked, and this page only seals runs it verified
  in-browser.
- This page verifies signatures against NEAR AI's provider-served
  attestation report; it does not itself verify the TDX quote — full
  quote verification runs in NEAR's Verification Center. The sealed
  record carries verdicts, tiers and completion IDs, not the signatures
  themselves, so a run's proofs cannot be re-verified from the chain
  alone after the fact.
- The intent and memo are sent to the four NEAR AI Cloud models (inside
  their TEEs) for judging; redaction protects what is sealed on-chain.
  Deterministic local checks back the models up: a local leak scan plus
  hard vetoes (target missing or codeless, deposit above balance, a
  secret in the memo) block a run even on a 4/4 agent APPROVE.
- The canonical registry is a small hand-maintained list inside the
  page (two contracts); contracts outside it are judged unknown.
- Only the Sentry has a fallback model; if another agent's endpoint is
  unreachable, the run blocks rather than proceeds short-handed.

## Tracks

AI Swarms · AI Security & Defense · Privacy & Private AI · Unstoppable DeFi

## Builder

Built by Mahid (GitHub [@MahidBoss](https://github.com/MahidBoss)) for
the NEAR Hackathon. Payout wallet: warmrobe4750.near.
