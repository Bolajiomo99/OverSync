# OverSync

**OverSync** is a non-custodial cross-chain bridge between Ethereum and
Stellar, built around symmetric hash + time-lock contracts (HTLCs) on
both chains.

> **v2 rebuild in progress.** This repository is in the middle of a
> ground-up rebuild driven by v1 review feedback. See
> [`ARCHITECTURE.md`](ARCHITECTURE.md) for the target design and the
> per-component README files (`soroban/`, `contracts/`, `coordinator/`,
> `resolver/`, `packages/sdk/`) for what currently ships. The legacy
> v1 code remains in `relayer/`, `stellar/`, and `frontend/` until the
> v2 modules reach feature parity.

## Where v2 runs today

v2 is **live on testnet** (Sepolia + Stellar testnet). v2 mainnet
deployment is gated on a clean third-party audit and scheduled for **Q1
2027** ([see ROADMAP](ROADMAP.md)). The mainnet bridge today continues
to run the **v1 single-relayer stack** so existing users have a working
path while the v2 contracts mature. The frontend surfaces this clearly:
selecting mainnet shows a banner explaining the v1 trust model and a
one-click switch to the v2 testnet experience.

Deployed v2 contracts (testnet):

- EVM HTLCEscrow: [`0xb352339BEb146f2699d28D736700B953988bB178`](https://sepolia.etherscan.io/address/0xb352339BEb146f2699d28D736700B953988bB178)
- EVM ResolverRegistry: [`0x7D9ce70Aa40E144E8BbE266a0dc3b3F91B6D1D99`](https://sepolia.etherscan.io/address/0x7D9ce70Aa40E144E8BbE266a0dc3b3F91B6D1D99)
- Soroban HTLC: [`CDIKSJKVMXKGBRD3BBEBMF7Q4GQJ52ECU6R6G5HEKXKXVGGWK2CTA6JK`](https://stellar.expert/explorer/testnet/contract/CDIKSJKVMXKGBRD3BBEBMF7Q4GQJ52ECU6R6G5HEKXKXVGGWK2CTA6JK)
- Soroban ResolverRegistry: [`CBSR7Z4MHLPMLFFM5K3PK3YLZAVCOMJ4KPVRWO4VPL3FF64MSTIZ4WGF`](https://stellar.expert/explorer/testnet/contract/CBSR7Z4MHLPMLFFM5K3PK3YLZAVCOMJ4KPVRWO4VPL3FF64MSTIZ4WGF)

## What's new in v2

| Concern | v1 | v2 |
|---|---|---|
| Stellar HTLC | Claimable balance with unconditional claimants — coordinator-custodial | [Soroban HTLC contract](soroban/contracts/htlc/src/lib.rs) — sha256 hashlock + timelock, non-custodial |
| Ethereum HTLC | Three overlapping contracts (`HTLCBridge`, `MainnetHTLC`, `EscrowFactory`); resolver allowlist not enforced | One canonical [`HTLCEscrow`](contracts/contracts/v2/HTLCEscrow.sol) + [`ResolverRegistry`](contracts/contracts/v2/ResolverRegistry.sol) |
| Operator model | Single relayer with hot keys for both chains | Open [`ResolverRegistry`](docs/RESOLVERS.md) with stake + slash; community resolvers welcome |
| Refunds | Mocked in code; refund address was the relayer's | Permissionless on-chain refund; funds always return to the user |
| Order persistence | In-memory `Map`, lost on restart | SQLite-backed coordinator with state machine |
| Frontend history | Hard-coded mock entries + fake hash fallback | Real coordinator API + on-chain events only ([details](docs/TRUST_MODEL.md)) |
| Tests | Ad-hoc | 10 Soroban + 21 Solidity + 8 SDK + 4 coordinator unit tests, plus GitHub Actions CI |

## Repository layout

```
OverSync-1nchFusion/
├── soroban/                      # NEW Rust workspace
│   ├── contracts/htlc/           # OverSync HTLC for Stellar
│   ├── contracts/resolver-registry/
│   └── README.md
├── contracts/                    # Solidity (Hardhat)
│   └── contracts/v2/             # NEW canonical HTLCEscrow + ResolverRegistry
├── packages/sdk/                 # NEW @oversync/sdk (TypeScript)
├── coordinator/                  # NEW v2 coordinator (replaces relayer/)
├── resolver/                     # NEW open-source resolver runner + Docker
├── relayer/                      # v1 relayer (deprecated, scheduled for removal)
├── frontend/                     # React dApp (RefundDialog added in v2)
├── docs/                         # Trust model, security, deploy, resolvers
└── .github/workflows/            # CI for TS + Rust + Solidity
```

## Quick start

```bash
git clone https://github.com/karagozemin/OverSync-1nchFusion
cd OverSync-1nchFusion
pnpm install
cp env.example .env

# Build SDK
pnpm --filter @oversync/sdk build

# Compile + test Solidity v2 contracts
pnpm --filter @oversync/contracts compile
pnpm --filter @oversync/contracts exec hardhat test test/v2

# Build + test Soroban contracts
cd soroban && cargo test --release && cd ..

# Run coordinator (Node 22.5+ required for built-in node:sqlite)
pnpm --filter @oversync/coordinator dev

# Run frontend
pnpm --filter @oversync/frontend dev
```

## Trust model in one paragraph

User funds are locked in HTLC contracts on both chains. Each lock has a
`hashlock` and a `timelock`. The locked funds can only be moved by:

1. Anyone (typically the beneficiary or a relayer) revealing a preimage
   whose digest matches `hashlock`, before `timelock`.
2. Anyone (typically the user) calling `refund` after `timelock`. The
   funds return to the original `refundAddress` — which is **always the
   user** in OverSync v2.

The coordinator never signs a transaction that could move user funds
without one of these conditions being satisfied. Resolvers stake into
the on-chain `ResolverRegistry`; misbehaviour is slashed. See
[`docs/TRUST_MODEL.md`](docs/TRUST_MODEL.md) for the full threat model.

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — full technical architecture (sequence diagrams, invariants, failure catalogue)
- [`ROADMAP.md`](ROADMAP.md) — milestone-by-milestone delivery plan with verifiable artefacts
- [`docs/TRUST_MODEL.md`](docs/TRUST_MODEL.md) — non-custodial proofs
- [`docs/DIFFERENTIATION.md`](docs/DIFFERENTIATION.md) — comparison with CCTP v2, Axelar ITS, Allbridge
- [`docs/TRACTION.md`](docs/TRACTION.md) — go-to-market, KPIs we publish, partnership pipeline
- [`docs/RESOLVERS.md`](docs/RESOLVERS.md) — run your own resolver
- [`docs/SECURITY.md`](docs/SECURITY.md) — threat model, audit prep, bug bounty
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — testnet + mainnet deployment

## License

MIT. See [`LICENSE`](LICENSE).
