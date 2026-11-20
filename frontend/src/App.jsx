import React from "react";
import { useState } from "react";
import { ethers } from "ethers";
import * as XLSX from "xlsx";
import deployment from "./contract.json";

const RPC_URL = "http://127.0.0.1:8545";
const REQUIRED_COLUMNS = ["studentName", "studentId", "diplomaTitle", "issueDate", "grade"];
const EMPTY_FORM = {
  studentName: "", studentId: "", diplomaTitle: "",
  issueDate: "", recipientAddress: "", grade: ""
};

function checkRow(row) {
  for (const field of REQUIRED_COLUMNS) {
    if (!String(row[field] ?? "").trim()) return `Champ manquant : ${field}`;
  }
  const date = String(row.issueDate).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) ||
      new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date) {
    return "Date attendue : AAAA-MM-JJ";
  }
  if (String(row.recipientAddress || "").trim() &&
      !ethers.isAddress(String(row.recipientAddress).trim())) {
    return "Adresse du destinataire invalide";
  }
  return "";
}

function recipient(row) {
  const value = String(row.recipientAddress || "").trim();
  return value ? ethers.getAddress(value) : ethers.ZeroAddress;
}

function getMessage(error) {
  return error?.shortMessage || error?.reason || error?.message || String(error);
}

