// === Component

/*
  Pre-painted scroll-progress rail. useScrollProgress (mounted via AmbientBackground)
  writes --scroll-progress every frame; the CSS scaleXs this bar. Purely decorative.
*/
export function ScrollProgress() {
  return <div className="scroll-rail" aria-hidden="true" />;
}
