import { useEffect, useRef } from "react";

type DivineFlowProps = {
	className?: string;
	/** Bundles per side. Each bundle is several overlapping filaments. */
	lineCount?: number;
	/** How far from center filaments emerge (CSS px, capped by viewport). */
	innerGap?: number;
	/** 0..1 vertical position of the helmet / flow origin. */
	originY?: number;
	/** Overall animation intensity. 0 disables motion. */
	motion?: number;
};

type Thread = {
	side: -1 | 1;
	startY: number;
	endY: number;
	startInset: number;
	endOvershoot: number;
	c1t: number;
	c2t: number;
	bow1: number;
	bow2: number;
	offset: number;
	amp1: number;
	amp2: number;
	speed: number;
	phase: number;
	seed: number;
	coreWidth: number;
	glowWidth: number;
	alpha: number;
	pulsePhase: number;
	pulseSpeed: number;
	pulseLength: number;
	shimmerSpeed: number;
};

type Sparkle = {
	thread: number;
	phase: number;
	speed: number;
	size: number;
	flare: boolean;
	tilt: number;
	twinklePhase: number;
	twinkleSpeed: number;
};

type Speck = {
	thread: number;
	u: number;
	nOff: number;
	size: number;
	phase: number;
	drift: number;
};

type Ember = {
	thread: number;
	phase: number;
	speed: number;
	size: number;
};

type Pt = { x: number; y: number };

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

function cubicBezier1(t: number, p0: number, p1: number, p2: number, p3: number) {
	const mt = 1 - t;
	return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2);
}

