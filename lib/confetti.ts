export async function burst(kind: "order" | "scratch") {
	const confetti = (await import("canvas-confetti")).default;
	const base = {
	  colors: ["#c99a45", "#183c32", "#8e352c", "#f7f1e5"],
	  disableForReducedMotion: true,
	  zIndex: 100,
	};
	if (kind === "scratch") {
	  confetti({ ...base, particleCount: 140, spread: 90, origin: { y: 0.6 } });
	  return;
	}
	confetti({ ...base, particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } });
	confetti({ ...base, particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } });
  } 