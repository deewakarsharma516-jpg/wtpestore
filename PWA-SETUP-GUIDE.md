# WTPESTORE — PWA App Setup (App banane ki guide)

## Kya mila is pack me
| File/Folder | Kahan upload karna hai |
|---|---|
| `manifest.json` | repo ki **root** (index.html ke saath) |
| `sw.js` | repo ki **root** |
| `apple-touch-icon.png` | repo ki **root** |
| `favicon.ico` | repo ki **root** |
| `icons/` (13 files) | **naya folder** `icons` banake usme |
| `*.html` (46 files) | root — purane replace karo (PWA tags lag chuke hain) |
| `WTPeSTORE-logo-TM.png` | logo with ™ (transparent) — letterhead/printing ke liye |
| `WTPeSTORE-logo-TM-white.png` | logo with ™ (white bg) — WhatsApp/social ke liye |
| `splash-1200x630.png` | share/OG banner |

## Upload steps (GitHub)
1. Repo → **Add file → Upload files** → saari root files (manifest.json, sw.js, apple-touch-icon.png, favicon.ico, 46 HTML) drop karo → **Commit**
2. Ab **icons** folder: Add file → Upload files → URL me `/upload/main` ko `/upload/main/icons` karke Enter → 13 icon files drop → Commit
   (ya extract kiye folder ko poora drag karo — folder structure bana rahega)
3. 5 minute ruko

## Test (mobile)
1. Phone (Chrome) me `wtpestore.co.in` kholo
2. Neeche-baayen **"⬇️ App Install karein"** button aayega → dabao
3. Ya menu (⋮) → **"Add to Home screen" / "Install app"**
4. Home screen par WTPeSTORE ka icon aa jayega — dabao, app ki tarah khulega (browser bar ke bina)

## iPhone par
Safari → Share (⬆️) → **Add to Home Screen** (iPhone me automatic prompt nahi aata, yahi tareeka hai)

## Kya-kya milega app me
- Home screen icon (drop wala logo)
- Full-screen app look (address bar nahi)
- Offline support: net na ho to bhi pehle dekhe page khulenge
- Shortcuts (icon dabaye rakhne par): Products · Calculators · Catalogues · Track Order
- Live prices hamesha internet se (cache nahi hoti)

## Play Store par daalna ho (baad me)
Yeh PWA hai — Play Store ke liye **TWA** banana padta hai (PWABuilder.com se free APK ban jata hai). Abhi zaroorat nahi; ZeroScale app pehle approve hone do.

## Yaad rakhein
- Site update karne ke baad phone par app **khud update** ho jata hai (HTML network-first hai)
- Kabhi purana dikhe to app band karke dobara kholein
