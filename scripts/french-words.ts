// The French words of Kaury, as one compact list for the specification (docs/kaury-ai.md, section 8).
// Run: npx tsx scripts/french-words.ts   — prints the lines; tests/docs.test.ts checks that the specification has them.

import { allKeywords, valueWords, aliasesOf } from '../src/core/keywords.js'
import { optionWords } from '../src/core/vocabulary.js'

/** Aliases that are habits of other languages, not French: left out of the list. */
const NOT_FRENCH = new Set(['const', 'fn', 'null', 'nothing', 'wait', 'str', 'num', 'len', 'money', 'bg', 'rounded', 'caps', 'letter-spacing', 'centered', 'spacing', 'bleed', 'scale', 'rotate', 'blank', 'input', 'hand', 'up', 'down', 'soft-motion', 'no-underline', 'grey', 'goto', 'iframe', 'children', 'md', 'language', 'alternates', 'hreflang', 'model', 'lighting', 'javascript'])

export function frenchWords(): { keywords: string; options: string } {
  const line = (pairs: [string, string[]][]) => pairs
    .map(([en, fr]) => [en, fr.filter((w) => !NOT_FRENCH.has(w))] as const)
    .filter(([, fr]) => fr.length)
    .map(([en, fr]) => `${en} = ${fr.join(' / ')}`)
    .join(' · ')
  return {
    keywords: line([...new Set([...allKeywords(), ...valueWords()])].map((k) => [k, aliasesOf(k)])),
    options: line(optionWords()),
  }
}

if (process.argv[1]?.endsWith('french-words.ts')) {
  const w = frenchWords()
  console.log('**Keywords, elements and values**: ' + w.keywords + '\n\n**Options**: ' + w.options)
}
