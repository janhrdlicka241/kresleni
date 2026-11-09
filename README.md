# Kreslíme

Aplikace pro kreslení na papír podle iPadu, krok po kroku.

## Zveřejnění na GitHub Pages
1. Na GitHubu vytvoř nový veřejný repozitář `kresleni`.
2. Nahraj do něj všechny soubory z této složky (Add file → Upload files).
3. Settings → Pages → Source: Deploy from a branch, Branch: `main`, složka `/ (root)` → Save.
4. Za minutu až dvě poběží na `https://<tvoje-jmeno>.github.io/kresleni/`.

## Na iPadu
Otevři adresu v Safari → Sdílet → Přidat na plochu.

Fotky v deníku a hvězdičky se ukládají jen v tomhle iPadu (v Safari). Smazání dat Safari je smaže.

## Pohádky (od verze 1.14) – připojení AI na GitHub Pages
Na claude.ai funguje AI sama. Na GitHub Pages je potřeba Cloudflare Worker (klíč nesmí být v kódu na GitHubu):
1. Na console.anthropic.com si vytvoř API klíč a nastav měsíční limit útraty (Billing → Limits).
2. Na dash.cloudflare.com → Workers & Pages → Create → Worker → pojmenuj ho `pohadky` → Deploy.
3. Edit code → vlož obsah `worker.js` → Deploy.
4. Settings → Variables and Secrets: přidej `ANTHROPIC_API_KEY` (typ Secret) a `ALLOWED_ORIGIN` = `https://janhrdlicka241.github.io`.
5. V aplikaci: Pohádky → dole „Pro rodiče" podrž 2 s → vlož adresu workeru (např. `https://pohadky.tvuj-ucet.workers.dev`) → Uložit.
Bez připojené AI se pohádky skládají z ukázkové sady.