function smoothNoise(x: number, seed: number) {
	const i0 = Math.floor(x);
	const i1 = i0 + 1;
	const f = x - i0;
	const s = f * f * (3 - 2 * f);
	const hash = (n: number) => {
		const k = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
		return k - Math.floor(k);
	};
	return hash(i0) * (1 - s) + hash(i1) * s;
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

function strokeRange(
	ctx: CanvasRenderingContext2D,
	points: Pt[],
	u0: number,
	u1: number,
	width: number,
	color: string | CanvasGradient,
) {
	const last = points.length - 1;
	const i0 = Math.max(0, Math.floor(u0 * last));
	const i1 = Math.min(last, Math.ceil(u1 * last));
	if (i1 <= i0) return;

	ctx.beginPath();
	ctx.moveTo(points[i0].x, points[i0].y);
	for (let i = i0 + 1; i <= i1; i += 1) {
		ctx.lineTo(points[i].x, points[i].y);
	}
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.stroke();
}

function pointAt(points: Pt[], u: number): Pt {
	const last = points.length - 1;
	const f = Math.max(0, Math.min(1, u)) * last;
	const i = Math.min(last - 1, Math.floor(f));
	const t = f - i;
	return {
		x: points[i].x + (points[i + 1].x - points[i].x) * t,
		y: points[i].y + (points[i + 1].y - points[i].y) * t,
	};
}

function normalAt(points: Pt[], u: number): Pt {
	const last = points.length - 1;
	const i = Math.max(1, Math.min(last - 1, Math.round(u * last)));
	const dx = points[i + 1].x - points[i - 1].x;
	const dy = points[i + 1].y - points[i - 1].y;
	const len = Math.hypot(dx, dy) || 1;
	return { x: -dy / len, y: dx / len };
}

export default function DivineFlow({
	className,
	lineCount = 8,
	innerGap = 108,
	originY = 0.5,
	motion = 1,
}: DivineFlowProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const frameRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const frame = frameRef.current;
		if (!canvas || !frame) return;

		const ctx = canvas.getContext("2d", { alpha: true });
		if (!ctx) return;

		const bloomCanvas = document.createElement("canvas");
		const bloomCtx = bloomCanvas.getContext("2d", { alpha: true });
		if (!bloomCtx) return;

		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		let width = 1;
		let height = 1;
		let dpr = 1;
		let raf = 0;
		let running = true;

		const threads: Thread[] = [];
		const sparkles: Sparkle[] = [];
		const specks: Speck[] = [];
		const embers: Ember[] = [];

		for (const side of [-1, 1] as const) {
			const random = mulberry32(8400 + side * 173);

			for (let b = 0; b < lineCount; b += 1) {
				const t = lineCount === 1 ? 0.5 : b / (lineCount - 1);
				const centered = t * 2 - 1;
				const startY = centered * 0.078 + (random() - 0.5) * 0.016;
				const endY = centered * 0.43 + (random() - 0.5) * 0.045;
				const importance = 1 - Math.abs(centered) * 0.42;
				const bundleAlpha = (0.38 + random() * 0.5) * (0.72 + importance * 0.28);
				const bundlePhase = random() * TAU;
				const threadCount =
					Math.abs(centered) < 0.34 ? 3 + Math.floor(random() * 3) : 2 + Math.floor(random() * 2);
				const mid = (threadCount - 1) / 2;

				for (let k = 0; k < threadCount; k += 1) {
					const spread = k - mid;
					threads.push({
						side,
						startY: startY + spread * 0.0035,
						endY: endY + spread * 0.01,
						startInset: random(),
						endOvershoot: 0.03 + random() * 0.05,
						c1t: 0.24 + random() * 0.12,
						c2t: 0.58 + random() * 0.16,
						bow1: centered * 0.085 + (random() - 0.5) * 0.04,
						bow2: -centered * 0.02 + (random() - 0.5) * 0.028,
						offset: spread * (0.0022 + random() * 0.0014),
						amp1: 0.003 + random() * 0.0045,
						amp2: 0.0012 + random() * 0.0024,
						speed: 0.16 + random() * 0.2,
						phase: bundlePhase + spread * 0.35 + random() * 0.5,
						seed: 20 + random() * 200,
						coreWidth: 0.32 + random() * 0.7 + importance * 0.2,
						glowWidth: 5 + random() * 8 + importance * 3.5,
						alpha: bundleAlpha * (0.55 + random() * 0.45),
						pulsePhase: random(),
						pulseSpeed: 0.035 + random() * 0.05,
						pulseLength: 0.07 + random() * 0.09,
						shimmerSpeed: 0.22 + random() * 0.35,
					});
				}
			}

			for (let w = 0; w < 4; w += 1) {
				const centered = (random() * 2 - 1) * 0.92;
				threads.push({
					side,
					startY: centered * 0.07,
					endY: centered * 0.46 + (random() - 0.5) * 0.08,
					startInset: random(),
					endOvershoot: 0.02 + random() * 0.06,
					c1t: 0.2 + random() * 0.18,
					c2t: 0.55 + random() * 0.22,
					bow1: centered * 0.09 + (random() - 0.5) * 0.06,
					bow2: (random() - 0.5) * 0.05,
					offset: (random() - 0.5) * 0.008,
					amp1: 0.008 + random() * 0.01,
					amp2: 0.004 + random() * 0.006,
					speed: 0.16 + random() * 0.28,
					phase: random() * TAU,
					seed: 40 + random() * 180,
					coreWidth: 0.3 + random() * 0.4,
					glowWidth: 2.8 + random() * 3.4,
					alpha: 0.07 + random() * 0.11,
					pulsePhase: random(),
					pulseSpeed: 0.03 + random() * 0.04,
					pulseLength: 0.05 + random() * 0.07,
					shimmerSpeed: 0.18 + random() * 0.3,
				});
			}
		}

		const sparkleRandom = mulberry32(22101);
		const sparkleCount = 20;
		for (let i = 0; i < sparkleCount; i += 1) {
			sparkles.push({
				thread: Math.floor(sparkleRandom() * threads.length),
				phase: 0.18 + sparkleRandom() * 0.7,
				speed: sparkleRandom() < 0.45 ? 0.012 + sparkleRandom() * 0.02 : 0.003 + sparkleRandom() * 0.008,
				size: sparkleRandom() < 0.28 ? 1.8 + sparkleRandom() * 1.6 : 0.85 + sparkleRandom() * 0.9,
				flare: sparkleRandom() < 0.32,
				tilt: (sparkleRandom() - 0.5) * 0.5,
				twinklePhase: sparkleRandom() * TAU,
				twinkleSpeed: 1.1 + sparkleRandom() * 1.8,
			});
		}

		const speckRandom = mulberry32(77411);
		const speckCount = Math.min(96, 48 + lineCount * 4);
		for (let i = 0; i < speckCount; i += 1) {
			specks.push({
				thread: Math.floor(speckRandom() * threads.length),
				u: 0.12 + speckRandom() * 0.8,
				nOff: (speckRandom() - 0.5) * 18,
				size: 0.35 + speckRandom() * 0.9,
				phase: speckRandom() * TAU,
				drift: 0.12 + speckRandom() * 0.22,
			});
		}

		const emberRandom = mulberry32(4099);
		for (let i = 0; i < 14; i += 1) {
			embers.push({
				thread: Math.floor(emberRandom() * threads.length),
				phase: emberRandom(),
				speed: 0.045 + emberRandom() * 0.07,
				size: 0.55 + emberRandom() * 0.7,
			});
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
			ctx.lineCap = "round";
			ctx.lineJoin = "round";

			const bloomScale = 0.38;
			bloomCanvas.width = Math.max(1, Math.round(width * bloomScale));
			bloomCanvas.height = Math.max(1, Math.round(height * bloomScale));
			bloomCtx.setTransform(bloomCanvas.width / width, 0, 0, bloomCanvas.height / height, 0, 0);
			bloomCtx.lineCap = "round";
			bloomCtx.lineJoin = "round";
		}

		function pointOnThread(thread: Thread, u: number, time: number): Pt {
			const cx = width * 0.5;
			const cy = height * originY;
			const originR = Math.min(innerGap, Math.max(64, width * 0.072));
			const startX = cx + thread.side * originR * (0.42 + thread.startInset * 0.28);
			const startY = cy + thread.startY * height;
			const endX =
				thread.side === 1 ? width + thread.endOvershoot * width : -thread.endOvershoot * width;
			const endY = cy + thread.endY * height;
			const span = Math.abs(endX - startX);
			const c1x = startX + thread.side * span * thread.c1t;
			const c1y = startY + thread.bow1 * height;
			const c2x = startX + thread.side * span * thread.c2t;
			const c2y = endY + thread.bow2 * height;

			const x0 = cubicBezier(u, startX, c1x, c2x, endX);
			const y0 = cubicBezier(u, startY, c1y, c2y, endY);
			const dx = cubicBezier1(u, startX, c1x, c2x, endX);
			const dy = cubicBezier1(u, startY, c1y, c2y, endY);
			const len = Math.hypot(dx, dy) || 1;
			const nx = -dy / len;
			const ny = dx / len;

			const tMotion = reducedMotion ? 0 : time;
			const envelope = Math.sin(Math.PI * u);
			const n1 = smoothNoise(u * 2.3 + tMotion * thread.speed + thread.phase, thread.seed);
			const n2 = smoothNoise(u * 5.6 - tMotion * thread.speed * 0.38 + thread.phase * 1.35, thread.seed + 9);
			const wave =
				((n1 - 0.5) * thread.amp1 + (n2 - 0.5) * thread.amp2) * envelope * motion * height;
			const rest = thread.offset * height * (0.4 + 0.6 * envelope);

			return {
				x: x0 + nx * (wave + rest),
				y: y0 + ny * (wave + rest),
			};
		}

		function sampleThread(thread: Thread, time: number, samples: number) {
			const points = new Array<Pt>(samples + 1);
			for (let i = 0; i <= samples; i += 1) {
				points[i] = pointOnThread(thread, i / samples, time);
			}
			return points;
		}

		function drawOriginBloom(target: CanvasRenderingContext2D) {
			const cx = width * 0.5;
			const cy = height * originY;
			const rx = Math.min(width, height) * 0.22;
			const ry = Math.min(width, height) * 0.3;

			target.save();
			target.translate(cx, cy);
			target.scale(1, ry / rx);
			const glow = target.createRadialGradient(0, 0, rx * 0.12, 0, 0, rx);
			glow.addColorStop(0, "rgba(255, 196, 110, 0.14)");
			glow.addColorStop(0.32, "rgba(196, 132, 48, 0.06)");
			glow.addColorStop(1, "rgba(0, 0, 0, 0)");
			target.fillStyle = glow;
			target.beginPath();
			target.arc(0, 0, rx, 0, TAU);
			target.fill();
			target.restore();
		}

		function drawSparkle(
			x: number,
			y: number,
			size: number,
			intensity: number,
			flare: boolean,
			tilt: number,
		) {
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(flare ? 0 : tilt);

			const radius = size * (flare ? 7.2 : 4.4);
			const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
			disc.addColorStop(0, `rgba(255, 250, 236, ${0.92 * intensity})`);
			disc.addColorStop(0.1, `rgba(255, 220, 150, ${0.5 * intensity})`);
			disc.addColorStop(0.28, `rgba(210, 148, 62, ${0.16 * intensity})`);
			disc.addColorStop(1, "rgba(0, 0, 0, 0)");
			ctx.fillStyle = disc;
			ctx.beginPath();
			ctx.arc(0, 0, radius, 0, TAU);
			ctx.fill();

			const hx = flare ? size * 15 : size * 3.2;
			const hy = flare ? size * 0.16 : size * 0.2;
			const hg = ctx.createLinearGradient(-hx, 0, hx, 0);
			hg.addColorStop(0, "rgba(255, 230, 180, 0)");
			hg.addColorStop(0.5, `rgba(255, 248, 230, ${0.88 * intensity})`);
			hg.addColorStop(1, "rgba(255, 230, 180, 0)");
			ctx.fillStyle = hg;
			ctx.beginPath();
			ctx.moveTo(-hx, 0);
			ctx.lineTo(0, -hy);
			ctx.lineTo(hx, 0);
			ctx.lineTo(0, hy);
			ctx.closePath();
			ctx.fill();

			const vx = flare ? size * 0.15 : size * 0.18;
			const vy = flare ? size * 5.6 : size * 2.4;
			const vg = ctx.createLinearGradient(0, -vy, 0, vy);
			vg.addColorStop(0, "rgba(255, 230, 180, 0)");
			vg.addColorStop(0.5, `rgba(255, 248, 230, ${0.72 * intensity})`);
			vg.addColorStop(1, "rgba(255, 230, 180, 0)");
			ctx.fillStyle = vg;
			ctx.beginPath();
			ctx.moveTo(0, -vy);
			ctx.lineTo(vx, 0);
			ctx.lineTo(0, vy);
			ctx.lineTo(-vx, 0);
			ctx.closePath();
			ctx.fill();

			ctx.fillStyle = `rgba(255, 252, 245, ${intensity})`;
			ctx.beginPath();
			ctx.arc(0, 0, Math.max(0.5, size * 0.28), 0, TAU);
			ctx.fill();
			ctx.restore();
		}

		function render(now: number) {
			if (!running) return;

			const rect = measureBox(frame);
			if (Math.round(rect.width) !== width || Math.round(rect.height) !== height) {
				resize();
			}

			const time = now * 0.001;
			const samples = Math.max(64, Math.min(120, Math.round(width / 16)));
			const sampled = threads.map((thread) => sampleThread(thread, time, samples));

			bloomCtx.setTransform(bloomCanvas.width / width, 0, 0, bloomCanvas.height / height, 0, 0);
			bloomCtx.globalCompositeOperation = "source-over";
			bloomCtx.clearRect(0, 0, width, height);
			bloomCtx.globalCompositeOperation = "lighter";
			drawOriginBloom(bloomCtx);

			for (let i = 0; i < threads.length; i += 1) {
				const thread = threads[i];
				const shimmer = 0.78 + 0.22 * Math.sin(time * thread.shimmerSpeed + thread.phase);
				const a = thread.alpha * shimmer;
				strokeRange(bloomCtx, sampled[i], 0, 1, thread.glowWidth * 1.55, `rgba(214, 154, 64, ${a * 0.55})`);
				strokeRange(bloomCtx, sampled[i], 0.04, 1, thread.glowWidth * 0.7, `rgba(240, 196, 118, ${a * 0.32})`);
			}

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.globalCompositeOperation = "source-over";
			ctx.clearRect(0, 0, width, height);
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = "high";
			ctx.globalCompositeOperation = "lighter";
			ctx.globalAlpha = 0.9;
			ctx.drawImage(bloomCanvas, 0, 0, width, height);
			ctx.globalAlpha = 0.35;
			ctx.drawImage(bloomCanvas, 0, 0, width, height);
			ctx.globalAlpha = 1;

			for (let i = 0; i < threads.length; i += 1) {
				const thread = threads[i];
				const points = sampled[i];
				const shimmer = 0.8 + 0.2 * Math.sin(time * thread.shimmerSpeed + thread.phase);
				const a = Math.min(1, thread.alpha * shimmer);
				const origin = points[0];
				const tip = points[points.length - 1];
				const fade = ctx.createLinearGradient(origin.x, origin.y, tip.x, tip.y);
				fade.addColorStop(0, `rgba(255, 232, 186, 0)`);
				fade.addColorStop(0.12, `rgba(255, 228, 176, ${a * 0.9})`);
				fade.addColorStop(0.55, `rgba(255, 236, 196, ${a})`);
				fade.addColorStop(1, `rgba(220, 164, 78, ${a * 0.12})`);

				const glow = ctx.createLinearGradient(origin.x, origin.y, tip.x, tip.y);
				glow.addColorStop(0, `rgba(224, 170, 82, 0)`);
				glow.addColorStop(0.1, `rgba(224, 170, 82, ${a * 0.28})`);
				glow.addColorStop(0.6, `rgba(224, 170, 82, ${a * 0.16})`);
				glow.addColorStop(1, `rgba(224, 170, 82, 0)`);

				strokeRange(ctx, points, 0.02, 1, thread.glowWidth * 0.4, glow);
				strokeRange(ctx, points, 0.06, 0.46, thread.coreWidth * 1.25, fade);
				strokeRange(ctx, points, 0.4, 0.98, thread.coreWidth * 0.72, fade);

				if (thread.alpha > 0.28) {
					strokeRange(
						ctx,
						points,
						0.1,
						0.9,
						Math.max(0.28, thread.coreWidth * 0.32),
						`rgba(255, 248, 228, ${a * 0.28})`,
					);
				}

				if (!reducedMotion && motion > 0) {
					const pulseU = (thread.pulsePhase + time * thread.pulseSpeed * motion) % 1;
					strokeRange(
						ctx,
						points,
						Math.max(0.06, pulseU - thread.pulseLength),
						Math.max(pulseU, 0.08),
						thread.coreWidth * 1.2,
						`rgba(255, 244, 214, ${a * 0.5})`,
					);
				}
			}

			for (const speck of specks) {
				const points = sampled[speck.thread];
				const p = pointAt(points, speck.u);
				const n = normalAt(points, speck.u);
				const wander = reducedMotion ? 0 : Math.sin(time * speck.drift + speck.phase) * 2.2 * motion;
				const pulse = 0.07 + (Math.sin(time * 0.7 + speck.phase) + 1) * 0.06;
				ctx.fillStyle = `rgba(228, 178, 92, ${pulse})`;
				ctx.beginPath();
				ctx.arc(p.x + n.x * speck.nOff, p.y + n.y * speck.nOff + wander, speck.size, 0, TAU);
				ctx.fill();
			}

			for (const ember of embers) {
				const u = reducedMotion ? ember.phase : (ember.phase + time * ember.speed * motion) % 1;
				if (u < 0.08 || u > 0.96) continue;
				const p = pointAt(sampled[ember.thread], u);
				const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, ember.size * 4.5);
				g.addColorStop(0, "rgba(255, 246, 220, 0.85)");
				g.addColorStop(0.35, "rgba(255, 206, 120, 0.28)");
				g.addColorStop(1, "rgba(0, 0, 0, 0)");
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(p.x, p.y, ember.size * 4.5, 0, TAU);
				ctx.fill();
				ctx.fillStyle = "rgba(255, 250, 236, 0.9)";
				ctx.beginPath();
				ctx.arc(p.x, p.y, ember.size * 0.45, 0, TAU);
				ctx.fill();
			}

			for (const sparkle of sparkles) {
				const u = reducedMotion
					? sparkle.phase
					: ((sparkle.phase + time * sparkle.speed * motion) % 0.82) + 0.12;
				const p = pointAt(sampled[sparkle.thread], u);
				const twinkle = Math.pow(
					0.5 + 0.5 * Math.sin(time * sparkle.twinkleSpeed + sparkle.twinklePhase),
					2.2,
				);
				const intensity = 0.28 + twinkle * 0.72;
				drawSparkle(p.x, p.y, sparkle.size, intensity, sparkle.flare, sparkle.tilt);
			}

			ctx.globalCompositeOperation = "source-over";

			if (!reducedMotion && motion > 0 && !document.hidden) {
				raf = requestAnimationFrame(render);
			}
		}

		const observer = new ResizeObserver(() => {
			resize();
			if (reducedMotion || motion <= 0) render(performance.now());
		});

		const onVisibility = () => {
			if (!document.hidden && running && !reducedMotion && motion > 0) {
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(render);
			}
		};

		resize();
		observer.observe(frame);
		window.addEventListener("resize", resize);
		document.addEventListener("visibilitychange", onVisibility);
		raf = requestAnimationFrame(render);

		return () => {
			running = false;
			cancelAnimationFrame(raf);
			observer.disconnect();
			window.removeEventListener("resize", resize);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [innerGap, lineCount, motion, originY]);

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
