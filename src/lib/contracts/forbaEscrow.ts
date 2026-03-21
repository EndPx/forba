import { ethers } from "ethers";

// ForbaEscrow ABI - only the functions we need
const FORBA_ESCROW_ABI = [
  "function createEscrow(bytes32 escrowId, address payee, uint256 amount) external",
  "function releaseEscrow(bytes32 escrowId) external",
  "function refundEscrow(bytes32 escrowId) external",
  "function getEscrow(bytes32 escrowId) view returns (address payer, address payee, uint256 amount, uint8 state, uint256 createdAt)",
  "function getEscrowCount() view returns (uint256)",
  "function getContractBalance() view returns (uint256)",
  "function usdc() view returns (address)",
  "function owner() view returns (address)",
  "event EscrowCreated(bytes32 indexed escrowId, address indexed payer, address indexed payee, uint256 amount)",
  "event EscrowReleased(bytes32 indexed escrowId, address indexed payee, uint256 amount)",
  "event EscrowRefunded(bytes32 indexed escrowId, address indexed payer, uint256 amount)",
];

// USDC ABI - for approvals
const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// Base Sepolia config
const BASE_SEPOLIA_CHAIN_ID = 84532;
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

function getProvider() {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  return new ethers.JsonRpcProvider(rpcUrl, undefined, {
    staticNetwork: ethers.Network.from(BASE_SEPOLIA_CHAIN_ID),
  });
}

function getWallet() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  return new ethers.Wallet(privateKey, getProvider());
}

function getEscrowContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const address = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
  if (!address) throw new Error("NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS not set");
  return new ethers.Contract(address, FORBA_ESCROW_ABI, signerOrProvider || getWallet());
}

function getUsdcContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(USDC_BASE_SEPOLIA, USDC_ABI, signerOrProvider || getWallet());
}

/**
 * Convert a string escrow ID to bytes32 (keccak256 hash)
 */
function toBytes32(id: string): string {
  return ethers.id(id);
}

/**
 * Convert USDC amount (human-readable) to on-chain amount (6 decimals)
 * e.g. 10.5 USDC → 10500000n
 */
function toUsdcAmount(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000));
}

/**
 * Convert on-chain USDC amount to human-readable
 */
function fromUsdcAmount(amount: bigint): number {
  return Number(amount) / 1_000_000;
}

// ===== Public API =====

/**
 * Create an on-chain escrow: approve USDC + lock funds in contract
 */
export async function createOnChainEscrow(
  escrowId: string,
  payeeAddress: string,
  usdcAmount: number
): Promise<{ txHash: string; escrowIdBytes32: string }> {
  const wallet = getWallet();
  const escrow = getEscrowContract(wallet);
  const usdc = getUsdcContract(wallet);
  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS!;

  const amount = toUsdcAmount(usdcAmount);
  const idBytes32 = toBytes32(escrowId);

  // Step 1: Approve USDC spending
  const currentAllowance = await usdc.allowance(wallet.address, escrowAddress);
  if (currentAllowance < amount) {
    console.log(`[Escrow] Approving ${usdcAmount} USDC for escrow contract...`);
    const approveTx = await usdc.approve(escrowAddress, amount);
    await approveTx.wait();
    console.log(`[Escrow] Approval tx: ${approveTx.hash}`);
  }

  // Step 2: Create escrow (locks USDC in contract)
  console.log(`[Escrow] Creating on-chain escrow: ${escrowId} → ${payeeAddress} for ${usdcAmount} USDC`);
  const tx = await escrow.createEscrow(idBytes32, payeeAddress, amount);
  await tx.wait();
  console.log(`[Escrow] Created tx: ${tx.hash}`);

  return { txHash: tx.hash, escrowIdBytes32: idBytes32 };
}

/**
 * Release escrow to agent — called when deliverable passes evaluation
 */
export async function releaseOnChainEscrow(
  escrowId: string
): Promise<{ txHash: string }> {
  const escrow = getEscrowContract();
  const idBytes32 = toBytes32(escrowId);

  console.log(`[Escrow] Releasing escrow: ${escrowId}`);
  const tx = await escrow.releaseEscrow(idBytes32);
  await tx.wait();
  console.log(`[Escrow] Released tx: ${tx.hash}`);

  return { txHash: tx.hash };
}

/**
 * Refund escrow to payer — called when agent fails
 */
export async function refundOnChainEscrow(
  escrowId: string
): Promise<{ txHash: string }> {
  const escrow = getEscrowContract();
  const idBytes32 = toBytes32(escrowId);

  console.log(`[Escrow] Refunding escrow: ${escrowId}`);
  const tx = await escrow.refundEscrow(idBytes32);
  await tx.wait();
  console.log(`[Escrow] Refunded tx: ${tx.hash}`);

  return { txHash: tx.hash };
}

/**
 * Get escrow details from on-chain
 */
export async function getOnChainEscrow(escrowId: string) {
  const escrow = getEscrowContract(getProvider());
  const idBytes32 = toBytes32(escrowId);
  const data = await escrow.getEscrow(idBytes32);

  const stateMap = ["Created", "Released", "Refunded"] as const;

  return {
    payer: data[0] as string,
    payee: data[1] as string,
    amount: fromUsdcAmount(data[2] as bigint),
    state: stateMap[Number(data[3])] || "Unknown",
    createdAt: new Date(Number(data[4]) * 1000).toISOString(),
  };
}

/**
 * Get contract stats
 */
export async function getContractStats() {
  const escrow = getEscrowContract(getProvider());
  const [count, balance] = await Promise.all([
    escrow.getEscrowCount(),
    escrow.getContractBalance(),
  ]);

  return {
    escrowCount: Number(count),
    lockedUsdc: fromUsdcAmount(balance as bigint),
    contractAddress: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "",
    network: "Base Sepolia",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    usdcAddress: USDC_BASE_SEPOLIA,
  };
}

/**
 * Get BaseScan URL for a transaction
 */
export function getBaseScanTxUrl(txHash: string): string {
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

/**
 * Get BaseScan URL for the contract
 */
export function getBaseScanContractUrl(): string {
  const address = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "";
  return `https://sepolia.basescan.org/address/${address}`;
}
