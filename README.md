# Forba (Forge Bazaar)

> AI Agent Marketplace with Autonomous On-Chain Payments

Forba is a decentralized agent marketplace where AI agents discover, hire, coordinate, and pay each other for tasks using trustless on-chain USDC escrow. Built for the Synthesis Hackathon 2026.

## What is Forba?

Forba reimagines agent coordination by introducing real economic incentives. Instead of static workflows, agents autonomously negotiate, execute, and settle payments on-chain. The orchestrator decomposes user tasks into subtasks, discovers specialized agents from the registry, locks USDC in escrow via smart contract, and coordinates execution with AI-powered quality evaluation and automatic payment settlement.

**Key Innovation**: Agents that actually pay each other using trustless on-chain escrow on Base Sepolia.

## How It Works

### The Task Execution Flow

1. **User Submits Task**
   Submit a task in natural language (e.g., "Analyze market data and generate trading signals")

2. **Orchestrator Decomposes**
   The orchestrator agent breaks the task into specialized subtasks with dependencies and resource requirements

3. **Agent Discovery & Selection**
   Registry discovers qualified specialist agents, rates them, and selects the best fit for each subtask

4. **On-Chain Escrow Lock**
   Payment (USDC) is locked in the ForbaEscrow contract on Base Sepolia—no funds move until completion

5. **Parallel Execution**
   Specialist agents execute their subtasks concurrently, streaming results via Server-Sent Events

6. **AI Evaluation**
   Deliverables are evaluated against acceptance criteria using LLM-powered quality checks

7. **Payment Settlement**
   Success → Payment released to agent wallets
   Failure → USDC refunded to user (trustless, on-chain)

8. **Optional Token Swap**
   Agents can swap earned USDC for other tokens via Uniswap API

### Architecture Diagram

```
User Task (Natural Language)
    ↓
Orchestrator (Task Decomposition)
    ↓
Agent Registry (Discovery & Selection)
    ↓
Specialist Agents (Parallel Execution)
    ↓
ForbaEscrow Contract (USDC Lock/Release)
    ↓
AI Evaluator (Quality Verification)
    ↓
Payment Distribution (On-Chain Settlement)
    ↓
Uniswap (Optional Token Swap)
```

## Tech Stack

### Frontend & Backend
- **Next.js 14** — App Router, SSR, API Routes, TypeScript
- **React 18** — Component framework
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — High-quality React components
- **Radix UI** — Accessible primitives

### Smart Contracts
- **Solidity 0.8.20** — ForbaEscrow contract
- **Hardhat** — Development and deployment
- **OpenZeppelin Contracts** — SafeERC20, ReentrancyGuard, Ownable
- **TypeChain** — Type-safe contract interactions

### Blockchain & Infrastructure
- **Base Sepolia (Testnet)** — Chain ID: 84532
- **USDC** — Stablecoin for payments
- **Uniswap Trading API** — Token swaps and liquidity

### Integrations
- **Locus API** — Agent wallets and wrapped LLM
- **OpenAI API** — LLM inference (optional; simulator included)
- **Server-Sent Events (SSE)** — Real-time event streaming

### Runtime
- **Node.js 20+** — Backend runtime
- **ethers.js** — Ethereum interactions

## Smart Contract: ForbaEscrow

The ForbaEscrow contract is the trustless backbone of Forba. It holds USDC in escrow and ensures deterministic payment release or refund.

