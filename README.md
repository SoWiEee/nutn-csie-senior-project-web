# nutn-csie-senior-project-web

## Liquid Glass

The homepage uses a locally bundled, pinned `@ybouane/liquidglass@1.0.3` build for the date, venue, and transport cards. `images.jpg` is the single fixed page backdrop; the vendored renderer receives that same-origin image as its scene source so each glass card refracts the background beneath its actual viewport position. Other cards keep the lighter CSS glass treatment with a card-local pointer highlight.

Regenerate the browser bundle after changing `script.js` or the vendored library:

```powershell
npx --yes esbuild app-entry.js --bundle --format=iife --global-name=NutnSiteApp --outfile=app.js
```
