# reflow-reader

Lecture de PDF longs (livres, rapports, articles) dans une mise en page pensée
pour la lecture : le texte est extrait du PDF puis réaffiché en flux continu, au
lieu d'afficher le PDF brut. Tout se passe dans le navigateur ; la
synchronisation entre appareils est le seul point qui parle à un serveur, et
elle est optionnelle (voir plus bas).

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

### Synchronisation entre appareils (`src/lib/sync`)

Optionnelle, désactivée par défaut. IndexedDB reste la seule source de vérité
sur chaque appareil ; la synchronisation ne fait que pousser le texte extrait,
la bibliothèque et les marque-pages vers un projet Supabase, et les récupérer
sur les autres appareils — jamais le PDF d'origine, qui n'est plus conservé
une fois l'extraction faite.

Aucun compte : un appareil génère un **code de synchro** (16 caractères, un
secret à haute entropie plutôt qu'un identifiant), qu'on recopie sur les
autres. Ce code est la seule preuve d'appartenance à un groupe — vérifiée côté
serveur par des policies Row Level Security, pas seulement filtrée côté
client. Chaque appareil obtient une identité anonyme Supabase ; `join_sync_group`
(voir `supabase/schema.sql`) l'inscrit comme membre du groupe nommé par ce
code, et c'est cette appartenance que les policies vérifient à chaque lecture
ou écriture — pas le code passé tel quel dans la requête.

En cas de conflit (deux appareils modifiés hors ligne), l'entrée la plus
récente l'emporte dans son ensemble (`mergeLibraryEntry.ts`) : `lastReadAt`
sert d'horloge, mise à jour à chaque marque-page, progression ou
renommage. Limite assumée : une suppression n'est pas propagée par
tombstone, elle est appliquée au mieux — au-delà, la complexité ne se
justifiait pas pour une synchro personnelle entre quelques appareils.

**Mise en place** (facultative — sans elle, l'app fonctionne exactement comme
avant, le panneau de synchro reste invisible) :

1. Créer un projet sur [supabase.com](https://supabase.com) (offre gratuite).
2. *Authentication → Sign In / Providers → Anonymous Sign-Ins* : activer.
3. *SQL Editor* : coller et exécuter `supabase/schema.sql`.
4. *Project Settings → API* : récupérer l'URL du projet et la clé `anon`
   publique (elle est faite pour être publique ; la sécurité tient aux
   policies RLS, pas au secret de cette clé).
5. Copier `.env.example` en `.env.local`, y renseigner `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY`.
6. Sur Netlify (ou tout autre hébergeur), déclarer les deux mêmes variables
   dans les réglages du site : elles sont lues au moment du build, pas à
   l'exécution.

## Structure

```
src/
  features/library/   liste des documents, import
  features/reader/    vue de lecture, rendu du flux
  features/bookmark/  ancrage du marque-page
  lib/pdf/            extraction et reconstruction des paragraphes
  lib/storage/        IndexedDB et réglages
  lib/sync/           synchronisation Supabase (optionnelle)
  atoms/              état Jotai
  styles/             tokens et thèmes
supabase/
  schema.sql          schéma et policies pour la synchronisation
```
