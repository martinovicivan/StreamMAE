# StreamMAE project page

The published page for *I Have a Stream: Making Self-Supervised Learning Work on
Continuous Video*. Served by GitHub Pages from this directory.

## Local preview

```bash
python3 -m http.server 8000 --directory docs
```

Then open <http://localhost:8000>. Stop with `Ctrl+C`.

## Layout

```
index.html              the whole page
static/css/index.css    all styling, no framework
static/js/index.js      chart data, chart rendering, the sliding-window demo
static/images/project/  paper figures
static/video/           ten city clips plus their poster frames
static/pdfs/            the poster
```

There are no build steps and no third-party CSS or JS. Icons are an inline SVG
sprite at the top of `index.html`; the only external request is the Inter
webfont.

## Editing the numbers

Every chart is generated from a data object near the top of `static/js/index.js`
(`BENCHMARK`, `ENCODER`, `ABLATION`, `CONTROL`, `SCALING`, `LONGRUN`, `DOMAINS`).
Each one also renders that chart's table view, so the chart and the table cannot
disagree. To change a result, edit the object, not the markup.

Every value traces to a table in the paper source. The comment above each object
names the table it came from.

## Adding or replacing city clips

Clips are 10 seconds, 448 px wide, 15 fps, H.264, encoded from the original
720p video:

```bash
ffmpeg -t 10 -i SOURCE.mp4 -vf "fps=15,scale=448:-2" \
  -c:v libx264 -crf 31 -preset veryslow -pix_fmt yuv420p \
  -movflags +faststart -an docs/static/video/NAME.mp4

ffmpeg -i SOURCE.mp4 -frames:v 1 -vf "scale=448:-2" -q:v 7 \
  docs/static/video/NAME.jpg
```

Then add a `<figure class="city">` to the grid in `index.html`. Nothing is
fetched until the mosaic nears the viewport, and clips pause when scrolled away.

## Accessibility and motion

Charts have a table view, figures have alt text, and the info marks give their
tooltip as an `aria-label`. Under `prefers-reduced-motion` the sliding-window
demo holds at step 0 and the city clips never load, leaving their poster frames.

## Credit

Originally derived from the [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template),
itself adopted from [Nerfies](https://nerfies.github.io). None of that template's
code remains. Licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
