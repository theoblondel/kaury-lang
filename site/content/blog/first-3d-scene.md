---
title: Your first 3D scene, without a model
description: Kaury draws spheres, knots, gems and rings by itself. Add light, a camera that follows the mouse and particles in ten lines.
date: 2026-10-06
minutes: 3
tag: Tutorial
---

You do not need a `.glb` file to start with 3D. Kaury knows nine shapes: `sphere`, `cube`, `torus`, `knot`, `cone`, `cylinder`, `capsule`, `gem` and `pyramid`.

## One object

```kaury
page "/"
  section center
    title "Hello, 3D"
    object "knot", color orange, metal, height 420
      spin slow
      follows mouse, smooth
```

An object alone in a page gets its own little scene. `metal` makes it shine; try `matte`, `glass` or `glow`.

## A full scene

```kaury
page "/"
  scene shapes, height 620, particles dust
    light studio
    camera follows mouse
    object knot "knot", color orange, metal, position -2.6 0 0
      spin slow
    object gem "gem", glass, position 0 0.9 -1
      float
    object ring "torus", color black, matte, position 2.6 0 0
      spin on scroll
      on click -> jump
    title "3D is a word."
```

- `light studio` lights the scene; there are also `soft`, `sunset`, `night`, `neon`, `day` and `dramatic`.
- `camera follows mouse` moves the camera gently with the pointer.
- The title is real HTML, **in front of** the 3D: Google and screen readers read it.

## Why it stays fast

Three.js is loaded only on pages that have 3D, when the scene becomes visible and after the visitor's first gesture. Until then, the page is plain HTML. That is how the 3D example sites keep their 100 on Lighthouse.

When you have a real model, replace `"knot"` by `"chair.glb"`: the rest does not change.

**Next:** [a design system without CSS](/blog/design-system-without-css/)
