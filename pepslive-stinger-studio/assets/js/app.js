(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const storageKey = "pepslive-stinger-studio-v1";
  const logoPath = "assets/img/pepsproduction-logo.png";

  const presets = {
    "peps-impact": {
      name: "Peps Impact",
      note: "ส้มดำ ดุดัน ใช้กับงานกีฬา",
      primaryColor: "#ff5a00",
      secondaryColor: "#101010",
      glowColor: "#ffffff",
      accentColor: "#ff9a3c",
      duration: 2400,
      transitionPoint: 1000,
      intensity: 72,
      sweepAngle: 22,
      easing: "cinematic",
      enablePanels: true,
      enableSweep: true,
      enableParticles: true,
      enableShockwave: true,
      enableBars: true,
      enableLabel: true
    },
    "neon-slash": {
      name: "Neon Slash",
      note: "เส้นเฉือนเร็วแบบ esports",
      primaryColor: "#ff4d00",
      secondaryColor: "#121212",
      glowColor: "#00d7ff",
      accentColor: "#ff2bbd",
      duration: 2100,
      transitionPoint: 850,
      intensity: 86,
      sweepAngle: -18,
      easing: "snappy",
      enablePanels: true,
      enableSweep: true,
      enableParticles: true,
      enableShockwave: true,
      enableBars: true,
      enableLabel: true
    },
    "glass-arena": {
      name: "Glass Arena",
      note: "ใส หรู อ่านง่ายสำหรับ live",
      primaryColor: "#ff7a1a",
      secondaryColor: "#262626",
      glowColor: "#ffffff",
      accentColor: "#ffd1a6",
      duration: 2800,
      transitionPoint: 1150,
      intensity: 48,
      sweepAngle: 30,
      easing: "smooth",
      enablePanels: true,
      enableSweep: true,
      enableParticles: false,
      enableShockwave: true,
      enableBars: false,
      enableLabel: true
    },
    "cyber-gate": {
      name: "Cyber Gate",
      note: "ประตูปิดจอพร้อม shockwave",
      primaryColor: "#ff5a00",
      secondaryColor: "#001018",
      glowColor: "#24e6ff",
      accentColor: "#ffdf3d",
      duration: 2500,
      transitionPoint: 1000,
      intensity: 92,
      sweepAngle: 12,
      easing: "cinematic",
      enablePanels: true,
      enableSweep: true,
      enableParticles: true,
      enableShockwave: true,
      enableBars: true,
      enableLabel: false
    },
    "light-tunnel": {
      name: "Light Tunnel",
      note: "แสงพุ่งเข้ากล้อง สมจริงขึ้น",
      primaryColor: "#ff7b00",
      secondaryColor: "#080808",
      glowColor: "#fff6e8",
      accentColor: "#ffbd59",
      duration: 3200,
      transitionPoint: 1300,
      intensity: 64,
      sweepAngle: 36,
      easing: "smooth",
      enablePanels: true,
      enableSweep: true,
      enableParticles: true,
      enableShockwave: false,
      enableBars: true,
      enableLabel: true
    },
    "trophy-burst": {
      name: "Trophy Burst",
      note: "ประกายเฉลิมฉลองหลังจุดตัด",
      primaryColor: "#ff5a00",
      secondaryColor: "#181008",
      glowColor: "#ffefb0",
      accentColor: "#ffd166",
      duration: 2600,
      transitionPoint: 1050,
      intensity: 100,
      sweepAngle: 25,
      easing: "snappy",
      enablePanels: true,
      enableSweep: true,
      enableParticles: true,
      enableShockwave: true,
      enableBars: false,
      enableLabel: true
    }
  };

  const state = {
    preset: "peps-impact",
    duration: 2400,
    transitionPoint: 1000,
    fps: 60,
    width: 1920,
    height: 1080,
    bitrate: 50000000,
    logoSize: 42,
    logoX: 50,
    logoY: 50,
    logoRotate: 0,
    whiteMatte: true,
    enablePanels: true,
    enableSweep: true,
    enableParticles: true,
    enableShockwave: true,
    enableBars: true,
    enableLabel: true,
    intensity: 72,
    sweepAngle: 22,
    easing: "cinematic",
    stingerLabel: "PEPS LIVE",
    primaryColor: "#ff5a00",
    secondaryColor: "#101010",
    glowColor: "#ffffff",
    accentColor: "#ff9a3c",
    previewBg: "checker"
  };

  const canvas = $("stageCanvas");
  const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  const logoLayer = document.createElement("canvas");
  const logoCtx = logoLayer.getContext("2d", { alpha: true, willReadFrequently: true });
  const logoProcessCanvas = document.createElement("canvas");
  const logoProcessCtx = logoProcessCanvas.getContext("2d", { willReadFrequently: true });

  let sourceImage = new Image();
  let processedLogo = null;
  let currentTime = 0;
  let rafId = 0;
  let isPlaying = false;
  let isRecording = false;
  let playStart = 0;
  let playOffset = 0;
  let particles = [];
  let lastAutosave = 0;

  const controls = [
    "duration", "transitionPoint", "fps", "resolution", "logoSize", "logoX", "logoY", "logoRotate",
    "whiteMatte", "enablePanels", "enableSweep", "enableParticles", "enableShockwave", "enableBars",
    "enableLabel", "intensity", "sweepAngle", "easing", "stingerLabel", "primaryColor",
    "secondaryColor", "glowColor", "accentColor", "previewBg", "bitrate"
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  }

  function easeInOutCubic(x) {
    x = clamp(x, 0, 1);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function easeOutBack(x) {
    x = clamp(x, 0, 1);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function curve(x) {
    if (state.easing === "snappy") return easeOutBack(x);
    if (state.easing === "smooth") return easeInOutCubic(x);
    return easeOutCubic(x);
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const value = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255
    };
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
  }

  function mixColor(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const r = Math.round(lerp(ca.r, cb.r, t));
    const g = Math.round(lerp(ca.g, cb.g, t));
    const bl = Math.round(lerp(ca.b, cb.b, t));
    return `rgb(${r}, ${g}, ${bl})`;
  }

  function seeded(index) {
    const x = Math.sin(index * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  function setCanvasSize() {
    canvas.width = state.width;
    canvas.height = state.height;
    logoLayer.width = state.width;
    logoLayer.height = state.height;
    particles = buildParticles();
  }

  function buildParticles() {
    const count = Math.round(42 + state.intensity * 1.35);
    return Array.from({ length: count }, (_, i) => ({
      angle: seeded(i + 1) * Math.PI * 2,
      radius: lerp(0.08, 0.58, seeded(i + 4)),
      speed: lerp(0.45, 1.8, seeded(i + 7)),
      size: lerp(2.2, 8.5, seeded(i + 10)),
      spin: lerp(-1, 1, seeded(i + 13)),
      colorMix: seeded(i + 16),
      delay: seeded(i + 20) * 0.22
    }));
  }

  function processLogo() {
    if (!sourceImage.complete || !sourceImage.naturalWidth) return;
    const maxSide = 1800;
    const ratio = Math.min(1, maxSide / Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight));
    logoProcessCanvas.width = Math.max(1, Math.round(sourceImage.naturalWidth * ratio));
    logoProcessCanvas.height = Math.max(1, Math.round(sourceImage.naturalHeight * ratio));
    logoProcessCtx.clearRect(0, 0, logoProcessCanvas.width, logoProcessCanvas.height);
    logoProcessCtx.drawImage(sourceImage, 0, 0, logoProcessCanvas.width, logoProcessCanvas.height);

    if (state.whiteMatte) {
      removeEdgeWhiteMatte();
    }

    processedLogo = logoProcessCanvas;
    drawFrame(currentTime);
  }

  function removeEdgeWhiteMatte() {
    const w = logoProcessCanvas.width;
    const h = logoProcessCanvas.height;
    const imageData = logoProcessCtx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const visited = new Uint8Array(w * h);
    const stack = [];

    const isWhiteLike = (pixel) => {
      const idx = pixel * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const whiteScore = (r + g + b) / 3;
      const colorSpread = Math.max(r, g, b) - Math.min(r, g, b);
      return a > 0 && whiteScore > 232 && colorSpread < 28;
    };

    const pushIfWhite = (pixel) => {
      if (pixel < 0 || pixel >= visited.length || visited[pixel] || !isWhiteLike(pixel)) return;
      visited[pixel] = 1;
      stack.push(pixel);
    };

    for (let x = 0; x < w; x += 1) {
      pushIfWhite(x);
      pushIfWhite((h - 1) * w + x);
    }
    for (let y = 0; y < h; y += 1) {
      pushIfWhite(y * w);
      pushIfWhite(y * w + w - 1);
    }

    while (stack.length) {
      const pixel = stack.pop();
      const x = pixel % w;
      if (x > 0) pushIfWhite(pixel - 1);
      if (x < w - 1) pushIfWhite(pixel + 1);
      if (pixel >= w) pushIfWhite(pixel - w);
      if (pixel < w * (h - 1)) pushIfWhite(pixel + w);
    }

    for (let pixel = 0; pixel < visited.length; pixel += 1) {
      if (!visited[pixel]) continue;
      data[pixel * 4 + 3] = 0;
    }
    logoProcessCtx.putImageData(imageData, 0, 0);
  }

  function sampleLogoPalette() {
    if (!processedLogo) return;
    const w = processedLogo.width;
    const h = processedLogo.height;
    const data = logoProcessCtx.getImageData(0, 0, w, h).data;
    const buckets = new Map();

    for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 90))) {
      for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 130))) {
        const idx = (y * w + x) * 4;
        const a = data[idx + 3];
        if (a < 80) continue;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max > 242 && min > 230) continue;
        const key = `${Math.round(r / 24) * 24},${Math.round(g / 24) * 24},${Math.round(b / 24) * 24}`;
        const sat = max - min;
        const score = (buckets.get(key) || 0) + 1 + sat / 24;
        buckets.set(key, score);
      }
    }

    const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
    const firstSaturated = sorted.find(([key]) => {
      const [r, g, b] = key.split(",").map(Number);
      return Math.max(r, g, b) - Math.min(r, g, b) > 50;
    }) || sorted[0];

    if (firstSaturated) {
      const [r, g, b] = firstSaturated[0].split(",").map((n) => clamp(Number(n), 0, 255));
      state.primaryColor = rgbToHex(r, g, b);
      state.accentColor = rgbToHex(Math.min(255, r + 36), Math.min(255, g + 36), Math.min(255, b + 36));
      syncControls();
      drawFrame(currentTime);
      flashStatus("ดูดสีจากโลโก้แล้ว");
    }
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }

  function drawPreviewBackgroundGuide(w, h) {
    if (isRecording) return;
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 16]);
    ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.round(h * 0.018)}px system-ui`;
    ctx.fillText("16:9 OBS SAFE AREA", w * 0.11, h * 0.135);
    ctx.restore();
  }

  function getTimeline(timeMs) {
    const t = clamp(timeMs / state.duration, 0, 1);
    const cut = clamp(state.transitionPoint / state.duration, 0.18, 0.76);
    const introEnd = Math.min(0.28, cut * 0.62);
    const holdEnd = Math.min(cut + 0.04, 0.68);
    const exitStart = Math.min(Math.max(cut + 0.1, 0.56), 0.76);
    return { t, cut, introEnd, holdEnd, exitStart };
  }

  function getPanelProgress(timeline) {
    const { t, introEnd, exitStart } = timeline;
    if (t < introEnd) return curve(t / introEnd);
    if (t < exitStart) return 1;
    return 1 - easeInOutCubic((t - exitStart) / (1 - exitStart));
  }

  function drawPanels(w, h, timeline) {
    if (!state.enablePanels) return;
    const progress = getPanelProgress(timeline);
    if (progress <= 0.002) return;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((state.sweepAngle - 8) * Math.PI / 180);

    const ext = Math.max(w, h) * 1.72;
    const offset = ext * (1 - progress);
    const overlap = 12 + state.intensity * 0.12;
    const gradientLeft = ctx.createLinearGradient(-ext, 0, 0, 0);
    gradientLeft.addColorStop(0, state.secondaryColor);
    gradientLeft.addColorStop(0.72, mixColor(state.secondaryColor, state.primaryColor, 0.24));
    gradientLeft.addColorStop(1, state.primaryColor);
    const gradientRight = ctx.createLinearGradient(0, 0, ext, 0);
    gradientRight.addColorStop(0, state.accentColor);
    gradientRight.addColorStop(0.32, mixColor(state.primaryColor, state.accentColor, 0.5));
    gradientRight.addColorStop(1, state.secondaryColor);

    ctx.fillStyle = gradientLeft;
    ctx.fillRect(-ext - offset, -ext, ext + overlap, ext * 2);
    ctx.fillStyle = gradientRight;
    ctx.fillRect(offset - overlap, -ext, ext, ext * 2);

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = rgba(state.glowColor, 0.9);
    ctx.fillRect(-5, -ext, 10, ext * 2);
    ctx.restore();
  }

  function drawSplitBars(w, h, timeline) {
    if (!state.enableBars) return;
    const p = getPanelProgress(timeline);
    if (p <= 0.02) return;
    const count = Math.round(3 + state.intensity / 18);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(w / 2, h / 2);
    ctx.rotate((state.sweepAngle + 90) * Math.PI / 180);
    for (let i = -count; i <= count; i++) {
      const x = i * (w * 0.085) + Math.sin(timeline.t * Math.PI * 2 + i) * 22;
      const alpha = (0.09 + p * 0.12) * (1 - Math.abs(i) / (count + 1));
      ctx.fillStyle = rgba(i % 2 ? state.primaryColor : state.glowColor, alpha);
      ctx.fillRect(x, -h * 1.2, 3 + (i % 3), h * 2.4);
    }
    ctx.restore();
  }

  function drawLogoToLayer(w, h, timeline) {
    logoCtx.clearRect(0, 0, w, h);
    if (!processedLogo) return;

    const { t, introEnd, exitStart } = timeline;
    let scale = 1;
    let opacity = 1;
    let blurSteps = 0;
    let pulse = 0;

    if (t < introEnd) {
      const p = curve(t / introEnd);
      scale = lerp(2.35, 1, p);
      opacity = lerp(0.08, 1, p);
      blurSteps = 2;
    } else if (t > exitStart) {
      const p = curve((t - exitStart) / (1 - exitStart));
      scale = lerp(1, 6.5 + state.intensity / 13, p);
      opacity = 1 - p * 0.98;
      blurSteps = 4;
      pulse = p;
    }

    const imgAspect = processedLogo.width / processedLogo.height;
    const baseH = h * (state.logoSize / 100);
    const baseW = baseH * imgAspect;
    const drawW = baseW * scale;
    const drawH = baseH * scale;
    const cx = w * (state.logoX / 100);
    const cy = h * (state.logoY / 100);
    const rotation = (state.logoRotate + Math.sin(t * Math.PI * 2) * pulse * 6) * Math.PI / 180;

    logoCtx.save();
    logoCtx.translate(cx, cy);
    logoCtx.rotate(rotation);
    logoCtx.globalAlpha = opacity;
    logoCtx.shadowColor = rgba(state.glowColor, 0.6);
    logoCtx.shadowBlur = 18 + state.intensity * 0.28;

    if (blurSteps > 0) {
      for (let i = blurSteps; i >= 1; i--) {
        const ghost = i / blurSteps;
        logoCtx.globalAlpha = opacity * 0.08 * ghost;
        const push = (t > exitStart ? 1 : -1) * ghost * state.intensity * 0.9;
        logoCtx.drawImage(processedLogo, -drawW / 2 + push, -drawH / 2, drawW, drawH);
      }
    }

    logoCtx.globalAlpha = opacity;
    logoCtx.drawImage(processedLogo, -drawW / 2, -drawH / 2, drawW, drawH);
    logoCtx.restore();

    if (state.enableSweep) drawAlphaSweep(w, h, timeline);
  }

  function drawAlphaSweep(w, h, timeline) {
    const start = Math.max(0.16, timeline.cut - 0.24);
    const end = Math.min(0.72, timeline.cut + 0.18);
    if (timeline.t < start || timeline.t > end) return;
    const p = easeInOutCubic((timeline.t - start) / (end - start));
    const sweepX = lerp(-w * 0.3, w * 1.3, p);

    logoCtx.save();
    logoCtx.globalCompositeOperation = "source-atop";
    logoCtx.translate(sweepX, h / 2);
    logoCtx.rotate(state.sweepAngle * Math.PI / 180);

    const grad = logoCtx.createLinearGradient(-w * 0.28, 0, w * 0.28, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.34, rgba(state.glowColor, 0.26));
    grad.addColorStop(0.5, rgba(state.glowColor, 0.92));
    grad.addColorStop(0.66, rgba(state.accentColor, 0.32));
    grad.addColorStop(1, "rgba(255,255,255,0)");
    logoCtx.fillStyle = grad;
    logoCtx.fillRect(-w * 0.3, -h, w * 0.6, h * 2);
    logoCtx.restore();
  }

  function drawShockwave(w, h, timeline) {
    if (!state.enableShockwave) return;
    const p = (timeline.t - timeline.cut) / 0.28;
    if (p < 0 || p > 1) return;
    const eased = easeOutCubic(p);
    const radius = lerp(w * 0.06, w * 0.82, eased);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(w * state.logoX / 100, h * state.logoY / 100);
    ctx.strokeStyle = rgba(state.glowColor, (1 - p) * 0.55);
    ctx.lineWidth = lerp(16, 2, p);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(state.primaryColor, (1 - p) * 0.42);
    ctx.lineWidth = lerp(8, 1, p);
    ctx.strokeRect(-radius * 0.72, -radius * 0.4, radius * 1.44, radius * 0.8);
    ctx.restore();
  }

  function drawParticles(w, h, timeline) {
    if (!state.enableParticles) return;
    const p = clamp((timeline.t - timeline.cut + 0.1) / 0.62, 0, 1);
    if (p <= 0 || p >= 1) return;

    const cx = w * state.logoX / 100;
    const cy = h * state.logoY / 100;
    const alphaBase = Math.sin(p * Math.PI);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const part of particles) {
      const local = clamp((p - part.delay) / (1 - part.delay), 0, 1);
      if (local <= 0) continue;
      const distance = w * part.radius * local * part.speed;
      const x = cx + Math.cos(part.angle) * distance;
      const y = cy + Math.sin(part.angle) * distance * 0.6;
      const size = part.size * (1 - local * 0.55);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(part.angle + local * part.spin * Math.PI);
      ctx.globalAlpha = alphaBase * (1 - local) * 0.85;
      ctx.fillStyle = mixColor(state.primaryColor, state.accentColor, part.colorMix);
      ctx.fillRect(-size * 2.2, -size * 0.32, size * 4.4, size * 0.64);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawTitleBadge(w, h, timeline) {
    if (!state.enableLabel || !state.stingerLabel.trim()) return;
    const start = timeline.cut - 0.3;
    const end = timeline.cut + 0.36;
    if (timeline.t < start || timeline.t > end) return;
    const p = clamp((timeline.t - start) / (end - start), 0, 1);
    const inOut = Math.sin(p * Math.PI);
    const text = state.stingerLabel.trim().toUpperCase();
    const fontSize = Math.round(h * 0.034);

    ctx.save();
    ctx.globalAlpha = inOut * 0.86;
    ctx.translate(w * 0.5, h * 0.76 + (1 - inOut) * 26);
    ctx.font = `800 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tw = ctx.measureText(text).width;
    const bw = tw + 74;
    const bh = fontSize + 26;
    ctx.fillStyle = "rgba(8,8,8,.72)";
    ctx.strokeStyle = rgba(state.primaryColor, 0.88);
    ctx.lineWidth = 2;
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = state.glowColor;
    ctx.shadowColor = rgba(state.primaryColor, 0.72);
    ctx.shadowBlur = 12;
    ctx.fillText(text, 0, 1);
    ctx.restore();
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawFrame(timeMs) {
    currentTime = clamp(timeMs, 0, state.duration);
    const w = canvas.width;
    const h = canvas.height;
    const timeline = getTimeline(currentTime);

    ctx.clearRect(0, 0, w, h);
    drawPanels(w, h, timeline);
    drawSplitBars(w, h, timeline);
    drawShockwave(w, h, timeline);
    drawParticles(w, h, timeline);
    drawLogoToLayer(w, h, timeline);
    ctx.drawImage(logoLayer, 0, 0);
    drawTitleBadge(w, h, timeline);
    drawPreviewBackgroundGuide(w, h);
    updateReadouts();
  }

  function play() {
    if (isRecording) return;
    if (isPlaying) cancelAnimationFrame(rafId);
    isPlaying = true;
    playStart = performance.now();
    playOffset = currentTime;

    const tick = (now) => {
      const elapsed = now - playStart + playOffset;
      if (elapsed >= state.duration) {
        drawFrame(state.duration);
        isPlaying = false;
        return;
      }
      drawFrame(elapsed);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function pause() {
    isPlaying = false;
    cancelAnimationFrame(rafId);
  }

  function setTimeFromTimeline(value) {
    pause();
    drawFrame((Number(value) / 1000) * state.duration);
  }

  function updateReadouts() {
    const progress = state.duration ? currentTime / state.duration : 0;
    $("timeline").value = Math.round(progress * 1000);
    $("timeReadout").textContent = `${Math.round(currentTime)}ms`;
    $("transitionLine").style.left = `${(state.transitionPoint / state.duration) * 100}%`;
    $("transitionPoint").max = Math.max(500, state.duration - 300);
    $("transitionPointValue").textContent = `${state.transitionPoint}ms`;
    $("obsPointBadge").textContent = `OBS Point ${state.transitionPoint}ms`;
    $("timelinePointLabel").textContent = `${state.transitionPoint}ms Cut`;
    $("timelineEndLabel").textContent = `${state.duration}ms`;
    $("durationBadge").textContent = `${(state.duration / 1000).toFixed(1)}s`;
    $("metricResolution").textContent = `${state.width}x${state.height}`;
    $("metricFps").textContent = String(state.fps);
    $("metricAlpha").textContent = "Alpha ON";
    $("obsSettings").textContent = [
      "Scene Transition: Stinger",
      "Video File: pepslive-stinger-studio.webm",
      "Transition Point Type: Time (milliseconds)",
      `Transition Point: ${state.transitionPoint}`,
      `Canvas: ${state.width}x${state.height} @ ${state.fps}fps`,
      "Alpha: Straight / WebM VP9 preferred"
    ].join("\n");

    const coverage = Math.round(getPanelProgress(getTimeline(currentTime)) * 100);
    $("alphaCoverage").style.width = `${coverage}%`;
    $("alphaNote").textContent = coverage > 90
      ? "เฟรมนี้ปิดจอเกือบเต็ม เหมาะกับจุดตัด OBS"
      : "พื้นหลังยังโปร่งใส เหมาะสำหรับช่วงเข้า/ออกของ transition";
  }

  function setPreviewBg() {
    const shell = $("canvasShell");
    shell.classList.remove("bg-dark", "bg-bright", "bg-court");
    if (state.previewBg === "dark") shell.classList.add("bg-dark");
    if (state.previewBg === "bright") shell.classList.add("bg-bright");
    if (state.previewBg === "court") shell.classList.add("bg-court");
  }

  function syncControls() {
    for (const key of controls) {
      const el = $(key);
      if (!el) continue;
      if (key === "resolution") {
        el.value = `${state.width}x${state.height}`;
      } else if (el.type === "checkbox") {
        el.checked = Boolean(state[key]);
      } else {
        el.value = state[key];
      }
    }
    $("logoSizeValue").textContent = `${state.logoSize}%`;
    $("logoXValue").textContent = `${state.logoX}%`;
    $("logoYValue").textContent = `${state.logoY}%`;
    $("logoRotateValue").textContent = `${state.logoRotate}deg`;
    $("durationValue").textContent = `${state.duration}ms`;
    $("transitionPointValue").textContent = `${state.transitionPoint}ms`;
    $("intensityValue").textContent = `${state.intensity}%`;
    $("sweepAngleValue").textContent = `${state.sweepAngle}deg`;
    $("presetName").textContent = presets[state.preset]?.name || "Custom";
    document.querySelectorAll(".preset-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.preset === state.preset);
    });
    setPreviewBg();
    setCanvasSize();
    updateReadouts();
  }

  function readControls(event) {
    const id = event.target.id;
    if (!id) return;
    if (id === "resolution") {
      const [w, h] = event.target.value.split("x").map(Number);
      state.width = w;
      state.height = h;
      setCanvasSize();
    } else if (event.target.type === "checkbox") {
      state[id] = event.target.checked;
      if (id === "whiteMatte") processLogo();
    } else if (event.target.type === "range" || event.target.type === "number" || id === "fps" || id === "bitrate") {
      state[id] = Number(event.target.value);
      if (id === "duration") {
        state.transitionPoint = Math.min(state.transitionPoint, state.duration - 300);
      }
      if (id === "intensity") particles = buildParticles();
    } else {
      state[id] = event.target.value;
    }

    state.preset = presets[state.preset] && id !== "previewBg" ? state.preset : state.preset;
    syncControls();
    drawFrame(Math.min(currentTime, state.duration));
    autosave();
  }

  function applyPreset(key) {
    const preset = presets[key];
    if (!preset) return;
    Object.assign(state, preset, { preset: key });
    syncControls();
    drawFrame(state.transitionPoint);
    autosave();
  }

  function buildPresetGrid() {
    const grid = $("presetGrid");
    grid.innerHTML = Object.entries(presets).map(([key, preset]) => (
      `<button class="preset-card" type="button" data-preset="${key}">
        <strong>${preset.name}</strong>
        <small>${preset.note}</small>
      </button>`
    )).join("");
    grid.addEventListener("click", (event) => {
      const card = event.target.closest(".preset-card");
      if (card) applyPreset(card.dataset.preset);
    });
  }

  function getProjectJson() {
    return {
      app: "PepsLive Stinger Studio",
      version: "1.0",
      savedAt: new Date().toISOString(),
      state: { ...state }
    };
  }

  function autosave() {
    const now = Date.now();
    if (now - lastAutosave < 180) return;
    lastAutosave = now;
    localStorage.setItem(storageKey, JSON.stringify(getProjectJson()));
    $("autosaveStatus").textContent = "Auto Save แล้ว";
  }

  function loadAutosave() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const project = JSON.parse(raw);
      if (project?.state) {
        Object.assign(state, project.state);
      }
    } catch (error) {
      console.warn("Autosave load failed", error);
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function saveJson() {
    const blob = new Blob([JSON.stringify(getProjectJson(), null, 2)], { type: "application/json" });
    downloadBlob(blob, `pepslive-stinger-studio-${dateStamp()}.json`);
    flashStatus("บันทึก Project JSON แล้ว");
  }

  function loadJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const project = JSON.parse(String(reader.result));
        if (!project.state) throw new Error("Invalid project file");
        Object.assign(state, project.state);
        syncControls();
        drawFrame(state.transitionPoint);
        autosave();
        flashStatus("โหลด Project JSON แล้ว");
      } catch (error) {
        alert("ไฟล์ JSON ไม่ถูกต้อง");
      }
    };
    reader.readAsText(file);
  }

  function loadLogoFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadLogo(String(reader.result));
    reader.readAsDataURL(file);
  }

  function loadLogo(src) {
    const image = new Image();
    image.onload = () => {
      sourceImage = image;
      processLogo();
      sampleLogoPalette();
      flashStatus("โหลดโลโก้แล้ว");
    };
    image.src = src;
  }

  function resetLogo() {
    loadLogo(logoPath);
  }

  function dateStamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  function flashStatus(message) {
    $("exportState").textContent = message;
    $("autosaveStatus").textContent = message;
    window.clearTimeout(flashStatus.timer);
    flashStatus.timer = window.setTimeout(() => {
      if (!isRecording) $("exportState").textContent = "Preview Ready";
      $("autosaveStatus").textContent = "Auto Save พร้อม";
    }, 1800);
  }

  async function copyObsSettings() {
    const text = $("obsSettings").textContent;
    try {
      await navigator.clipboard.writeText(text);
      flashStatus("คัดลอกค่า OBS แล้ว");
    } catch (error) {
      alert(text);
    }
  }

  function getRecorderOptions() {
    const candidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];
    const mimeType = candidates.find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";
    return mimeType
      ? { mimeType, videoBitsPerSecond: state.bitrate }
      : { videoBitsPerSecond: state.bitrate };
  }

  function exportWebm() {
    if (isRecording) return;
    if (!window.MediaRecorder || !canvas.captureStream) {
      alert("เบราว์เซอร์นี้ยังไม่รองรับ MediaRecorder/canvas.captureStream กรุณาใช้ Chrome หรือ Edge รุ่นใหม่");
      return;
    }

    pause();
    isRecording = true;
    $("exportState").textContent = "กำลังเข้ารหัส WebM...";
    $("btnExport").textContent = "กำลังบันทึก...";
    $("btnExportTop").textContent = "Recording";
    const stream = canvas.captureStream(state.fps);
    const recorder = new MediaRecorder(stream, getRecorderOptions());
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      downloadBlob(blob, `pepslive-stinger-studio-${dateStamp()}.webm`);
      stream.getTracks().forEach((track) => track.stop());
      isRecording = false;
      $("btnExport").textContent = "บันทึก WebM";
      $("btnExportTop").textContent = "Export";
      drawFrame(state.transitionPoint);
      flashStatus(`Export สำเร็จ ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
    };

    recorder.start();
    const recordStart = performance.now();
    const render = (now) => {
      const elapsed = now - recordStart;
      drawFrame(Math.min(elapsed, state.duration));
      $("exportState").textContent = `กำลังเข้ารหัส ${Math.round((elapsed / state.duration) * 100)}%`;
      if (elapsed < state.duration) {
        requestAnimationFrame(render);
      } else {
        drawFrame(state.duration);
        setTimeout(() => recorder.stop(), 120);
      }
    };
    requestAnimationFrame(render);
  }

  function bindEvents() {
    for (const key of controls) {
      const el = $(key);
      if (!el) continue;
      el.addEventListener("input", readControls);
      el.addEventListener("change", readControls);
    }

    $("timeline").addEventListener("input", (event) => setTimeFromTimeline(event.target.value));
    $("btnPlay").addEventListener("click", play);
    $("btnPlayTop").addEventListener("click", play);
    $("btnPause").addEventListener("click", pause);
    $("btnAtPoint").addEventListener("click", () => {
      pause();
      drawFrame(state.transitionPoint);
    });
    $("btnExport").addEventListener("click", exportWebm);
    $("btnExportTop").addEventListener("click", exportWebm);
    $("btnCopyObs").addEventListener("click", copyObsSettings);
    $("btnSaveJson").addEventListener("click", saveJson);
    $("loadJsonInput").addEventListener("change", (event) => loadJsonFile(event.target.files[0]));
    $("logoInput").addEventListener("change", (event) => loadLogoFile(event.target.files[0]));
    $("btnResetLogo").addEventListener("click", resetLogo);
    $("btnAutoPalette").addEventListener("click", sampleLogoPalette);

    window.addEventListener("keydown", (event) => {
      if (event.target.matches("input, select")) return;
      if (event.code === "Space") {
        event.preventDefault();
        isPlaying ? pause() : play();
      }
    });
  }

  function init() {
    buildPresetGrid();
    loadAutosave();
    syncControls();
    bindEvents();
    resetLogo();
    drawFrame(0);
  }

  init();
})();
