const fs = require("fs");
const path = require("path");
const { ethers, artifacts } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("CertificateRegistry");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();

  const artifact = await artifacts.readArtifact("CertificateRegistry");
  const destination = path.join(__dirname, "../frontend/src/contract.json");
  fs.writeFileSync(destination, JSON.stringify({
    address,
    chainId: 31337,
    abi: artifact.abi
  }, null, 2) + "\n");

  console.log("Compte deployeur (administrateur) :", deployer.address);
  console.log("Adresse du contrat :", address);
  console.log("ABI et adresse enregistrees dans frontend/src/contract.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
