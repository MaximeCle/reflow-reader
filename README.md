# reflow-reader

Lecture de PDF longs (livres, rapports, articles) dans une mise en page pensée
pour la lecture : le texte est extrait du PDF puis réaffiché en flux continu, au
lieu d'afficher le PDF brut. Tout se passe dans le navigateur, sans serveur.

## Démarrer

```sh
npm install
npm run dev      # serveur de développement
npm test         # tests unitaires du pipeline d'extraction
npm run build    # vérification des types + build de production
npm run lint
```

## Fonctionnement

### Extraction (`src/lib/pdf`)

Le pipeline est découpé en fonctions pures, testables sans PDF réel : seul
`extractPdf.ts` dépend de pdf.js.

| Étape | Fichier | Rôle |
| --- | --- | --- |
| Lignes | `groupItemsIntoLines.ts` | Regroupe les fragments de pdf.js en lignes positionnées et ignore les glyphes repeints en place (faux gras) |
| Surimpression | `undoubleText.ts` | Répare les lignes extraites deux fois : « CCrriimmee » → « Crime » |
| Nettoyage | `stripRepeatedLines.ts` | Retire en-têtes, pieds de page et numéros répétés |
| Paragraphes | `reconstructParagraphs.ts` | Recolle les lignes selon les écarts verticaux, les tailles de police et l'indentation |
| Césure | `dehyphenate.ts` | « inter- / face » → « interface » |
| Notes | `detectFootnotes.ts` | Repère le bloc de notes qui ferme une page, sous le corps du texte |
| Classement | `classifyBlocks.ts` | Donne son type à chaque bloc : note, `h2`, `h3` ou paragraphe |
| Assemblage | `buildDocument.ts` | Enchaîne le tout et attribue un `data-block-id` stable |

`extractPdf` est un générateur asynchrone : il rend le document reconstruit au
fil des pages, ce qui permet d'afficher les premières pages pendant que le reste
est traité.

### Marque-page (`src/features/bookmark`)

Une position en pixels ou un numéro de ligne visuelle n'aurait aucun sens : le
reflux change avec la largeur de la fenêtre et la taille du texte. Un
marque-page est donc stocké sous la forme `{ blockId, charOffset }` — le
paragraphe et l'offset du premier caractère de la ligne visée — résolu au clic
via `caretPositionFromPoint`, puis recalculé à l'affichage avec un `Range`.

### Stockage (`src/lib/storage`)

IndexedDB (via `idb-keyval`) pour la bibliothèque et le texte extrait, indexés
par le SHA-256 du fichier ; `localStorage` pour les réglages de lecture, lus de
façon synchrone au démarrage pour éviter un clignotement de thème.

## Structure

```
src/
  features/library/   liste des documents, import
  features/reader/    vue de lecture, rendu du flux
  features/bookmark/  ancrage du marque-page
  lib/pdf/            extraction et reconstruction des paragraphes
  lib/storage/        IndexedDB et réglages
  atoms/              état Jotai
  styles/             tokens et thèmes
```
