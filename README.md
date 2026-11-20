# Devoir 1 – Certification académique sur blockchain

Ce projet permet d'émettre et de vérifier des certificats académiques sur une blockchain locale. J'ai utilisé Hardhat pour le contrat et React pour l'interface.

## Outils utilisés

- Solidity et Hardhat
- React et Vite
- ethers.js et MetaMask
- SheetJS pour lire les fichiers Excel et CSV

## Installation

Depuis le dossier principal du projet :

```powershell
npm install
npm run compile
npm run test
```

Puis installer les dépendances de l'interface :

```powershell
cd frontend
npm install
cd ..
```

Les installations et la première compilation sont à faire avec Internet, avant la présentation.

## Lancer l'application

Ouvrir trois terminaux dans VS Code.

**Terminal 1 – Démarrer la blockchain locale**

```powershell
npm run node
```

**Terminal 2 – Déployer le contrat**

```powershell
npm run deploy
```

**Terminal 3 – Lancer l'interface**

```powershell
cd frontend
npm run dev
```

Ouvrir ensuite `http://127.0.0.1:5173/` dans Chrome.

Dans MetaMask, sélectionner le réseau local `http://127.0.0.1:8545` (Chain ID `31337`) et le compte de test Hardhat qui a déployé le contrat.

## Utilisation

Dans la **zone administrateur**, on peut connecter MetaMask et créer un certificat en remplissant le formulaire. On peut aussi importer `examples/etudiants.xlsx`, sélectionner les étudiants et émettre plusieurs certificats.

Dans la **zone publique**, il suffit de saisir l'identifiant d'un certificat pour consulter ses informations et son statut. Cette recherche ne demande pas de connexion au portefeuille.

Le contrat empêche l'émission par un compte non autorisé et le double enregistrement du même CNE.

## Tests

Le projet contient cinq tests Hardhat : création, lecture, autorisation, doublons et émission multiple. Ils ont été exécutés avec succès.

**Adresse du contrat local :** `0x5FbDB2315678afecb367f032d93F642f64180aa3` (adresse obtenue lors du déploiement de test ; à revérifier après un redémarrage).

La capture d'écran d'une émission réussie, avec le hash de transaction, est à joindre au dossier rendu.

