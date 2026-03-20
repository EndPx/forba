# AgentHire - AI Agent Marketplace with Autonomous Payments

## Work Plan for The Synthesis Hackathon (March 2026)

**Tracks:** Agents That Pay + Agents That Cooperate
**Date Created:** 2026-03-20

---

## 1. Context

### Original Request
Build "AgentHire" - an AI agent marketplace where an orchestrator agent discovers, hires, and pays specialist AI agents autonomously via on-chain escrow on Base (USDC). Must demonstrate genuine agent-to-agent collaboration with auditable on-chain payment artifacts.

### Hackathon Constraints
- Must ship a functional deliverable (not just a demo)
- Genuine agent participation required (agents must make real decisions)
- On-chain artifacts required (transactions, escrow contracts)
- Open-source with documented collaboration
- Uses Locus API for payments and Uniswap API for swaps

### Key APIs
- **Locus API** - Base URL: `https://beta-api.paywithlocus.com/api`
  - `POST /agents` - Register agent wallet
  - `GET /agents/{agentId}/balance` - Check balance
  - `POST /agents/{agentId}/transactions/send` - Send USDC
  - Wrapped Uniswap/Aave endpoints
- **Uniswap Trading API** - Base URL: `https://trade-api.gateway.uniswap.org/v1/`
  - Quote and execute swaps
  - Liquidity provisioning

---

## 2. Work Objectives

### Core Objective
Deliver a working AI agent marketplace where agents autonomously discover, negotiate, hire, and pay each other for task completion -- all verifiable on-chain.

### Deliverables
1. **Orchestrator Agent** - Breaks tasks into subtasks, discovers specialists, manages workflow
2. **Specialist Agents** (minimum 3) - Code, Research, Copywriting specialists that register and accept work
3. **Escrow Payment System** - On-chain escrow via Locus API with USDC on Base
4. **Agent Registry** - Discovery mechanism for agents to find each other
5. **Web Dashboard** - UI showing task flow, agent interactions, payment trails
6. **Demo Flow** - End-to-end demonstration of a multi-agent task with payments

### Definition of Done
- [ ] User submits a task via the dashboard
- [ ] Orchestrator decomposes task into subtasks
- [ ] Orchestrator discovers and hires at least 2 specialist agents
- [ ] Escrow is created and funded for each hired agent
- [ ] Specialists complete work and deliver results
- [ ] Escrow releases payment upon completion verification
- [ ] All payments visible on-chain (Base network)
- [ ] Dashboard shows full task lifecycle and payment audit trail

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui | Fast to build, SSR for demo, great component library |
| **Backend** | Next.js API Routes + Node.js | Single deployment, no separate server needed |
| **AI/LLM** | OpenAI GPT-4o (or Claude API) | Agent reasoning, task decomposition, quality evaluation |
| **Blockchain** | Base (L2) via Locus API | Required by hackathon; low gas, fast finality |
| **Payments** | Locus API (USDC) | Required; handles wallet creation and transfers |
| **Swaps** | Uniswap Trading API | Required; token swaps if needed for payment flexibility |
| **Database** | SQLite (via Prisma) or JSON file store | Zero-config, hackathon speed; no external DB needed |
| **Real-time** | Server-Sent Events (SSE) | Show live agent activity on dashboard; simpler than WebSockets |
| **Language** | TypeScript throughout | Type safety, single language across stack |

---

## 4. Architecture Overview

```
+------------------+
|   Web Dashboard  |  (Next.js Frontend)
|  - Submit tasks  |
|  - View agents   |
|  - Payment trail |
+--------+---------+
         |
         v
+--------+---------+
|   API Gateway    |  (Next.js API Routes)
|  /api/tasks      |
|  /api/agents     |
|  /api/payments   |
|  /api/events     |  (SSE stream)
+--------+---------+
         |
    +----+----+
    |         |
    v         v
+---+---+ +---+--------+
| Agent | | Payment    |
| Engine| | Service    |
+---+---+ +---+--------+
    |         |
    v         v
+---+---+ +---+--------+
| LLM   | | Locus API  |
| (GPT) | | (Base/USDC)|
+-------+ +---+--------+
              |
              v
          +---+--------+
          | Uniswap    |
          | Trading API|
          +------------+
```

