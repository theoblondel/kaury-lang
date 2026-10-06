---
title: The language
description: Values, reactive state, functions, conditions, loops, errors, imports and raw JavaScript — the core of Kaury.
order: 3
group: Guide
---

Kaury is a complete language, not a template syntax: it has variables, functions, loops, errors, modules, and it can run programs without any page (`kaury run`). It compiles to plain JavaScript.

## Blocks and comments

A block is a line followed by lines indented by **2 spaces**. No braces, no semicolons.

```kaury
// a comment
if score > 10
  print "well done"
```

## Values

```kaury
let tax = 8.1                 // a fixed value: never changes
state count = 0               // a reactive state: the page follows it
let total = price * quantity  // reads a state → recomputed by itself
delivery = 7                  // assignment (creates the variable if needed)
count += 1
```

Texts are always between double quotes, with `{…}` interpolation:

```kaury
let name = "Ada"
print "Hello {name}, you have {count * 2} points"
```

Numbers can carry a unit: `24px`, `2s`, `300ms`, `50%`, `100vh`, `90deg`, `20/s`. Other values: `true`, `false`, `none`, lists `[1, 2]`, objects `{ name: "Tulip", price: 30 }`, ranges `1..5`.

Names may contain hyphens: `total-price`. Write subtraction with spaces: `a - b`.

## Functions

```kaury
function double x then x * 2        // one line

function total-price cart           // a block: the last line is the result
  sum cart, a -> a.price * a.quantity
```

Call with or without parentheses: `double(4)`, `print total`, `sum cart, a -> a.price`.
Anonymous functions: `x -> x * 2`, `(a, b) -> a + b`, `-> count += 1`.

## Conditions

```kaury
if total > 50
  delivery = 0
else if total > 20
  delivery = 4
else
  delivery = 7

let label = if age >= 18 then "adult" else "child"
```

Comparisons: `== != < > <= >=`. Logic: `and or not`. Membership: `x in list`.

## Loops

```kaury
for p in products
  print p.name
for p, i in products
  print "{i}: {p.name}"
for i in 1..10
  print i
while lives > 0
  lives -= 1
```

`break`, `continue` and `return value` work as expected.

## Lists, texts and objects

```kaury
let cheap = products.filter(p -> p.price < 20)
let names = products.map(p -> p.name).join(", ")
let sorted = products.sort(p -> p.price)
cart.add product
cart.remove product
```

Other methods: `.find`, `.contains`, `.count`, `.unique()`, `.take n`, `.sum fn`, `.upper()`, `.lower()`, `.replace a, b`, `.split sep`, `.trim()`, `.starts-with x`… Properties: `.length`, `.first`, `.last`, `.keys`, `.values`.

## Built-in functions

`print`, `load url`, `send url, data`, `sum`, `average`, `min`, `max`, `round x, 2`, `random 1, 6`, `pick list`, `shuffle`, `range a, b`, `now()`, `format-date d`, `price 12.5`, `every 2s, -> …`, `later 1s, -> …`, `persist "key", state`, `copy text`, `confetti()`, `vibrate`, `scroll-to "id"`, `share {…}`, `json-ld {…}`, `slug "Hello world"`, `await 2s`. See the [reference](/reference/#functions).

## Asynchronous code and errors

```kaury
try
  products = await load "/api/products"
catch e
  print e.message
```

In a page, `await load` never blocks the display: the list fills in when the data arrives.

## Modules

```kaury
import { Card } from "./card.kaury"       // a component of another file
import confetti from "canvas-confetti"   // any npm package
import "theme.css"                        // a stylesheet for every page
```

In `card.kaury`, `export` makes a component (or a function) usable by other files:

```kaury
export component Card name
  card name
```

## Raw JavaScript

When you really need it, a `js` block is copied as is:

```kaury
js
  console.log(navigator.userAgent)
```

## French keywords

Every keyword has a French alias, accents optional: `soit` (`let`), `état` (`state`), `si` (`if`), `pour` (`for`), `titre` (`title`)… Errors follow the language of your system.

## Errors that explain

```
site.kaury:4:10 — "conut" does not exist. Did you mean "count"?
  4 |   button "+1" -> conut += 1
               ^^^^^
```

Every error has the line, the underlined word and a fix. `kaury check --json` gives the same errors to editors and AI assistants.
