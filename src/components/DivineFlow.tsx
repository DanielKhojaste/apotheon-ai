import { useEffect, useRef } from "react";

type DivineFlowProps = {
	className?: string;
	/** Independent filaments per side. */
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
	reach: number;
	c1t: number;
	c2t: number;
	bow1: number;
	bow2: number;
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
	hasPulse: boolean;
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

type Pt = { x: number; y: number };

const TAU = Math.PI * 2;
const MAX_SAMPLES = 72;

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
	samples: number,
	u0: number,
	u1: number,
	width: number,
	color: string,
) {
	const i0 = Math.max(0, Math.floor(u0 * samples));
	const i1 = Math.min(samples, Math.ceil(u1 * samples));
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

function pointAt(points: Pt[], samples: number, u: number): Pt {
	const f = Math.max(0, Math.min(1, u)) * samples;
	const i = Math.min(samples - 1, Math.floor(f));
	const t = f - i;
	return {
		x: points[i].x + (points[i + 1].x - points[i].x) * t,
		y: points[i].y + (points[i + 1].y - points[i].y) * t,
	};
}

function normalAt(points: Pt[], samples: number, u: number): Pt {
	const i = Math.max(1, Math.min(samples - 1, Math.round(u * samples)));
	const dx = points[i + 1].x - points[i - 1].x;
	const dy = points[i + 1].y - points[i - 1].y;
	const len = Math.hypot(dx, dy) || 1;
	return { x: -dy / len, y: dx / len };
}

function makePointBuffer() {
	return Array.from({ length: MAX_SAMPLES + 1 }, () => ({ x: 0, y: 0 }));
}

export default function DivineFlow({
	className,
	lineCount = 7,
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

		const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
		if (!ctx) return;

		const bloomCanvas = document.createElement("canvas");
		const bloomCtx = bloomCanvas.getContext("2d", { alpha: true });
		if (!bloomCtx) return;

		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		let width = 1;
		let height = 1;
		let dpr = 1;
		let samples = 56;
		let raf = 0;
		let running = true;
		let onScreen = true;

		const threads: Thread[] = [];
		const sparkles: Sparkle[] = [];
		const specks: Speck[] = [];

		for (const side of [-1, 1] as const) {
			const random = mulberry32(8400 + side * 173);

			for (let i = 0; i < lineCount; i += 1) {
				const slot = (i + random() * 0.82) / lineCount;
				const centered = slot * 2 - 1;
				const startY = centered * 0.055 + (random() - 0.5) * 0.05;
				const endY = centered * 0.33 + (random() - 0.5) * 0.26;
				const hero = random() > 0.62;

				threads.push({
					side,
					startY,
					endY,
					startInset: random(),
					reach: 0.68 + random() * 0.4,
					c1t: 0.18 + random() * 0.2,
					c2t: 0.5 + random() * 0.28,
					bow1: centered * 0.05 + (random() - 0.5) * 0.1,
					bow2: (random() - 0.5) * 0.09,
					amp1: 0.004 + random() * 0.009,
					amp2: 0.002 + random() * 0.005,
					speed: 0.14 + random() * 0.24,
					phase: random() * TAU,
					seed: 12 + random() * 220,
					coreWidth: hero ? 0.55 + random() * 0.35 : 0.28 + random() * 0.32,
					glowWidth: hero ? 3.2 + random() * 2.4 : 1.8 + random() * 2.2,
					alpha: hero ? 0.55 + random() * 0.4 : 0.18 + random() * 0.38,
					pulsePhase: random(),
					pulseSpeed: 0.03 + random() * 0.05,
					pulseLength: 0.06 + random() * 0.08,
					shimmerSpeed: 0.2 + random() * 0.32,
					hasPulse: hero,
				});
			}
		}

		const sampled = threads.map(makePointBuffer);

		const sparkleRandom = mulberry32(22101);
		const sparkleCount = Math.min(10, 4 + threads.length);
		for (let i = 0; i < sparkleCount; i += 1) {
			sparkles.push({
				thread: Math.floor(sparkleRandom() * threads.length),
				phase: 0.16 + sparkleRandom() * 0.7,
				speed: sparkleRandom() < 0.4 ? 0.01 + sparkleRandom() * 0.018 : 0.003 + sparkleRandom() * 0.007,
				size: sparkleRandom() < 0.3 ? 1.5 + sparkleRandom() * 1.2 : 0.7 + sparkleRandom() * 0.7,
				flare: sparkleRandom() < 0.28,
				tilt: (sparkleRandom() - 0.5) * 0.55,
				twinklePhase: sparkleRandom() * TAU,
				twinkleSpeed: 1.05 + sparkleRandom() * 1.7,
			});
		}

		const speckRandom = mulberry32(77411);
		const speckCount = 28;
		for (let i = 0; i < speckCount; i += 1) {
			specks.push({
				thread: Math.floor(speckRandom() * threads.length),
				u: 0.14 + speckRandom() * 0.74,
				nOff: (speckRandom() - 0.5) * 22,
				size: 0.3 + speckRandom() * 0.75,
				phase: speckRandom() * TAU,
				drift: 0.1 + speckRandom() * 0.2,
			});
		}

		function resize() {
			const rect = measureBox(frame);
			width = Math.max(1, Math.round(rect.width));
			height = Math.max(1, Math.round(rect.height));
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			samples = Math.max(44, Math.min(MAX_SAMPLES, Math.round(width / 28)));

			canvas.width = Math.round(width * dpr);
			canvas.height = Math.round(height * dpr);
			canvas.style.width = "100%";
			canvas.style.height = "100%";
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.lineCap = "round";
			ctx.lineJoin = "round";

			const bloomScale = 0.28;
			bloomCanvas.width = Math.max(1, Math.round(width * bloomScale));
			bloomCanvas.height = Math.max(1, Math.round(height * bloomScale));
			bloomCtx.setTransform(bloomCanvas.width / width, 0, 0, bloomCanvas.height / height, 0, 0);
			bloomCtx.lineCap = "round";
			bloomCtx.lineJoin = "round";
		}

		function writePoint(thread: Thread, u: number, time: number, out: Pt) {
			const cx = width * 0.5;
			const cy = height * originY;
			const originR = Math.min(innerGap, Math.max(64, width * 0.072));
			const startX = cx + thread.side * originR * (0.4 + thread.startInset * 0.34);
			const startY = cy + thread.startY * height;
			const edgeX = thread.side === 1 ? width + 48 : -48;
			const endX = startX + (edgeX - startX) * thread.reach;
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
			const n1 = smoothNoise(u * 2.1 + tMotion * thread.speed + thread.phase, thread.seed);
			const n2 = smoothNoise(u * 5.4 - tMotion * thread.speed * 0.4 + thread.phase * 1.4, thread.seed + 11);
			const wave =
				((n1 - 0.5) * thread.amp1 + (n2 - 0.5) * thread.amp2) * envelope * motion * height;

			out.x = x0 + nx * wave;
			out.y = y0 + ny * wave;
		}

		function sampleThread(thread: Thread, time: number, out: Pt[]) {
			for (let i = 0; i <= samples; i += 1) {
				writePoint(thread, i / samples, time, out[i]);
			}
		}

		function drawOriginBloom(target: CanvasRenderingContext2D) {
			const cx = width * 0.5;
			const cy = height * originY;
			const rx = Math.min(width, height) * 0.2;
			const ry = Math.min(width, height) * 0.28;

			target.save();
			target.translate(cx, cy);
			target.scale(1, ry / rx);
			const glow = target.createRadialGradient(0, 0, rx * 0.12, 0, 0, rx);
			glow.addColorStop(0, "rgba(255, 196, 110, 0.12)");
			glow.addColorStop(0.34, "rgba(196, 132, 48, 0.05)");
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
			if (!flare) ctx.rotate(tilt);

			const radius = size * (flare ? 6.2 : 3.1);
			const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
			disc.addColorStop(0, `rgba(255, 250, 236, ${0.9 * intensity})`);
			disc.addColorStop(0.22, `rgba(255, 214, 140, ${0.28 * intensity})`);
			disc.addColorStop(1, "rgba(0, 0, 0, 0)");
			ctx.fillStyle = disc;
			ctx.beginPath();
			ctx.arc(0, 0, radius, 0, TAU);
			ctx.fill();

			if (flare) {
				const hx = size * 13;
				const hy = size * 0.14;
				const hg = ctx.createLinearGradient(-hx, 0, hx, 0);
				hg.addColorStop(0, "rgba(255, 230, 180, 0)");
				hg.addColorStop(0.5, `rgba(255, 248, 230, ${0.82 * intensity})`);
				hg.addColorStop(1, "rgba(255, 230, 180, 0)");
				ctx.fillStyle = hg;
				ctx.beginPath();
				ctx.moveTo(-hx, 0);
				ctx.lineTo(0, -hy);
				ctx.lineTo(hx, 0);
				ctx.lineTo(0, hy);
				ctx.closePath();
				ctx.fill();
			} else {
				ctx.fillStyle = `rgba(255, 248, 230, ${0.65 * intensity})`;
				const arm = size * 2.1;
				ctx.fillRect(-arm, -0.3, arm * 2, 0.6);
				ctx.fillRect(-0.3, -arm * 0.65, 0.6, arm * 1.3);
			}

			ctx.fillStyle = `rgba(255, 252, 245, ${intensity})`;
			ctx.beginPath();
			ctx.arc(0, 0, Math.max(0.4, size * 0.24), 0, TAU);
			ctx.fill();
			ctx.restore();
		}

		function render(now: number) {
			if (!running) return;

			const time = now * 0.001;

			for (let i = 0; i < threads.length; i += 1) {
				sampleThread(threads[i], time, sampled[i]);
			}

			bloomCtx.globalCompositeOperation = "source-over";
			bloomCtx.clearRect(0, 0, width, height);
			bloomCtx.globalCompositeOperation = "lighter";
			drawOriginBloom(bloomCtx);

			for (let i = 0; i < threads.length; i += 1) {
				const thread = threads[i];
				const shimmer = 0.8 + 0.2 * Math.sin(time * thread.shimmerSpeed + thread.phase);
				strokeRange(
					bloomCtx,
					sampled[i],
					samples,
					0,
					1,
					thread.glowWidth * 1.7,
					`rgba(214, 154, 64, ${thread.alpha * shimmer * 0.5})`,
				);
			}

			ctx.globalCompositeOperation = "source-over";
			ctx.clearRect(0, 0, width, height);
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = "high";
			ctx.globalCompositeOperation = "lighter";
			ctx.drawImage(bloomCanvas, 0, 0, width, height);

			for (let i = 0; i < threads.length; i += 1) {
				const thread = threads[i];
				const points = sampled[i];
				const shimmer = 0.82 + 0.18 * Math.sin(time * thread.shimmerSpeed + thread.phase);
				const a = Math.min(1, thread.alpha * shimmer);

				strokeRange(ctx, points, samples, 0.05, 0.98, thread.glowWidth * 0.32, `rgba(224, 170, 82, ${a * 0.22})`);
				strokeRange(ctx, points, samples, 0.08, 0.96, thread.coreWidth, `rgba(255, 232, 186, ${a * 0.78})`);

				if (thread.hasPulse && !reducedMotion && motion > 0) {
					const pulseU = (thread.pulsePhase + time * thread.pulseSpeed * motion) % 1;
					strokeRange(
						ctx,
						points,
						samples,
						Math.max(0.08, pulseU - thread.pulseLength),
						Math.max(pulseU, 0.1),
						thread.coreWidth * 1.15,
						`rgba(255, 244, 214, ${a * 0.45})`,
					);
				}
			}

			for (const speck of specks) {
				const points = sampled[speck.thread];
				const p = pointAt(points, samples, speck.u);
				const n = normalAt(points, samples, speck.u);
				const wander = reducedMotion ? 0 : Math.sin(time * speck.drift + speck.phase) * 2 * motion;
				const pulse = 0.06 + (Math.sin(time * 0.7 + speck.phase) + 1) * 0.05;
				ctx.fillStyle = `rgba(228, 178, 92, ${pulse})`;
				ctx.beginPath();
				ctx.arc(p.x + n.x * speck.nOff, p.y + n.y * speck.nOff + wander, speck.size, 0, TAU);
				ctx.fill();
			}

			for (const sparkle of sparkles) {
				const u = reducedMotion
					? sparkle.phase
					: ((sparkle.phase + time * sparkle.speed * motion) % 0.8) + 0.12;
				const p = pointAt(sampled[sparkle.thread], samples, u);
				const twinkle = Math.pow(
					0.5 + 0.5 * Math.sin(time * sparkle.twinkleSpeed + sparkle.twinklePhase),
					2.2,
				);
				drawSparkle(p.x, p.y, sparkle.size, 0.3 + twinkle * 0.7, sparkle.flare, sparkle.tilt);
			}

			ctx.globalCompositeOperation = "source-over";

			if (!reducedMotion && motion > 0 && !document.hidden && onScreen) {
				raf = requestAnimationFrame(render);
			}
		}

		function resume() {
			if (!running || reducedMotion || motion <= 0 || document.hidden || !onScreen) return;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(render);
		}

		const observer = new ResizeObserver(() => {
			resize();
			if (reducedMotion || motion <= 0) render(performance.now());
		});

		const intersection = new IntersectionObserver(
			([entry]) => {
				onScreen = Boolean(entry?.isIntersecting);
				if (onScreen) resume();
			},
			{ threshold: 0.05 },
		);

		const onVisibility = () => {
			if (!document.hidden) resume();
		};

		resize();
		observer.observe(frame);
		intersection.observe(frame);
		window.addEventListener("resize", resize);
		document.addEventListener("visibilitychange", onVisibility);
		raf = requestAnimationFrame(render);

		return () => {
			running = false;
			cancelAnimationFrame(raf);
			observer.disconnect();
			intersection.disconnect();
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