### Component Interactions

1. **User -> Dashboard**: Submits a task (e.g., "Create a landing page for my product")
2. **Dashboard -> API Gateway**: POST /api/tasks with task description
3. **API Gateway -> Agent Engine**: Orchestrator agent receives task
4. **Agent Engine (Orchestrator)**:
   - Uses LLM to decompose task into subtasks
   - Queries Agent Registry for available specialists
   - Evaluates agent capabilities and pricing
   - Selects agents and creates hire requests
5. **Agent Engine -> Payment Service**: Create escrow (fund via Locus)
6. **Agent Engine (Specialists)**: Each specialist processes their subtask via LLM
7. **Agent Engine (Orchestrator)**: Evaluates deliverables using LLM
8. **Payment Service -> Locus API**: Release escrow on approval
9. **Dashboard (SSE)**: Real-time updates throughout the flow

---

## 5. Escrow Payment Design

### Flow
```
1. Orchestrator decides to hire Agent X for subtask
2. System calls Locus: create escrow transaction
   - Locks USDC from orchestrator's wallet
   - Records escrow ID, amount, parties, deadline
3. Agent X completes work, submits deliverable
4. Orchestrator (via LLM) evaluates quality
5a. IF approved -> Release escrow to Agent X via Locus send
5b. IF rejected -> Return funds to orchestrator (or dispute flow)
```

### Escrow Data Model
```typescript
interface Escrow {
  id: string;
  taskId: string;
  subtaskId: string;
  clientAgentId: string;      // orchestrator's Locus agent ID
  providerAgentId: string;    // specialist's Locus agent ID
  amount: number;             // USDC amount
  status: 'funded' | 'released' | 'refunded' | 'disputed';
  createdAt: Date;
  releasedAt?: Date;
  transactionHash?: string;   // on-chain reference
}
```

### Implementation Notes
- Escrow is application-level (not a separate smart contract) since Locus API handles the actual transfers
- Orchestrator wallet holds funds; sends to specialist upon approval
- The "escrow" is the application logic that gates the Locus `send` call behind quality verification
- This is pragmatic for hackathon speed while still producing on-chain artifacts

### Uniswap Integration Point
- If an agent wants payment in a different token, use Uniswap Trading API to swap USDC to desired token before/after payment
- Adds a "token preference" to agent profiles
- Demo scenario: one agent prefers ETH, system auto-swaps via Uniswap after USDC payment

---

## 6. MVP Scope vs Nice-to-Have

### MVP (Must Ship)
| Feature | Description |
|---------|-------------|
| Task Submission | User enters a task on the dashboard |
| Task Decomposition | Orchestrator uses LLM to break task into 2-4 subtasks |
| Agent Registry | 3-4 pre-registered specialist agents (code, research, copy) |
| Agent Discovery | Orchestrator queries registry to find matching agents |
| Hiring Flow | Orchestrator selects agent, creates escrow, assigns subtask |
| Task Execution | Specialist agents use LLM to produce deliverables |
| Quality Check | Orchestrator uses LLM to evaluate deliverables (accept/reject) |
| Escrow Payments | Fund on hire, release on approval via Locus API |
| Dashboard | Real-time view of task flow, agent status, payment log |
| On-chain Proof | All payments traceable on Base via Locus transaction hashes |

### Nice-to-Have (If Time Permits)
| Feature | Description |
|---------|-------------|
| Uniswap Token Swap | Agent receives payment in preferred token via Uniswap swap |
| Agent Reputation | Track success rate, build on-chain reputation scores |
| Competitive Bidding | Multiple agents bid on a subtask, orchestrator picks best |
| Dispute Resolution | Third-party agent arbitrates disputed deliverables |
| Dynamic Pricing | Agents adjust pricing based on demand/complexity |
| Multi-step Pipelines | Chain specialist outputs (research -> copy -> design) |
| Agent Self-Registration | New agents can join marketplace dynamically |

---

## 7. File/Folder Structure

