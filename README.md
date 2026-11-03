# portfolio

A one-page personal portfolio built with plain HTML, CSS and JavaScript. It has no build step and no dependencies, so GitHub Pages can serve it as is.

## Files

| File | What it is |
| --- | --- |
| `index.html` | All the content. Look for `TODO` comments and "Your Name". |
| `styles.css` | Design tokens (colors, fonts) at the top, then the styles for each section. |
| `main.js` | Theme toggle and scroll reveal animations. Loads the skill map when it comes near the screen and the wolf after the page is ready. |
| `assets/wolf3d.js` | The 3D pet wolf: low-poly model, trot/gallop/idle/sleep/howl animation, curved roaming in page space, time-of-day greeting. It walks on the page as if it were water: each paw leaves a ripple where it touches down, and a faint reflection follows under it. It rests only on empty space and fades gradually the more text it passes over. Visitors can hide it from the footer. |
| `assets/skillmap.js` | The skill map. Loaded only when the Skills section gets close to the screen. |
| `assets/vendor/maplibre/` | [MapLibre GL JS](https://maplibre.org) 6.11.2 (BSD-3-Clause, see `LICENSE.txt`), bundled locally. Draws the skill map as vector tiles from [OpenFreeMap](https://openfreemap.org) (the same "liberty" style as JIS; "dark" in dark mode). No API key needed. |
| `assets/vendor/three.module.min.js` | [Three.js](https://threejs.org) r160 (MIT, see `three.LICENSE`), bundled locally. |
| `.nojekyll` | Tells GitHub Pages to serve the files without running Jekyll. |

To change the colors, edit `--orange`, `--blue`, `--green` and `--violet` (the metro line colors) at the top of `styles.css`. There is one set of values for light mode and one for dark mode.

## Skill map

The skills section is a real street map. Plain scrolling over it scrolls the page; zoom with ctrl/⌘ + scroll, the +/− buttons or two fingers on a phone. To center it on your own city, change `data-center="lat,lng"` on `#smMap` in `index.html`. Each district is a real neighbourhood block, set in `GROUPS` at the top of `assets/skillmap.js` (`rect: [west, south, east, north]`). Pins are spread evenly inside their block, keep clear of "You are here", and are moved off water if the basemap shows any under them. When someone taps a pin, the route from "You are here" follows real streets from the public [OSRM](https://project-osrm.org) demo router. If the router doesn't answer, the route is drawn as a curve. The panel in the bottom right shows the skills as a dataset: you can turn each layer on and off, and it shows the cursor coordinates, the zoom level and the map attribution.

## Run locally

Start a local server (the 3D wolf is an ES module, so it won't load from a plain `file://` path):

```bash
python3 -m http.server 8000
```

## Deploy to GitHub Pages (free)

1. Push this branch to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**. Then select the branch (for example `main` or `dev`) and the `/ (root)` folder.
4. After a minute the site is live at `https://<username>.github.io/portfolio/`.

To serve the site at `https://<username>.github.io/` with no `/portfolio` path, rename the repo to `<username>.github.io`.
