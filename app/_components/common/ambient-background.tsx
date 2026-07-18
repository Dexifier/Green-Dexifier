import EnergyRays from "./energy-rays";

// Full-screen animated ambient background: energy rays with fading light
// trails, a low emerald aurora orb near the bottom, a perspective grid
// rising from the horizon, and a film-grain overlay.
export default function AmbientBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[#020a05]">
      <div className="aurora-orb aurora-orb-3" />
      <div className="dex-grid" />
      <EnergyRays />
      <div className="dex-noise" />
    </div>
  );
}
