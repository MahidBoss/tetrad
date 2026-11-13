# TETRAD gate contract — deployment record

Status: **DEPLOYED** on NEAR testnet.

- Contract account: `mahidboss.testnet`
- Deploy transaction: `7nJttf1vEJX6bGS8NrW4bM8He1bSCuVc63efpiSAb2vS`
- Contract code hash: `GQRDCnvZ1tdKjysjZvNp2Gmco89MWRkASjyW4LgqLEsA`
- Source: `gate-contract.js` in this repo (near-sdk-js)
- Methods: `record_decision`, `decision_count`, `get_decisions`,
  `get_decision` (returns the latest record for an intent hash)

## How it was deployed (GitHub Codespaces, near-cli-rs)

1. `gate-contract.js` was copied to `src/contract.js` in a build
   workspace with this repo's `package.json` (near-sdk-js), then
   `npm install` and `npm run build` produced `build/contract.wasm`.
   (The root `package.json` build script performs the same copy via its
   `prebuild` step.)
2. The account `mahidboss.testnet` was created through the faucet
   service (`near account create-account sponsor-by-faucet-service
   mahidboss.testnet autogenerate-key-pair`) after an RPC check that
   the name was free.
3. `npx near-cli deploy mahidboss.testnet build/contract.wasm`
4. Smoke test before the page was wired: a `record_decision` round-trip
   (`decision_count` → 1, `get_decision` returned the record), with the
   same reads re-verified over public RPC from outside Codespaces.

## How the page uses it

- **Seal (Step 4):** after a swarm run, the page signs
  `record_decision` through NEAR Wallet Selector (Meteor Wallet /
  Meteor Wallet App, testnet) with the exact decision-record JSON the
  page displays, and links the NearBlocks testnet transaction.
- **Execute (Step 5):** the page re-reads `get_decision(intent_hash)`
  and proceeds only if the record says `APPROVED_4_OF_4`, was sealed by
  the connected wallet, and byte-matches the session's own record.

## Rules

- Testnet only. Mainnet appears only as the payout address.
- The contract stores decision records (hashes, verdicts, redacted
  intent) — never raw secrets, never document content.