```
D:/Belajar/Hackacton/Syntesis/
├── .omc/                          # Work plan and drafts
│   └── plans/
│       └── agenthire.md
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout with providers
│   │   ├── page.tsx               # Landing / task submission page
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Main dashboard - task flow visualization
│   │   ├── agents/
│   │   │   └── page.tsx           # Agent registry browser
│   │   ├── payments/
│   │   │   └── page.tsx           # Payment audit trail
│   │   └── api/
│   │       ├── tasks/
│   │       │   └── route.ts       # POST: create task, GET: list tasks
│   │       ├── tasks/[id]/
│   │       │   └── route.ts       # GET: task status + subtasks
│   │       ├── agents/
│   │       │   └── route.ts       # GET: list agents, POST: register
│   │       ├── payments/
│   │       │   └── route.ts       # GET: payment history
│   │       └── events/
│   │           └── route.ts       # SSE stream for real-time updates
│   ├── lib/
│   │   ├── agents/
│   │   │   ├── orchestrator.ts    # Orchestrator agent logic
│   │   │   ├── specialist.ts      # Base specialist agent class
│   │   │   ├── code-agent.ts      # Code specialist
│   │   │   ├── research-agent.ts  # Research specialist
│   │   │   ├── copy-agent.ts      # Copywriting specialist
│   │   │   └── registry.ts        # Agent registry (discovery)
│   │   ├── payments/
│   │   │   ├── locus.ts           # Locus API client
│   │   │   ├── escrow.ts          # Escrow logic
│   │   │   └── uniswap.ts         # Uniswap Trading API client
│   │   ├── llm/
│   │   │   ├── client.ts          # LLM API wrapper (OpenAI/Claude)
│   │   │   ├── prompts.ts         # System prompts for each agent role
│   │   │   └── evaluator.ts       # Quality evaluation logic
│   │   ├── store/
│   │   │   └── index.ts           # In-memory/SQLite data store
│   │   ├── events/
│   │   │   └── emitter.ts         # Event bus for SSE
│   │   └── types/
│   │       └── index.ts           # Shared TypeScript types
│   └── components/
│       ├── ui/                    # shadcn/ui components
│       ├── TaskForm.tsx           # Task submission form
│       ├── TaskFlow.tsx           # Visual task decomposition + status
│       ├── AgentCard.tsx          # Agent profile card
│       ├── PaymentLog.tsx         # Payment transaction list
│       └── LiveFeed.tsx           # Real-time activity feed (SSE)
├── public/
│   └── agents/                    # Agent avatar images
├── prisma/
│   └── schema.prisma              # DB schema (if using Prisma/SQLite)
├── .env.local                     # API keys (Locus, OpenAI, Uniswap)
├── .env.example                   # Template for env vars
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 8. Step-by-Step Implementation Order

### Phase 1: Foundation (Tasks 1-4)
> Get the project running with core infrastructure.

#### Task 1: Project Scaffolding
- **What:** Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
- **Commands:**
  ```
  npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
  npx shadcn@latest init
  npx shadcn@latest add button card input textarea badge separator tabs
  ```
- **Files:** `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.js`
- **Acceptance:** `npm run dev` serves the app on localhost:3000
- **Commit:** `feat: scaffold Next.js project with Tailwind and shadcn/ui`

#### Task 2: TypeScript Types and Data Store
- **What:** Define all shared types and create in-memory data store
- **Files:** `src/lib/types/index.ts`, `src/lib/store/index.ts`
- **Types to define:**
  - `Agent` (id, name, type, locusAgentId, capabilities, pricing, status)
  - `Task` (id, description, status, subtasks, agentAssignments)
  - `Subtask` (id, taskId, description, type, status, assignedAgentId, deliverable)
  - `Escrow` (id, taskId, subtaskId, clientAgentId, providerAgentId, amount, status, txHash)
  - `AgentEvent` (id, timestamp, type, agentId, taskId, message, data)
- **Store:** Simple in-memory Map-based store with CRUD helpers
- **Acceptance:** Types compile, store exports getters/setters
- **Commit:** `feat: define core types and in-memory data store`

#### Task 3: Locus API Client
- **What:** Build typed client for Locus payment API
- **Files:** `src/lib/payments/locus.ts`
- **Functions:**
  - `registerAgent(name: string)` -> returns agentId + wallet
  - `getBalance(agentId: string)` -> returns USDC balance
  - `sendPayment(fromAgentId, toAgentId, amount)` -> returns txHash
- **Error handling:** Wrap all calls with retries and clear error messages
- **Acceptance:** Can register an agent and check balance against live API
- **Commit:** `feat: implement Locus API client for agent payments`

#### Task 4: Escrow Service
- **What:** Build escrow logic on top of Locus client
- **Files:** `src/lib/payments/escrow.ts`
- **Functions:**
  - `createEscrow(taskId, subtaskId, clientId, providerId, amount)` -> Escrow record
  - `releaseEscrow(escrowId)` -> calls Locus send, updates status
  - `refundEscrow(escrowId)` -> returns funds to client
  - `getEscrowsByTask(taskId)` -> list escrows
- **Acceptance:** Escrow lifecycle works: create -> fund -> release/refund
- **Commit:** `feat: implement escrow payment service`

### Phase 2: Agent Engine (Tasks 5-8)
> Build the AI agents that power the marketplace.

#### Task 5: LLM Client and Prompts
- **What:** Create LLM wrapper and all agent system prompts
- **Files:** `src/lib/llm/client.ts`, `src/lib/llm/prompts.ts`
- **Prompts to write:**
  - Orchestrator: task decomposition prompt
  - Orchestrator: agent selection prompt
  - Orchestrator: quality evaluation prompt
  - Code Agent: code generation prompt
  - Research Agent: research synthesis prompt
  - Copy Agent: copywriting prompt
- **Acceptance:** LLM client can send messages and receive structured responses
- **Commit:** `feat: set up LLM client and agent system prompts`

#### Task 6: Agent Registry
- **What:** Agent registration and discovery system
- **Files:** `src/lib/agents/registry.ts`
- **Functions:**
  - `registerAgent(agent)` -> registers in store + registers with Locus
  - `discoverAgents(subtaskType)` -> finds matching agents by capability
  - `getAgent(id)` -> agent details
  - `seedAgents()` -> pre-register the 3 specialist agents on startup
- **Acceptance:** Can seed agents and discover by capability type
- **Commit:** `feat: implement agent registry with discovery`

#### Task 7: Specialist Agents
- **What:** Implement the specialist agent classes
- **Files:** `src/lib/agents/specialist.ts`, `code-agent.ts`, `research-agent.ts`, `copy-agent.ts`
- **Each agent must:**
  - Accept a subtask
  - Process it via LLM with role-specific prompt
  - Return a structured deliverable
  - Emit events for dashboard visibility
- **Acceptance:** Each agent can process a test subtask and return a deliverable
- **Commit:** `feat: implement specialist agents (code, research, copy)`

#### Task 8: Orchestrator Agent
- **What:** The central orchestrator that drives the entire flow
- **Files:** `src/lib/agents/orchestrator.ts`, `src/lib/llm/evaluator.ts`
- **Orchestrator flow:**
  1. Receive task from user
  2. Call LLM to decompose into subtasks (with types: code/research/copy)
  3. For each subtask: discover agents, select best, create escrow
  4. Dispatch subtasks to specialists
  5. Collect deliverables
  6. Evaluate quality via LLM (pass/fail with reasoning)
  7. Release escrow for approved work, request revision or refund for rejected
  8. Compile final result from all deliverables
- **Acceptance:** Orchestrator can run full flow: decompose -> hire -> collect -> pay
- **Commit:** `feat: implement orchestrator agent with full hiring flow`

### Phase 3: API and Dashboard (Tasks 9-12)
> Wire up the frontend and API routes.

#### Task 9: API Routes
- **What:** Create all Next.js API routes
- **Files:** `src/app/api/tasks/route.ts`, `src/app/api/agents/route.ts`, `src/app/api/payments/route.ts`, `src/app/api/events/route.ts`
- **Endpoints:**
  - `POST /api/tasks` - Submit new task, triggers orchestrator
  - `GET /api/tasks` - List all tasks with status
  - `GET /api/tasks/[id]` - Task detail with subtasks and payments
  - `GET /api/agents` - List registered agents
  - `GET /api/payments` - Payment audit trail
  - `GET /api/events` - SSE stream of agent activity
- **Acceptance:** All endpoints return correct data, POST triggers orchestrator
- **Commit:** `feat: implement API routes for tasks, agents, payments, and events`

#### Task 10: Event System (SSE)
- **What:** Real-time event streaming for dashboard
- **Files:** `src/lib/events/emitter.ts`, `src/app/api/events/route.ts`
- **Events to emit:**
  - `task:created`, `task:decomposed`, `task:completed`
  - `agent:hired`, `agent:working`, `agent:delivered`
  - `escrow:created`, `escrow:released`, `escrow:refunded`
  - `evaluation:started`, `evaluation:passed`, `evaluation:failed`
- **Acceptance:** SSE stream delivers events in real-time to browser
- **Commit:** `feat: implement SSE event stream for real-time updates`

#### Task 11: Dashboard UI - Task Flow
- **What:** Main dashboard showing task lifecycle
- **Files:** `src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/TaskForm.tsx`, `src/components/TaskFlow.tsx`, `src/components/LiveFeed.tsx`
- **UI elements:**
  - Task submission form (textarea + submit button)
  - Task decomposition view (tree/card layout of subtasks)
  - Agent assignment indicators (which agent is doing what)
  - Status badges (pending, working, completed, paid)
  - Live activity feed (SSE-powered scrolling log)
- **Acceptance:** Can submit task and watch it flow through the system in real-time
- **Commit:** `feat: build dashboard UI with task flow visualization`

#### Task 12: Payments and Agents Pages
- **What:** Agent browser and payment audit trail pages
- **Files:** `src/app/agents/page.tsx`, `src/app/payments/page.tsx`, `src/components/AgentCard.tsx`, `src/components/PaymentLog.tsx`
- **Agent page:** Cards for each agent showing name, type, capabilities, earnings, task count
- **Payments page:** Chronological log of all escrow events with amounts, parties, tx hashes (linked to Base explorer)
- **Acceptance:** Both pages render with real data after a task runs
- **Commit:** `feat: add agent browser and payment audit trail pages`

### Phase 4: Integration and Polish (Tasks 13-15)
> Wire everything together and prepare for demo.

#### Task 13: Uniswap Integration
- **What:** Add token swap capability via Uniswap Trading API
- **Files:** `src/lib/payments/uniswap.ts`
- **Functions:**
  - `getQuote(tokenIn, tokenOut, amount)` -> swap quote
  - `executeSwap(agentId, tokenIn, tokenOut, amount)` -> execute swap
- **Integration point:** After escrow release, if agent prefers non-USDC token, auto-swap
- **Acceptance:** Can get a quote and execute a swap via Uniswap API
- **Commit:** `feat: integrate Uniswap Trading API for token swaps`

#### Task 14: End-to-End Testing and Demo Flow
- **What:** Test the complete flow and create a compelling demo scenario
- **Demo scenario:** "Create a product landing page for a new AI tool"
  - Orchestrator decomposes into: research competitors, write copy, generate code
  - Research agent: analyzes market and returns insights
  - Copy agent: writes landing page copy using research
  - Code agent: generates HTML/CSS landing page using copy
  - Each gets paid via escrow on completion
- **Files:** Potentially a `src/lib/demo/seed.ts` with demo task presets
- **Acceptance:** Full demo runs end-to-end without errors, all payments on-chain
- **Commit:** `feat: add demo flow and end-to-end integration test`

#### Task 15: Documentation and Submission Prep
- **What:** README, architecture diagram, demo recording
- **Files:** `README.md`
- **README must include:**
  - Project description and motivation
  - Architecture overview with diagram
  - How to run locally
  - API documentation
  - Demo walkthrough
  - Locus + Uniswap integration details
  - Team info
- **Acceptance:** README is complete, project runs from fresh clone
- **Commit:** `docs: add comprehensive README and project documentation`

---

## 9. Task Dependencies

```
Task 1 (Scaffold)
  |
  v
