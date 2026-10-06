---
title: A design system without CSS
description: Named styles, states, parts and animations. This very site has zero lines of CSS. Here is how.
date: 2026-10-06
minutes: 5
tag: Guide
---

The site you are reading is written in Kaury, and it has **no CSS file and no CSS block**. Its whole look — pills, cards, the ticker, the code that types itself — is made of three ideas.

## 1. Restyle an element everywhere

A style named after an element applies to all of them:

```kaury
style button
  border 2 black, radius 999, bold

style title
  font "Cabinet Grotesk", weight 800, tracking -1
```

## 2. Create your own words

Any other name makes a new word. Put it on any element line:

```kaury
style card-paper
  background #E9DDB9, radius 24, padding 32
  hover lift 4, shadow hard
  selected background black, color white
  link color orange
  mobile padding 20

page "/"
  section
    column card-paper
      subtitle "Simple to write"
      link "Read more" "/docs/"
```

Inside a style you can describe:

| Kind | Words |
|---|---|
| states | `hover`, `selected`, `current`, `open`, `focus`, `pressed`, `disabled`, `checked` |
| parts inside | `title`, `text`, `link`, `image`, `button`, `code`, `summary`, `emphasis`… |
| screens | `mobile`, `tablet`, `desktop` |

States follow your data: `button "Code", tab-pill, selected (tab == 0)`.

## 3. Animate with words

```kaury
animation scroll-left, 40s, loop, linear
  from move 0 0
  to move -50% 0

page "/"
  section
    row no-wrap, scroll-left
      text "Kaury ✳ Kaury ✳ Kaury ✳"
```

The code that types itself on the home page is the same idea with `steps 12` and `reveal 0%` → `reveal 100%`. An animation with `scroll` plays while the element scrolls into view. Visitors who ask their system for less motion get none, automatically.

## The result

One file, readable from top to bottom: colors, fonts, words, animations, then pages. Look at [the source of this site](https://github.com/theoblondel/kaury-lang/blob/main/site/site.kaury).

**Next:** [let an AI write your Kaury site](/blog/ai-writes-kaury/)
