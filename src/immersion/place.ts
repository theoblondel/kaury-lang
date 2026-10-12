// Where an object of a scene stands, on a screen of any shape. Apart from the 3D library, so it can be tested alone.

/**
 * An object placed to the side of a scene (position 2.3 0 0) is in view on a wide screen and out of it on a phone,
 * where the scene is much narrower than it is tall. On a narrow screen it comes back toward the middle, as far as the
 * screen is narrow, and stays at the side, half in the picture: beside the text as far as a phone allows, not behind
 * it. Nothing changes from a width of 0.9 times the height, and the middle never moves.
 */
export function sideways(x: number, aspect: number): number {
  return x * Math.min(1, Math.max(0.35, aspect / 0.9))
}
