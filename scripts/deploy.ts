import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ForbaEscrow with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // USDC on Base Sepolia (Circle official)
  const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const OWNER = deployer.address;

  console.log("\nDeploying ForbaEscrow...");
  console.log("  USDC address:", USDC_BASE_SEPOLIA);
  console.log("  Owner:", OWNER);

  const Escrow = await ethers.getContractFactory("ForbaEscrow");
  const escrow = await Escrow.deploy(USDC_BASE_SEPOLIA, OWNER);
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("\n✅ ForbaEscrow deployed to:", address);
  console.log(`\nView on BaseScan: https://sepolia.basescan.org/address/${address}`);
  console.log("\nTo verify on BaseScan, run:");
  console.log(`npx hardhat verify --network base-sepolia ${address} "${USDC_BASE_SEPOLIA}" "${OWNER}"`);

  // Save deployment info
  const fs = await import("fs");
  const deploymentInfo = {
    contract: "ForbaEscrow",
    address,
    network: "base-sepolia",
    chainId: 84532,
    usdc: USDC_BASE_SEPOLIA,
    owner: OWNER,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    txHash: escrow.deploymentTransaction()?.hash,
  };

  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
