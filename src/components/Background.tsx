/** Fixed animated backdrop: drifting colour blobs, a perspective grid and a vignette. */
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="animate-drift absolute -left-[10%] -top-[20%] h-[60vh] w-[60vw] rounded-full bg-hot/20 blur-[120px]" />
      <div className="animate-drift absolute -right-[15%] top-[10%] h-[55vh] w-[50vw] rounded-full bg-cyan/12 blur-[130px] [animation-delay:-7s]" />
      <div className="animate-drift absolute bottom-[-25%] left-[25%] h-[50vh] w-[55vw] rounded-full bg-amber/10 blur-[130px] [animation-delay:-14s]" />
      <div
        className="absolute inset-x-0 bottom-0 h-[55vh] opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.07) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          transform: "perspective(600px) rotateX(60deg)",
          transformOrigin: "bottom",
          maskImage: "linear-gradient(to top, black 10%, transparent 85%)",
          WebkitMaskImage: "linear-gradient(to top, black 10%, transparent 85%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(7_7_12/0.85)_100%)]" />
    </div>
  );
}
