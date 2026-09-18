# Paper demo assets

## StereoPatch

- Paper: https://arxiv.org/abs/2609.15509
- Project: https://aus.bot/research/stereopatch/
- Source: https://github.com/YananZHOU5555/stereopatch/releases/download/media-v1/bowl-720p30.mp4
- `stereopatch.mp4`: the full 69.37-second selected bowl-extraction demo, resized to 960×540 H.264 at 30 fps, CRF 25, with fast-start metadata. Timing is unchanged; the source already shows 4× real-time playback.
- `stereopatch.jpg`: frame at 1 second from the same source, resized to 960×540. No generated or retouched experiment imagery.

The preview is qualitative; the linked project page supplies the evaluation protocol and quantitative results.

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
