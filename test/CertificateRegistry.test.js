const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

describe("CertificateRegistry", function () {
  let registry;
  let owner;
  let other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertificateRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  it("cree un certificat et permet sa lecture", async function () {
    const tx = await registry.mintCertificate(
      owner.address, "Amina Benali", "2023-INF-042",
      "Licence Informatique", "2026-06-15", "Mention Bien"
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try { return registry.interface.parseLog(log); }
        catch { return null; }
      })
      .find((log) => log && log.name === "CertificateMinted");

    assert.equal(event.args.certId, 1n);
    const cert = await registry.getCertificate(1);
    assert.equal(cert.studentName, "Amina Benali");
    assert.equal(cert.studentId, "2023-INF-042");
    assert.equal(cert.revoked, false);
  });

  it("refuse un deuxieme certificat avec le meme CNE", async function () {
    const args = [owner.address, "Amina Benali", "2023-INF-042",
      "Licence Informatique", "2026-06-15", "Mention Bien"];
    await (await registry.mintCertificate(...args)).wait();
    await assert.rejects(registry.mintCertificate(...args), /CNE deja enregistre/);
  });

  it("refuse les emissions par un autre compte", async function () {
    await assert.rejects(
      registry.connect(other).mintCertificate(
        other.address, "Ali", "2023-INF-043", "Licence", "2026-06-15", "Bien"
      ),
      /Compte non autorise/
    );
  });

  it("importe deux certificats par batch", async function () {
    await (await registry.batchMint(
      [owner.address, ethers.ZeroAddress],
      ["Amina Benali", "Youssef Amrani"],
      ["2023-INF-042", "2023-INF-043"],
      ["Licence Informatique", "Licence Informatique"],
      ["2026-06-15", "2026-06-15"],
      ["Mention Bien", "Mention Assez Bien"]
    )).wait();

    assert.equal(await registry.nextCertificateId(), 3n);
    assert.equal((await registry.getCertificate(2)).studentName, "Youssef Amrani");
  });

  it("refuse la lecture d'un identifiant inconnu", async function () {
    await assert.rejects(registry.getCertificate(999), /Certificat introuvable/);
  });
});
