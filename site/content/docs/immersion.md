---
title: Immersion — 3D, scenes, characters
description: Objects, scenes, lights, cameras, characters, motions, particles and sound. 3D in one line, Lighthouse still at 100.
order: 5
group: Guide
---

Immersion in Kaury has three levels, and the code is the same for all three:

- a **touch**: one `object` alone in a page;
- a **scene**: a `scene` with decor, light and camera;
- a **universe**: the whole site.

An object can be 2D (`.png .jpg .webp .svg`), animated 2D (`.json` Lottie) or 3D (`.glb .gltf`, Meshopt or Draco compressed). Files go in `public/`.

## A touch

```kaury
section hero, center
  title "Hello"
  object star "star.svg", size 0.6
    float
    follows mouse, smooth
    on click -> jump
```

## A scene

```kaury
scene home, fullscreen, particles bubbles
  light sunset
  camera follows mouse
  object can "can.glb", size 1.2, position 2 0 0, alt "A can of Crush"
    spin on scroll
    follows mouse, smooth
  title "Taste the difference"
```

Everything that is not 3D (titles, texts, buttons) goes **in front of** the 3D, as real HTML: readable by Google, by screen readers and by AI assistants.

| Option | Values |
|---|---|
| `light` | `studio`, `soft`, `sunset`, `night`, `neon`, `day`, `dramatic` |
| `camera` | `fixed`, `follows mouse`, `fly`, `free`, `orbit` |
| `particles` | `stars`, `snow`, `bubbles`, `dust`, `confetti` |
| scene options | `height`, `background`, `fog`, `ground`, `immediate` |
| object options | `size`, `position x y z`, `rotation x y z`, `fallback "image.png"`, `shadows`, `alt`, `immediate` |

## Motions

A motion on a child line is permanent; after `->` it plays once.

```kaury
object gem "gem.glb"
  spin 90/s            // also: spin, spin slow, spin x, spin on scroll
  float
  enters from right    // left | right | top | bottom | fade | zoom
  on click -> jump
```

Motions: `spin`, `float`, `jump`, `pulse`, `sway`, `follows mouse`, `enters from …`, `parallax 0.3`, `says "text"`, `play "animation"`. Modifiers: `smooth`, `slow`, `fast`, `reverse`. Target a named object from anywhere: `-> jump gem`.

`enters from …` also works on any HTML element: titles and cards appear as you scroll.

## Characters

A `character` is an object with named animations (from your `.glb`):

```kaury
character mascot "mascot.glb", animation "idle"
  enters from right
  says "Hi! Click me."
  on click -> play "dance"
```

## Sound

```kaury
sound "ambient.mp3", loop, volume 0.4   // a mute button appears by itself
button "Pop" -> sound "pop.mp3"
```

## Why it stays fast

The rules are automatic, you write nothing for them:

1. The 3D library (Three.js) is loaded **only on pages that contain 3D**.
2. It loads **when the scene becomes visible**, after the page is displayed and the visitor's **first gesture** (add `immediate` to skip the wait).
3. The HTML content exists before the 3D: the page is readable instantly.
4. `prefers-reduced-motion` is respected.
5. On narrow screens the camera steps back.
6. If the device cannot do 3D, `fallback "image.png"` is shown.

Result: the example site [Crush](https://github.com/theoblondel/kaury-lang/tree/main/examples/crush), with an animated 3D character, scores **100 / 100 / 100 / 100** on Lighthouse, on mobile and desktop.