export default function App() {
  const [account, setAccount] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [fileName, setFileName] = useState("");
  const [certId, setCertId] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [message, setMessage] = useState("");
  const [hashes, setHashes] = useState([]);
  const [busy, setBusy] = useState(false);

  async function getAdminContract() {
    if (!window.ethereum) throw new Error("MetaMask n'est pas installe.");
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const network = await browserProvider.getNetwork();
    if (network.chainId !== 31337n) {
      throw new Error("Selectionnez le reseau Hardhat Local (ID 31337) dans MetaMask.");
    }
    const signer = await browserProvider.getSigner();
    const signerAddress = await signer.getAddress();
    setAccount(signerAddress);
    return new ethers.Contract(deployment.address, deployment.abi, signer);
  }

  async function connectWallet() {
    try {
      setMessage("");
      if (!window.ethereum) throw new Error("Installez MetaMask avant la demonstration.");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await getAdminContract();
      setMessage("Portefeuille connecte.");
    } catch (error) { setMessage(getMessage(error)); }
  }

  async function mintOne(event) {
    event.preventDefault();
    const error = checkRow(form);
    if (error) return setMessage(error);
    try {
      setBusy(true);
      setMessage("Confirmez la transaction dans MetaMask...");
      setHashes([]);
      const contract = await getAdminContract();
      const tx = await contract.mintCertificate(
        recipient(form), form.studentName.trim(), form.studentId.trim(),
        form.diplomaTitle.trim(), form.issueDate.trim(), form.grade.trim()
      );
      setHashes([tx.hash]);
      await tx.wait();
      setMessage("Certificat cree avec succes. Vous pouvez le verifier dans la zone publique.");
      setForm({ ...EMPTY_FORM });
    } catch (error) { setMessage(getMessage(error)); }
    finally { setBusy(false); }
  }

  async function importExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setMessage("");
      setHashes([]);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("Fichier vide.");
      const headers = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, blankrows: false })[0] || [];
      const missing = REQUIRED_COLUMNS.filter((key) => !headers.includes(key));
      if (missing.length) throw new Error("Colonnes manquantes : " + missing.join(", "));
      const parsed = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
      if (!parsed.length) throw new Error("Aucune ligne trouvee dans le fichier.");
      const clean = parsed.map((row) => Object.fromEntries(
        [...REQUIRED_COLUMNS, "recipientAddress"].map((key) => [key, String(row[key] ?? "").trim()])
      ));
      setRows(clean);
      setSelected(clean.map((_, index) => index));
      setFileName(file.name);
      setMessage(`${clean.length} ligne(s) chargee(s). Verifiez le tableau avant l'emission.`);
    } catch (error) {
      setRows([]); setSelected([]); setFileName("");
      setMessage(getMessage(error));
    }
  }

  function toggleRow(index) {
    setSelected((previous) => previous.includes(index)
      ? previous.filter((value) => value !== index)
      : [...previous, index]);
  }

  async function mintSelected() {
    const chosen = selected.sort((a, b) => a - b).map((index) => rows[index]);
    if (!chosen.length) return setMessage("Selectionnez au moins une ligne.");
    for (const row of chosen) {
      const error = checkRow(row);
      if (error) return setMessage(`Ligne ${rows.indexOf(row) + 2} : ${error}`);
    }
    if (new Set(chosen.map((row) => row.studentId)).size !== chosen.length) {
      return setMessage("Le fichier contient des CNE en double dans la selection.");
    }
    try {
      setBusy(true);
      setHashes([]);
      const contract = await getAdminContract();
      const txHashes = [];
      let total = 0;
      // Cinq certificats par transaction pour eviter les gros lots.
      for (let start = 0; start < chosen.length; start += 5) {
        const lot = chosen.slice(start, start + 5);
        setMessage(`Emission du lot ${Math.floor(start / 5) + 1} : confirmez dans MetaMask...`);
        const tx = await contract.batchMint(
          lot.map(recipient),
          lot.map((row) => row.studentName),
          lot.map((row) => row.studentId),
          lot.map((row) => row.diplomaTitle),
          lot.map((row) => row.issueDate),
          lot.map((row) => row.grade)
        );
        txHashes.push(tx.hash);
        setHashes([...txHashes]);
        await tx.wait();
        total += lot.length;
      }
      setMessage(`${total} certificat(s) emis avec succes.`);
    } catch (error) { setMessage(getMessage(error)); }
    finally { setBusy(false); }
  }

  async function searchCertificate(event) {
    event.preventDefault();
    setCertificate(null);
    try {
      if (!/^\d+$/.test(certId.trim()) || BigInt(certId.trim()) < 1n) {
        throw new Error("Saisissez un identifiant numerique positif.");
      }
      const rpc = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(deployment.address, deployment.abi, rpc);
      const result = await contract.getCertificate(BigInt(certId.trim()));
      setCertificate(result);
      setMessage("");
    } catch (error) { setMessage(getMessage(error)); }
  }

  if (!deployment.address || !deployment.abi.length) {
    return <main><h1>Certification academique</h1><p>Deployez d'abord le contrat avec <code>npm run deploy</code>.</p></main>;
  }

  return (
    <main>
      <header>
        <h1>Certification academique</h1>
        <p>Creation et verification de certificats sur la blockchain locale Hardhat.</p>
        <small>Contrat : <code>{deployment.address}</code></small>
      </header>

      <section>
        <h2>1. Zone administrateur</h2>
        <button type="button" onClick={connectWallet} disabled={busy}>Connecter MetaMask</button>
        {account && <p className="help">Compte connecte : <code>{account}</code></p>}
        <p className="help">Seul le compte qui a deploye le contrat peut emettre des certificats.</p>

        <h3>Emettre un certificat</h3>
        <form onSubmit={mintOne} className="form-grid">
          {[
            ["studentName", "Nom de l'etudiant", "text"],
            ["studentId", "CNE / identifiant", "text"],
            ["diplomaTitle", "Diplome", "text"],
            ["issueDate", "Date d'emission", "date"],
            ["grade", "Mention / note", "text"],
            ["recipientAddress", "Adresse du destinataire (facultatif)", "text"]
          ].map(([key, label, type]) => (
            <label key={key}>{label}
              <input type={type} value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                required={key !== "recipientAddress"}
                placeholder={key === "recipientAddress" ? "0x... (facultatif)" : ""} />
            </label>
          ))}
          <div className="full"><button disabled={busy} type="submit">Emettre le certificat</button></div>
        </form>

        <h3>Importer un fichier Excel / CSV</h3>
        <label className="file-label">Choisir un fichier
          <input type="file" accept=".xlsx,.csv" onChange={importExcel} disabled={busy} />
        </label>
        {fileName && <p className="help">Fichier : {fileName}</p>}
        {rows.length > 0 && <>
          <div className="table-scroll">
            <table>
              <thead><tr>
                <th>Choix</th><th>Nom</th><th>CNE</th><th>Diplome</th><th>Date</th><th>Mention</th><th>Validation</th>
              </tr></thead>
              <tbody>{rows.map((row, index) => (
                <tr key={index}>
                  <td><input type="checkbox" checked={selected.includes(index)} onChange={() => toggleRow(index)} disabled={busy} /></td>
                  <td>{row.studentName}</td><td>{row.studentId}</td><td>{row.diplomaTitle}</td>
                  <td>{row.issueDate}</td><td>{row.grade}</td>
                  <td className={checkRow(row) ? "invalid" : "valid"}>{checkRow(row) || "OK"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p className="help">{selected.length} ligne(s) selectionnee(s).</p>
          <button type="button" onClick={mintSelected} disabled={busy}>Emettre les lignes selectionnees</button>
        </>}
        {hashes.length > 0 && <div className="hashes">
          <h3>Transactions</h3>
          {hashes.map((hash) => <p key={hash}><code>{hash}</code></p>)}
        </div>}
      </section>

      <section>
        <h2>2. Zone publique</h2>
        <form className="search" onSubmit={searchCertificate}>
          <label>Identifiant du certificat
            <input type="number" min="1" step="1" value={certId} onChange={(event) => setCertId(event.target.value)} placeholder="Exemple : 1" />
          </label>
          <button type="submit">Verifier</button>
        </form>
        {certificate && <div className="result">
          <h3>Certificat n° {certId}</h3>
          <p><b>Etudiant :</b> {certificate.studentName}</p>
          <p><b>CNE :</b> {certificate.studentId}</p>
          <p><b>Diplome :</b> {certificate.diplomaTitle}</p>
          <p><b>Date :</b> {certificate.issueDate}</p>
          <p><b>Mention :</b> {certificate.grade}</p>
          <p><b>Destinataire :</b> {certificate.recipient === ethers.ZeroAddress ? "Non renseigne" : certificate.recipient}</p>
          <p><b>Statut :</b> {certificate.revoked ? "Revoque" : "Valide"}</p>
        </div>}
      </section>
      {message && <p role="status" className="status">{message}</p>}
    </main>
  );
}
