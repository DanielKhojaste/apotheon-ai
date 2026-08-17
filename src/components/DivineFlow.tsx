import { useEffect, useRef } from "react";

type DivineFlowProps = {
	className?: string;
	lineCount?: number;
	/** Horizontal clearance from the center before lines become visible. */
	innerGap?: number;
	/** 0..1 vertical position of the helmet / flow origin. */
	originY?: number;
	/** Overall animation intensity. 0 disables motion. */
	motion?: number;
	/** Mouse/touch repulsion radius in CSS pixels. */
	pointerRadius?: number;
	/** Mouse/touch repulsion strength in CSS pixels. */
	pointerStrength?: number;
};

type PointerState = {
	x: number;
	y: number;
	active: boolean;
};

type Stream = {
	side: -1 | 1;
	index: number;
	phase: number;
	speed: number;
	waveAmp: number;
	width: number;
	alpha: number;
	startOffsetY: number;
	endOffsetY: number;
	controlLift: number;
	particles: Array<{
		phase: number;
		speed: number;
		size: number;
		glow: number;
	}>;
};

const TAU = Math.PI * 2;

function mulberry32(seed: number) {
	return function random() {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number) {
	const mt = 1 - t;
	return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function measureBox(el: HTMLElement) {
	let node: HTMLElement | null = el;

	while (node) {
		const rect = node.getBoundingClientRect();
		if (rect.width >= 2 && rect.height >= 2) return rect;
		node = node.parentElement;
	}

	return {
		width: window.innerWidth,
		height: window.innerHeight,
		left: 0,
		top: 0,
	};
}

export default function DivineFlow({
	className,
	lineCount = 7,
	innerGap = 260,
	originY = 0.5,
	motion = 1,
	pointerRadius = 190,
	pointerStrength = 24,
}: DivineFlowProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const frame = frameRef.current;
		if (!canvas || !frame) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		const pointer: PointerState = { x: 0, y: 0, active: false };
		let width = 1;
		let height = 1;
		let dpr = 1;
		let raf = 0;
		let running = true;

		const random = mulberry32(9127);
		const streams: Stream[] = [];

		for (const side of [-1, 1] as const) {
			for (let i = 0; i < lineCount; i += 1) {
				const normalized = lineCount === 1 ? 0 : i / (lineCount - 1);
				const centered = normalized * 2 - 1;

				streams.push({
					side,
					index: i,
					phase: random() * TAU,
					speed: 0.42 + random() * 0.38,
					waveAmp: 5 + random() * 11,
					width: 1.15 + random() * 1.15,
					alpha: 0.58 + random() * 0.34,
					startOffsetY: centered * 125 + (random() - 0.5) * 26,
					endOffsetY: centered * 330 + (random() - 0.5) * 80,
					controlLift: (random() - 0.5) * 120,
					particles: Array.from({ length: random() > 0.35 ? 2 : 1 }, () => ({
						phase: random(),
						speed: 0.035 + random() * 0.055,
						size: 1.1 + random() * 1.8,
						glow: 8 + random() * 13,
					})),
				});
			}
		}

		function resize() {
			const rect = measureBox(frame);
			width = Math.max(1, Math.round(rect.width));
			height = Math.max(1, Math.round(rect.height));
			dpr = Math.min(window.devicePixelRatio || 1, 2);

			canvas.width = Math.round(width * dpr);
			canvas.height = Math.round(height * dpr);
			canvas.style.width = "100%";
			canvas.style.height = "100%";

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		function onPointerMove(event: PointerEvent) {
			const rect = measureBox(frame);
			pointer.x = event.clientX - rect.left;
			pointer.y = event.clientY - rect.top;
			pointer.active =
				pointer.x >= 0 && pointer.x <= rect.width && pointer.y >= 0 && pointer.y <= rect.height;
		}

		function onPointerLeave() {
			pointer.active = false;
		}

		function pointOnStream(stream: Stream, u: number, time: number) {
			const cx = width * 0.5;
			const cy = height * originY;
			const responsiveGap = Math.min(innerGap, Math.max(115, width * 0.17));
			const side = stream.side;

			const startX = cx + side * responsiveGap;
			const startY = cy + stream.startOffsetY;
			const endX = side === 1 ? width + 70 : -70;
			const endY = cy + stream.endOffsetY;

			const horizontalSpan = Math.abs(endX - startX);
			const c1x = startX + side * horizontalSpan * 0.32;
			const c2x = startX + side * horizontalSpan * 0.72;
			const c1y = startY + stream.controlLift;
			const c2y = endY - stream.controlLift * 0.45;

			let x = cubicBezier(u, startX, c1x, c2x, endX);
			let y = cubicBezier(u, startY, c1y, c2y, endY);

			// Layered sine motion: endpoints stay visually anchored while the middle breathes.
			const envelope = Math.sin(Math.PI * u);
			const slowWave = Math.sin(u * TAU * 1.15 + time * stream.speed + stream.phase);
			const fineWave = Math.sin(u * TAU * 2.2 - time * stream.speed * 0.55 + stream.phase * 0.7);
			y += (slowWave * stream.waveAmp + fineWave * stream.waveAmp * 0.28) * envelope * motion;

			// Very subtle horizontal breathing keeps the ribbons from looking like SVG rails.
			x += Math.cos(u * TAU + time * 0.28 + stream.phase) * 2.2 * envelope * motion;

			// Local pointer repulsion. Because we distort sampled points, only the nearby
			// piece of the filament bends instead of moving the entire curve.
			if (pointer.active && !reducedMotion) {
				const dx = x - pointer.x;
				const dy = y - pointer.y;
				const distSq = dx * dx + dy * dy;
				const radiusSq = pointerRadius * pointerRadius;

				if (distSq < radiusSq && distSq > 0.01) {
					const dist = Math.sqrt(distSq);
					const falloff = 1 - dist / pointerRadius;
					const force = falloff * falloff * pointerStrength;
					x += (dx / dist) * force;
					y += (dy / dist) * force;
				}
			}

			return { x, y };
		}

		function drawStream(stream: Stream, time: number) {
			const samples = Math.max(58, Math.min(105, Math.round(width / 18)));
			const points = new Array(samples + 1);

			for (let i = 0; i <= samples; i += 1) {
				points[i] = pointOnStream(stream, i / samples, time);
			}

			// Soft aura pass.
			ctx.beginPath();
			ctx.moveTo(points[0].x, points[0].y);
			for (let i = 1; i < points.length; i += 1) {
				ctx.lineTo(points[i].x, points[i].y);
			}
			ctx.strokeStyle = `rgba(216, 168, 82, ${Math.min(1, stream.alpha * 0.42)})`;
			ctx.lineWidth = stream.width * 6.2;
			ctx.shadowColor = "rgba(255, 198, 96, .7)";
			ctx.shadowBlur = 18;
			ctx.stroke();

			// Crisp filament pass.
			ctx.beginPath();
			ctx.moveTo(points[0].x, points[0].y);
			for (let i = 1; i < points.length; i += 1) {
				ctx.lineTo(points[i].x, points[i].y);
			}
			ctx.strokeStyle = `rgba(255, 224, 160, ${Math.min(1, stream.alpha)})`;
			ctx.lineWidth = stream.width;
			ctx.shadowBlur = 8;
			ctx.stroke();

			// Tiny secondary highlight on selected streams.
			if (stream.index % 3 === 1) {
				ctx.beginPath();
				ctx.moveTo(points[0].x, points[0].y);
				for (let i = 1; i < points.length; i += 1) {
					ctx.lineTo(points[i].x, points[i].y);
				}
				ctx.strokeStyle = `rgba(255, 234, 184, ${stream.alpha * 0.34})`;
				ctx.lineWidth = Math.max(0.45, stream.width * 0.45);
				ctx.shadowBlur = 3;
				ctx.stroke();
			}

			// Particles / bright nodes travel along the same curved geometry.
			for (const particle of stream.particles) {
				const u = reducedMotion
					? particle.phase
					: (particle.phase + time * particle.speed * motion) % 1;
				const p = pointOnStream(stream, u, time);

				const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, particle.glow);
				halo.addColorStop(0, "rgba(255, 247, 219, .95)");
				halo.addColorStop(0.18, "rgba(255, 209, 120, .72)");
				halo.addColorStop(1, "rgba(255, 183, 68, 0)");

				ctx.fillStyle = halo;
				ctx.beginPath();
				ctx.arc(p.x, p.y, particle.glow, 0, TAU);
				ctx.fill();

				ctx.fillStyle = "rgba(255, 244, 211, .95)";
				ctx.beginPath();
				ctx.arc(p.x, p.y, particle.size, 0, TAU);
				ctx.fill();
			}
		}

		function drawAmbientDust(time: number) {
			// Deterministic, very sparse dust: enough to imply particles without turning
			// the hero into a star field.
			const count = Math.min(44, Math.round(width / 30));
			const randomDust = mulberry32(32119);
			const cx = width * 0.5;
			const cy = height * originY;
			const responsiveGap = Math.min(innerGap, Math.max(115, width * 0.17));

			ctx.shadowBlur = 0;
			for (let i = 0; i < count; i += 1) {
				const side = randomDust() > 0.5 ? 1 : -1;
				const minX = cx + side * responsiveGap;
				const spread = width * 0.45;
				const baseX = minX + side * randomDust() * spread;
				const baseY = cy + (randomDust() - 0.5) * height * 0.62;
				const drift = reducedMotion
					? 0
					: Math.sin(time * (0.14 + randomDust() * 0.2) + i) * 3 * motion;
				const pulse = 0.13 + (Math.sin(time * 0.8 + i * 1.7) + 1) * 0.09;
				const r = 0.45 + randomDust() * 0.8;

				ctx.fillStyle = `rgba(228, 180, 95, ${pulse})`;
				ctx.beginPath();
				ctx.arc(baseX, baseY + drift, r, 0, TAU);
				ctx.fill();
			}
		}

		function render(now: number) {
			if (!running) return;

			const rect = measureBox(frame);
			if (Math.round(rect.width) !== width || Math.round(rect.height) !== height) {
				resize();
			}

			const time = now * 0.001;

			ctx.clearRect(0, 0, width, height);
			ctx.globalCompositeOperation = "lighter";

			drawAmbientDust(time);
			for (const stream of streams) drawStream(stream, time);

			ctx.globalCompositeOperation = "source-over";
			ctx.shadowBlur = 0;

			if (!reducedMotion && motion > 0) {
				raf = requestAnimationFrame(render);
			}
		}

		const observer = new ResizeObserver(() => {
			resize();
			if (reducedMotion || motion <= 0) render(performance.now());
		});

		resize();
		observer.observe(frame);
		window.addEventListener("resize", resize);
		window.addEventListener("pointermove", onPointerMove, { passive: true });
		window.addEventListener("pointerout", onPointerLeave, { passive: true });

		raf = requestAnimationFrame(render);

		return () => {
			running = false;
			cancelAnimationFrame(raf);
			observer.disconnect();
			window.removeEventListener("resize", resize);
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerout", onPointerLeave);
		};
	}, [innerGap, lineCount, motion, originY, pointerRadius, pointerStrength]);

	return (
		<div
			ref={frameRef}
			className={className}
			aria-hidden="true"
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 0,
				width: "100%",
				height: "100%",
				pointerEvents: "none",
				overflow: "hidden",
				mixBlendMode: "screen",
			}}
		>
			<canvas
				ref={canvasRef}
				style={{
					display: "block",
					width: "100%",
					height: "100%",
				}}
			/>
		</div>
	);
}
