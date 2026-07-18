// Full-screen animated ambient background: drifting aurora orbs in brand
// colors, a perspective grid rising from the horizon, and a film-grain
// overlay. Pure CSS animation, GPU-composited transforms only.
export default function AmbientBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[#020a05]">
      <div className="aurora-orb aurora-orb-1" />
      <div className="aurora-orb aurora-orb-2" />
      <div className="aurora-orb aurora-orb-3" />
      <div className="dex-grid" />
      <div className="dex-noise" />
    </div>
  );
}