Task 2 (Types + Store)
  |
  +------+------+
  |      |      |
  v      v      |
Task 3  Task 5  |
(Locus) (LLM)  |
  |      |      |
  v      |      v
Task 4   |   Task 6
(Escrow) |  (Registry)
  |      |      |
  |      v      v
  |   Task 7 (Specialists)
  |      |
  +------+
  |
  v
Task 8 (Orchestrator) --- depends on Tasks 4, 6, 7
  |
  +------+------+
  |      |      |
  v      v      v
Task 9  Task 10 Task 13
(API)  (Events) (Uniswap)
  |      |
  v      v
Task 11 (Dashboard)
  |
  v
Task 12 (Pages)
  |
  v
Task 14 (E2E Test + Demo)
  |
  v
Task 15 (Docs)
```

### Parallelization Opportunities
- Tasks 3 + 5 can run in parallel (Locus client + LLM client)
- Tasks 6 can start once Task 2 is done (no dependency on 3 or 5)
- Tasks 9, 10, 13 can run in parallel after Task 8
- Tasks 11 + 12 can partially overlap

---

## 10. Commit Strategy

| Phase | Commits |
|-------|---------|
| Phase 1 | 4 commits (scaffold, types, locus, escrow) |
| Phase 2 | 4 commits (llm, registry, specialists, orchestrator) |
| Phase 3 | 4 commits (api, events, dashboard, pages) |
| Phase 4 | 3 commits (uniswap, e2e-demo, docs) |
| **Total** | **15 commits** |

Each commit should be self-contained and the project should remain buildable after each commit.

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Locus API rate limits or downtime** | Medium | High | Cache agent IDs locally, implement retry logic, have mock mode for development |
| **LLM responses unreliable/slow** | Medium | Medium | Use structured output (JSON mode), set timeouts, have fallback responses |
| **Escrow logic edge cases** | Medium | High | Keep escrow simple (app-level, not smart contract), test happy path first |
| **Uniswap API complexity** | Low | Low | Uniswap is nice-to-have; skip if time is tight |
| **USDC balance runs dry during demo** | Medium | High | Pre-fund agent wallets with sufficient USDC, test with small amounts first |
| **Real-time SSE breaks under load** | Low | Medium | SSE is simple and reliable; fallback to polling if needed |
| **Scope creep** | High | High | Strict MVP scope; nice-to-haves are explicitly labeled and deprioritized |
| **Time pressure (hackathon)** | High | High | Implementation order is prioritized; can ship after Phase 2 with minimal UI |

### Minimum Viable Demo (If Time Runs Out)
If time is critically short, the absolute minimum is:
1. Tasks 1-8 (backend + agents working)
2. A single API endpoint to trigger the flow
3. Console/terminal output showing the agent interactions and payments
4. On-chain transaction hashes as proof

This sacrifices the dashboard but preserves the core value proposition.

---

## 12. Environment Variables Required

```env
# .env.local
OPENAI_API_KEY=sk-...           # For LLM-powered agents
LOCUS_API_KEY=...               # Locus API authentication
LOCUS_API_BASE=https://beta-api.paywithlocus.com/api
UNISWAP_API_KEY=...             # Uniswap Trading API key
UNISWAP_API_BASE=https://trade-api.gateway.uniswap.org/v1
NEXT_PUBLIC_BASE_EXPLORER=https://basescan.org  # For linking tx hashes
```

---

## 13. Success Criteria

### Hackathon Judging Alignment

| Judging Criteria | How AgentHire Demonstrates It |
|------------------|-------------------------------|
| **Functional Deliverable** | Working marketplace with live demo |
| **Genuine Agent Participation** | Agents make real decisions: decomposition, selection, evaluation |
| **On-chain Artifacts** | Every payment produces a Base transaction hash |
| **Agents That Pay** | Orchestrator autonomously pays specialists via escrow |
| **Agents That Cooperate** | Multi-agent pipeline: orchestrator + specialists collaborate |
| **Open Source** | Full code on GitHub with MIT license |
| **Documented Collaboration** | README + dashboard shows agent-to-agent interactions |

---

## Must Have
- Task decomposition by orchestrator agent
- At least 3 specialist agents (code, research, copy)
- Escrow-gated payments via Locus API (USDC on Base)
- Real agent-to-agent discovery and hiring
- Quality evaluation before payment release
- On-chain transaction artifacts
- Web dashboard showing the flow

## Must NOT Have
- Real smart contract deployment (use Locus API instead -- pragmatic for hackathon)
- User authentication (unnecessary for demo)
- Persistent database (in-memory is fine)
- Mobile responsiveness (desktop demo only)
- Multi-user support (single-user demo flow)
- Production error handling (handle happy path + basic errors only)
