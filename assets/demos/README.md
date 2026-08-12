# Paper demo assets

The publication layout already reserves a 16:9 demo area for every paper.

Recommended filenames:

- `patch.gif`
- `posecompass.gif`
- `robots-collaborate.gif`
- `tripilot-ff.gif`
- `guardfed.gif`
- `privacy-fl.gif`
- `fedscope.gif`

To replace a placeholder, keep the `<figure class="paper-demo">` wrapper and replace
`<div class="demo-signal">...</div>` with an image such as:

```html
<img src="assets/demos/patch.gif" alt="PATCH robot manipulation demo" loading="lazy" />
```

Remove `is-reserved` and the placeholder caption when the final media is added.
