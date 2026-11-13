// TETRAD — gate contract for NEAR testnet (near-sdk-js)
// Seals the swarm's decision records on-chain: intent hashes, the four
// agents' verdicts and TEE tiers, and the consensus outcome.
// Stores ONLY the decision record JSON (hashes + verdicts + the
// Warden-redacted intent). Never store raw secrets or private data.
// Deploy guide: see DEPLOY.md in this folder.
import { NearBindgen, call, view, near } from "near-sdk-js";

@NearBindgen({})
class TetradGate {
  constructor() {
    this.decisions = []; // array of decision records (small scale, hackathon demo)
  }

  // Record one swarm decision.
  // args: { intent_hash, consensus, record_json }
  // intent_hash: 64-char lowercase hex SHA-256 of the canonical intent.
  // consensus: "APPROVED_4_OF_4" or "BLOCKED".
  // record_json: the page's decision-record JSON string (<= 8000 chars):
  //   per-agent model/verdict/TEE tier/completion id + redacted intent.
  @call({})
  record_decision({ intent_hash, consensus, record_json }) {
    if (!/^[0-9a-f]{64}$/.test(intent_hash || "")) throw new Error("intent_hash must be a SHA-256 hex string");
    if (consensus !== "APPROVED_4_OF_4" && consensus !== "BLOCKED") throw new Error("consensus must be APPROVED_4_OF_4 or BLOCKED");
    const rec = String(record_json || "");
    if (rec.length === 0 || rec.length > 8000) throw new Error("record_json must be 1..8000 chars");
    const record = {
      owner: near.predecessorAccountId(),
      intent_hash,
      consensus,
      record_json: rec,
      block_height: Number(near.blockHeight()),
      timestamp_ms: Number(near.blockTimestamp() / 1000000n),
    };
    this.decisions.push(record);
    near.log(`TETRAD DECISION ${consensus} ${intent_hash} by ${record.owner}`);
    return record;
  }

  @view({})
  decision_count() {
    return this.decisions.length;
  }

  @view({})
  get_decisions({ from_index = 0, limit = 20 } = {}) {
    return this.decisions.slice(from_index, from_index + limit);
  }

  // Latest decision recorded for an intent hash (or null).
  @view({})
  get_decision({ intent_hash }) {
    for (let i = this.decisions.length - 1; i >= 0; i--) {
      if (this.decisions[i].intent_hash === intent_hash) return this.decisions[i];
    }
    return null;
  }
}