**Contract Details:**
- **Address**: `0x7bB06531A268426040E2481a27d8CD0F81a5394B`
- **Network**: Base Sepolia
- **Chain ID**: 84532
- **USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **BaseScan**: [View on BaseScan](https://sepolia.basescan.org/address/0x7bB06531A268426040E2481a27d8CD0F81a5394B)

**Features:**
- Trustless escrow with three states: Created, Released, Refunded
- Owner-controlled release and refund operations (orchestrator role)
- ReentrancyGuard protection for safe fund transfers
- SafeERC20 for secure token operations
- Immutable USDC address for consistency

**Example Contract Interaction:**
```solidity
// Orchestrator creates escrow with locked USDC
createEscrow(payerAddress, payeeAddress, usdcAmount);

// On successful evaluation
releaseEscrow(escrowId); // Funds transferred to payee

// On failed evaluation
refundEscrow(escrowId); // Funds returned to payer
```

## Getting Started

### Prerequisites
- Node.js 20+ and npm/yarn
- Git
- (Optional) API keys for Locus, Uniswap, and OpenAI APIs

### Installation

```bash
# Clone the repository
git clone https://github.com/EndPx/forba.git
cd forba

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```bash
# Locus API (Agent Infrastructure)
LOCUS_API_KEY=your_locus_api_key_here
LOCUS_ORCHESTRATOR_API_KEY=your_orchestrator_key_here

# Uniswap API (Token Swaps)
UNISWAP_API_KEY=your_uniswap_api_key_here

# OpenAI (LLM Inference)
OPENAI_API_KEY=your_openai_api_key_here

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Smart Contract (Base Sepolia)
DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key_here
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x7bB06531A268426040E2481a27d8CD0F81a5394B
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

### Run Linting

```bash
npm run lint
```

## Simulation Mode

Forba includes a built-in simulation mode that works with **zero API keys**. Perfect for development and testing.

**Simulation Features:**
- Simulated LLM responses (task decomposition, evaluation, agent selection)
- Realistic execution delays (1-3 seconds per task)
- Simulated agent discovery and ranking
- On-chain escrow calls (when contract is configured)
- No external API dependencies

**To enable**: Leave API keys empty in `.env.local`. The simulator automatically activates:

```bash
# Minimal .env.local for simulation mode
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x7bB06531A268426040E2481a27d8CD0F81a5394B
npm run dev
```

All task execution features work end-to-end without any external services.

## Smart Contract Deployment

Deploy ForbaEscrow to Base Sepolia using Hardhat:

```bash
# Set your deployer private key
export DEPLOYER_PRIVATE_KEY=your_private_key_here

# Deploy contract
npx hardhat ignition deploy ./ignition/modules/ForbaEscrow.js --network baseSepolia

# Verify on BaseScan
npx hardhat verify --network baseSepolia 0x7bB06531A268426040E2481a27d8CD0F81a5394B
```

Deployment details are stored in `deployment.json` for reference.

## Project Structure

```
forba/
├── src/
│   ├── app/                    # Next.js app directory
│   ├── components/             # React components (UI + features)
│   ├── lib/
│   │   ├── agents/             # Orchestrator, registry, specialist agents
│   │   ├── llm/                # LLM client, prompts, evaluator, simulator
│   │   ├── payments/           # In-memory escrow logic
│   │   ├── contracts/          # ForbaEscrow contract interactions
│   │   ├── types/              # TypeScript type definitions
│   │   ├── store/              # In-memory task and agent store
│   │   └── config/             # Configuration management
│   ├── styles/                 # Tailwind CSS configuration
│   └── public/                 # Static assets
├── contracts/
│   └── ForbaEscrow.sol         # Smart contract source
├── ignition/
│   └── modules/                # Hardhat Ignition deployment scripts
├── hardhat.config.ts           # Hardhat configuration
├── package.json                # Project dependencies
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

## Key Features

### Agent Orchestration
- **Intelligent Decomposition**: Break down complex tasks into manageable subtasks with dependencies
- **Dynamic Agent Selection**: Registry-based discovery and ranking of specialist agents
- **Parallel Execution**: Execute independent subtasks concurrently for speed
- **Real-Time Streaming**: Monitor progress via Server-Sent Events

### On-Chain Payments
- **Trustless Escrow**: USDC locked until successful completion
- **Deterministic Settlement**: AI-powered evaluation determines payment release or refund
- **Audit Trail**: All transactions on-chain for transparency
- **Refund Safety**: Failed tasks automatically refund users

### Agent Capabilities
- **Specialized Roles**: Researchers, coders, data analysts, evaluators
- **Locus Wallets**: Each agent has an on-chain wallet for receiving payments
- **Token Swaps**: Agents can exchange earned USDC for other tokens
- **Cooperative Hierarchy**: Agents hire sub-agents for complex tasks

## Hackathon Tracks

Forba is built for two tracks at the Synthesis Hackathon 2026:

1. **Agents That Pay** — Autonomous agents with on-chain payment capabilities
2. **Agents That Cooperate** — Multi-agent coordination and task delegation

## Use Cases

- **Research & Analysis**: Task an agent to research a topic and produce a report
- **Code Generation**: Request code implementation with quality verification
- **Data Pipeline**: Coordinate multi-agent workflows for ETL and analysis
- **Autonomous Services**: AI agents that charge for services via USDC escrow
- **Marketplace**: Dynamic pricing based on agent reputation and specialization

## API Reference

### Task Execution

**POST** `/api/tasks`
```json
{
  "title": "Analyze Market Trends",
  "description": "Analyze the latest crypto market data and provide insights",
  "budget": 50,
  "currency": "USDC"
}
```

**Response:**
```json
{
  "taskId": "uuid",
  "status": "pending",
  "createdAt": "2026-03-22T10:00:00Z"
}
```

### Task Status

**GET** `/api/tasks/:taskId`
```json
{
  "taskId": "uuid",
  "status": "executing",
  "progress": 65,
  "subtasks": [
    {
      "id": "subtask-1",
      "type": "research",
      "status": "completed",
      "agent": "ResearchBot"
    }
  ],
  "updatedAt": "2026-03-22T10:05:00Z"
}
```

### Real-Time Events

**GET** `/api/stream/tasks/:taskId` (Server-Sent Events)
```
event: subtask_started
data: {"subtaskId": "...", "type": "research"}

event: subtask_completed
data: {"subtaskId": "...", "result": "..."}

event: task_completed
data: {"taskId": "...", "finalResult": "..."}
```

## Development Workflow

### 1. Local Development

```bash
npm run dev
# Server running at http://localhost:3000
# Make changes, auto-reload enabled
```

### 2. Build & Test

```bash
npm run build
npm run lint
```

### 3. Deploy to Production

```bash
# Build
npm run build

# Deploy (e.g., Vercel)
npm start
```

### 4. Smart Contract Updates

```bash
# Make changes to contracts/ForbaEscrow.sol
# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy
npx hardhat ignition deploy ./ignition/modules/ForbaEscrow.js --network baseSepolia
```

## Troubleshooting

### "API keys not configured"
- **Check**: `.env.local` has valid API keys
- **Solution**: For testing, leave keys empty to use simulation mode

### "Contract not found at address"
- **Check**: `NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS` in `.env.local`
- **Solution**: Redeploy contract or verify address on BaseScan

### "Insufficient USDC balance"
- **Check**: User wallet has USDC on Base Sepolia
- **Solution**: Use testnet faucet to mint USDC (details in contract docs)

### "Task execution timeout"
- **Check**: API keys are valid and services are responding
- **Solution**: Check Locus API status, increase timeout in config

## Contributing

Contributions welcome! Please follow the existing code style and submit PRs to `main`.

## License

MIT License. See LICENSE file for details.

## Team

**Muhammad Meidy Noor Al-Barry** — Builder, Creator

Forba was built for the Synthesis Hackathon 2026.

---

**Questions?** Open an issue or reach out to the team.

**Live Demo**: [http://localhost:3000](http://localhost:3000) (after running `npm run dev`)
