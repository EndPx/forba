import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ForbaEscrow", function () {
  async function deployFixture() {
    const [owner, payer, agent1, agent2] = await ethers.getSigners();

    // Deploy mock USDC (ERC20)
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Deploy ForbaEscrow
    const ForbaEscrow = await ethers.getContractFactory("ForbaEscrow");
    const escrow = await ForbaEscrow.deploy(await usdc.getAddress(), owner.address);
    await escrow.waitForDeployment();

    // Mint USDC to payer (1000 USDC = 1000 * 10^6)
    const mintAmount = 1000_000_000n; // 1000 USDC
    await usdc.mint(payer.address, mintAmount);

    // Payer approves escrow contract
    await usdc.connect(payer).approve(await escrow.getAddress(), mintAmount);

    return { escrow, usdc, owner, payer, agent1, agent2, mintAmount };
  }

  describe("Deployment", function () {
    it("should set USDC address correctly", async function () {
      const { escrow, usdc } = await loadFixture(deployFixture);
      expect(await escrow.usdc()).to.equal(await usdc.getAddress());
    });

    it("should set owner correctly", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      expect(await escrow.owner()).to.equal(owner.address);
    });

    it("should revert if USDC address is zero", async function () {
      const [owner] = await ethers.getSigners();
      const ForbaEscrow = await ethers.getContractFactory("ForbaEscrow");
      await expect(
        ForbaEscrow.deploy(ethers.ZeroAddress, owner.address)
      ).to.be.revertedWithCustomError(ForbaEscrow, "ZeroAddress");
    });
  });

  describe("createEscrow", function () {
    it("should create escrow and lock USDC", async function () {
      const { escrow, usdc, payer, agent1 } = await loadFixture(deployFixture);
      const escrowId = ethers.id("task1-subtask1");
      const amount = 10_000_000n; // 10 USDC

      await expect(escrow.connect(payer).createEscrow(escrowId, agent1.address, amount))
        .to.emit(escrow, "EscrowCreated")
        .withArgs(escrowId, payer.address, agent1.address, amount);

      // Verify USDC transferred to contract
      expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(amount);

      // Verify escrow data
      const data = await escrow.getEscrow(escrowId);
      expect(data.payer).to.equal(payer.address);
      expect(data.payee).to.equal(agent1.address);
      expect(data.amount).to.equal(amount);
      expect(data.state).to.equal(0); // Created
    });

    it("should revert on duplicate escrow ID", async function () {
      const { escrow, payer, agent1 } = await loadFixture(deployFixture);
      const escrowId = ethers.id("task1-subtask1");
      const amount = 10_000_000n;

      await escrow.connect(payer).createEscrow(escrowId, agent1.address, amount);

      await expect(
        escrow.connect(payer).createEscrow(escrowId, agent1.address, amount)
      ).to.be.revertedWithCustomError(escrow, "EscrowAlreadyExists");
    });

    it("should revert on zero amount", async function () {
      const { escrow, payer, agent1 } = await loadFixture(deployFixture);
      const escrowId = ethers.id("task1-subtask1");

      await expect(
        escrow.connect(payer).createEscrow(escrowId, agent1.address, 0n)
      ).to.be.revertedWithCustomError(escrow, "ZeroAmount");
    });

    it("should revert on zero payee address", async function () {
      const { escrow, payer } = await loadFixture(deployFixture);
      const escrowId = ethers.id("task1-subtask1");

      await expect(
        escrow.connect(payer).createEscrow(escrowId, ethers.ZeroAddress, 10_000_000n)
      ).to.be.revertedWithCustomError(escrow, "ZeroAddress");
    });
  });

  describe("releaseEscrow", function () {
    it("should release USDC to agent on success", async function () {
      const { escrow, usdc, owner, payer, agent1 } = await loadFixture(deployFixture);
      const escrowId = ethers.id("task1-subtask1");
      const amount = 10_000_000n;

      await escrow.connect(payer).createEscrow(escrowId, agent1.address, amount);

      const agentBalanceBefore = await usdc.balanceOf(agent1.address);

      await expect(escrow.connect(owner).releaseEscrow(escrowId))
        .to.emit(escrow, "EscrowReleased")
        .withArgs(escrowId, agent1.address, amount);

      expect(await usdc.balanceOf(agent1.address)).to.equal(agentBalanceBefore + amount);

      // Verify state changed
      const data = await escrow.getEscrow(escrowId);
      expect(data.state).to.equal(1); // Released
    });

    it("should revert if not owner", async function () {
      const { escrow, payer, agent1 } = await loadFixture(deployFixture);
      const escrowId = ethers.id("task1-subtask1");
      await escrow.connect(payer).createEscrow(escrowId, agent1.address, 10_000_000n);

      await expect(
        escrow.connect(payer).releaseEscrow(escrowId)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("should revert if already released", async function () {
      const { escrow, owner, payer, agent1 } = await loadFixture(deployFixture);
      const escrowId = ethers.id("task1-subtask1");
      await escrow.connect(payer).createEscrow(escrowId, agent1.address, 10_000_000n);
      await escrow.connect(owner).releaseEscrow(escrowId);

      await expect(
        escrow.connect(owner).releaseEscrow(escrowId)
      ).to.be.revertedWithCustomError(escrow, "EscrowNotActive");
    });
  });

  describe("refundEscrow", function () {
    it("should refund USDC to payer on failure", async function () {
      const { escrow, usdc, owner, payer, agent1 } = await loadFixture(deployFixture);
      const escrowId = ethers.id("task1-subtask1");
      const amount = 10_000_000n;

      const payerBalanceBefore = await usdc.balanceOf(payer.address);
      await escrow.connect(payer).createEscrow(escrowId, agent1.address, amount);

      await expect(escrow.connect(owner).refundEscrow(escrowId))
        .to.emit(escrow, "EscrowRefunded")
        .withArgs(escrowId, payer.address, amount);

      // Payer gets full amount back
      expect(await usdc.balanceOf(payer.address)).to.equal(payerBalanceBefore);

      const data = await escrow.getEscrow(escrowId);
      expect(data.state).to.equal(2); // Refunded
    });

    it("should revert if not owner", async function () {
      const { escrow, payer, agent1 } = await loadFixture(deployFixture);
      const escrowId = ethers.id("task1-subtask1");
      await escrow.connect(payer).createEscrow(escrowId, agent1.address, 10_000_000n);

      await expect(
        escrow.connect(agent1).refundEscrow(escrowId)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  describe("View functions", function () {
    it("should track escrow count", async function () {
      const { escrow, payer, agent1, agent2 } = await loadFixture(deployFixture);

      expect(await escrow.getEscrowCount()).to.equal(0);

      await escrow.connect(payer).createEscrow(ethers.id("t1"), agent1.address, 5_000_000n);
      expect(await escrow.getEscrowCount()).to.equal(1);

      await escrow.connect(payer).createEscrow(ethers.id("t2"), agent2.address, 3_000_000n);
      expect(await escrow.getEscrowCount()).to.equal(2);
    });

    it("should return contract USDC balance", async function () {
      const { escrow, payer, agent1 } = await loadFixture(deployFixture);
      const amount = 15_000_000n;

      await escrow.connect(payer).createEscrow(ethers.id("t1"), agent1.address, amount);
      expect(await escrow.getContractBalance()).to.equal(amount);
    });
  });
});
