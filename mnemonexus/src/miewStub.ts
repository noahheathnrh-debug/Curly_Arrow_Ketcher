/**
 * Stand-in for Ketcher's 3D structure viewer.
 *
 * `miew-react` brings three.js with it - together comfortably over half a
 * megabyte - and the pack's code cap is on uncompressed bytes, so it is the
 * single largest thing in the bundle that the trainer cannot reach. The 3D
 * dialog is opened from a toolbar entry the puzzle capability profile withholds,
 * so the real viewer is unreachable code that still has to be paid for.
 *
 * Only the pack build substitutes this. The standalone app keeps the real
 * viewer, because it has no size cap and staying closer to real Ketcher is
 * worth more there than the bytes are.
 */
export default function MiewUnavailable(): null {
  return null
}
