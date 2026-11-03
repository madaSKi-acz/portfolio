# portfolio

A one-page personal portfolio built with plain HTML, CSS and JavaScript. It has no build step and no dependencies, so GitHub Pages can serve it as is.

## Files

| File | What it is |
| --- | --- |
| `index.html` | All the content. Look for `TODO` comments and "Your Name". |
| `styles.css` | Design tokens (colors, fonts) at the top, then the styles for each section. |
| `main.js` | Theme toggle, scroll reveal animations and the route rail that tracks your position on the page. |
| `.nojekyll` | Tells GitHub Pages to serve the files without running Jekyll. |

To change the colors, edit `--orange`, `--blue`, `--green` and `--violet` (the metro line colors) at the top of `styles.css`. There is one set of values for light mode and one for dark mode.

## Run locally

Open `index.html` in a browser, or start a local server:

```bash
python3 -m http.server 8000
```

## Deploy to GitHub Pages (free)

1. Push this branch to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**. Then select the branch (for example `main` or `dev`) and the `/ (root)` folder.
4. After a minute the site is live at `https://<username>.github.io/portfolio/`.

To serve the site at `https://<username>.github.io/` with no `/portfolio` path, rename the repo to `<username>.github.io`.
