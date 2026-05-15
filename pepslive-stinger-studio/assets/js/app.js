(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const storageKey = "pepslive-stinger-studio-v1";
  const logoPath = "assets/img/pepsproduction-logo.png";

  const fullFx = {
    enablePanels: true,
    enableSweep: true,
    enableParticles: true,
    enableShockwave: true,
    enableBars: true,
    enableLightRays: true,
    enableLensFlare: true,
    enableGlowMist: true,
    enableEnergyRing: true,
    enableChromatic: true,
    enableShutter: true,
    enableVignette: true,
    enableCameraShake: true,
    enableMotionBlur: true,
    enableLabel: true
  };

  const presets = {
    "peps-impact": {
      ...fullFx,
      name: "Peps Impact",
      category: "Live Sport",
      note: "ส้มดำ ดุดัน เหมาะกับเปิดฉากหรือเปลี่ยนซีนหลัก",
      primaryColor: "#ff5a00",
      secondaryColor: "#101010",
      glowColor: "#ffffff",
      accentColor: "#ff9a3c",
      duration: 2400,
      transitionPoint: 1000,
      intensity: 72,
      realism: 68,
      sweepAngle: 22,
      easing: "cinematic"
    },
    "neon-slash": {
      ...fullFx,
      name: "Neon Slash",
      category: "Esports",
      note: "เส้นเฉือนเร็ว มี chromatic edge และแรงปะทะสูง",
      primaryColor: "#ff4d00",
      secondaryColor: "#121212",
      glowColor: "#00d7ff",
      accentColor: "#ff2bbd",
      duration: 2100,
      transitionPoint: 850,
      intensity: 88,
      realism: 60,
      sweepAngle: 342,
      easing: "snappy"
    },
    "glass-arena": {
      ...fullFx,
      name: "Glass Arena",
      category: "Premium",
      note: "ใส หรู อ่านง่าย เหมาะกับรายการที่ต้องดูแพง",
      primaryColor: "#ff7a1a",
      secondaryColor: "#262626",
      glowColor: "#ffffff",
      accentColor: "#ffd1a6",
      duration: 2800,
      transitionPoint: 1150,
      intensity: 48,
      realism: 82,
      sweepAngle: 30,
      easing: "smooth",
      enableParticles: false,
      enableBars: false,
      enableCameraShake: false
    },
    "cyber-gate": {
      ...fullFx,
      name: "Cyber Gate",
      category: "Gate",
      note: "ประตูพลังงานปิดจอชัด เหมาะกับตัดเข้าซีนใหม่",
      primaryColor: "#ff5a00",
      secondaryColor: "#001018",
      glowColor: "#24e6ff",
      accentColor: "#ffdf3d",
      duration: 2500,
      transitionPoint: 1000,
      intensity: 92,
      realism: 62,
      sweepAngle: 12,
      easing: "cinematic",
      enableLabel: false
    },
    "light-tunnel": {
      ...fullFx,
      name: "Light Tunnel",
      category: "Light",
      note: "ลำแสงพุ่งเข้ากล้อง มี flare และหมอกแสง",
      primaryColor: "#ff7b00",
      secondaryColor: "#080808",
      glowColor: "#fff6e8",
      accentColor: "#ffbd59",
      duration: 3200,
      transitionPoint: 1300,
      intensity: 66,
      realism: 92,
      sweepAngle: 36,
      easing: "smooth",
      enableShockwave: false
    },
    "trophy-burst": {
      ...fullFx,
      name: "Trophy Burst",
      category: "Final",
      note: "ประกายเฉลิมฉลอง เหมาะกับจบแมตช์หรือประกาศผู้ชนะ",
      primaryColor: "#ff5a00",
      secondaryColor: "#181008",
      glowColor: "#ffefb0",
      accentColor: "#ffd166",
      duration: 2600,
      transitionPoint: 1050,
      intensity: 100,
      realism: 74,
      sweepAngle: 25,
      easing: "snappy",
      enableBars: false
    },
    "broadcast-wipe": {
      ...fullFx,
      name: "Broadcast Wipe",
      category: "TV",
      note: "สไตล์ทีวีสปอร์ต คม สะอาด ใช้ซ้ำระหว่างรายการได้",
      primaryColor: "#ff5a00",
      secondaryColor: "#0c0c0c",
      glowColor: "#ffffff",
      accentColor: "#d9d9d9",
      duration: 2300,
      transitionPoint: 950,
      intensity: 58,
      realism: 78,
      sweepAngle: 0,
      easing: "cinematic",
      enableParticles: false,
      enableCameraShake: false
    },
    "stadium-lights": {
      ...fullFx,
      name: "Stadium Lights",
      category: "Arena",
      note: "จำลองไฟสนามและ lens flare เหมาะกับกีฬา outdoor",
      primaryColor: "#ff6a00",
      secondaryColor: "#090909",
      glowColor: "#fff4dd",
      accentColor: "#ffc56d",
      duration: 3000,
      transitionPoint: 1200,
      intensity: 70,
      realism: 100,
      sweepAngle: 315,
      easing: "smooth",
      enableShockwave: false,
      enableShutter: false
    },
    "court-flash": {
      ...fullFx,
      name: "Court Flash",
      category: "Basketball",
      note: "แฟลชเร็วและเส้นสปีด เหมาะกับบาส/กีฬาในสนาม",
      primaryColor: "#ff5a00",
      secondaryColor: "#170a02",
      glowColor: "#fff8ec",
      accentColor: "#ffbd59",
      duration: 1900,
      transitionPoint: 760,
      intensity: 94,
      realism: 66,
      sweepAngle: 90,
      easing: "snappy"
    },
    "replay-impact": {
      ...fullFx,
      name: "Replay Impact",
      category: "Replay",
      note: "แรงกระแทกและ shake ชัด ใช้เข้าช่วง replay/highlight",
      primaryColor: "#ff5a00",
      secondaryColor: "#060606",
      glowColor: "#ffffff",
      accentColor: "#ff2a00",
      duration: 2200,
      transitionPoint: 900,
      intensity: 100,
      realism: 58,
      sweepAngle: 270,
      easing: "snappy",
      enableLabel: false
    },
    "premium-glass": {
      ...fullFx,
      name: "Premium Glass",
      category: "Sponsor",
      note: "เนียนและไม่แรงเกินไป เหมาะกับโลโก้สปอนเซอร์",
      primaryColor: "#ff8a2a",
      secondaryColor: "#171717",
      glowColor: "#ffffff",
      accentColor: "#ffe1c7",
      duration: 3400,
      transitionPoint: 1350,
      intensity: 42,
      realism: 88,
      sweepAngle: 45,
      easing: "smooth",
      enableParticles: false,
      enableShockwave: false,
      enableCameraShake: false
    },
    "final-whistle": {
      ...fullFx,
      name: "Final Whistle",
      category: "Match End",
      note: "ปิดจอหนัก มีวงพลังงาน ใช้ตอนจบเกมหรือจบรายการ",
      primaryColor: "#ff5a00",
      secondaryColor: "#000000",
      glowColor: "#fff0dd",
      accentColor: "#ffcc00",
      duration: 2800,
      transitionPoint: 1100,
      intensity: 96,
      realism: 72,
      sweepAngle: 180,
      easing: "cinematic"
    },
    "clean-sponsor": {
      ...fullFx,
      name: "Clean Sponsor",
      category: "Clean",
      note: "เรียบ สะอาด โฟกัสโลโก้ ไม่รบกวนภาพรายการ",
      primaryColor: "#ff5a00",
      secondaryColor: "#1c1c1c",
      glowColor: "#ffffff",
      accentColor: "#f2f2f2",
      duration: 3000,
      transitionPoint: 1200,
      intensity: 36,
      realism: 70,
      sweepAngle: 20,
      easing: "smooth",
      enableParticles: false,
      enableShockwave: false,
      enableBars: false,
      enableShutter: false,
      enableCameraShake: false
    },
    "thunder-gate": {
      ...fullFx,
      name: "Thunder Gate",
      category: "Impact",
      note: "สายฟ้า/พลังงานหนัก เหมาะกับเปิดตัวคู่ใหญ่",
      primaryColor: "#ff5a00",
      secondaryColor: "#050505",
      glowColor: "#47e8ff",
      accentColor: "#ffe14f",
      duration: 2400,
      transitionPoint: 950,
      intensity: 100,
      realism: 64,
      sweepAngle: 300,
      easing: "snappy"
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
    previewQuality: "smooth",
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
    enableLightRays: true,
    enableLensFlare: true,
    enableGlowMist: true,
    enableEnergyRing: true,
    enableChromatic: true,
    enableShutter: true,
    enableVignette: true,
    enableCameraShake: true,
    enableMotionBlur: true,
    enableLabel: true,
    intensity: 72,
    realism: 68,
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
  const ctx = canvas.getContext("2d", { alpha: true });
  const logoLayer = document.createElement("canvas");
  const logoCtx = logoLayer.getContext("2d", { alpha: true });
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
  let lastReadoutUpdate = 0;
  let lastExportStatus = 0;

  const controls = [
    "duration", "transitionPoint", "fps", "resolution", "previewQuality", "logoSize", "logoX", "logoY", "logoRotate",
    "whiteMatte", "enablePanels", "enableSweep", "enableParticles", "enableShockwave", "enableBars",
    "enableLightRays", "enableLensFlare", "enableGlowMist", "enableEnergyRing", "enableChromatic",
    "enableShutter", "enableVignette", "enableCameraShake", "enableMotionBlur", "enableLabel",
    "intensity", "realism", "sweepAngle", "easing", "stingerLabel", "primaryColor",
    "secondaryColor", "glowColor", "accentColor", "previewBg", "bitrate"
  ];

  const helpContent = {
    preset: {
      title: "วิธีใช้ Preset",
      intro: "เลือกสไตล์เริ่มต้นให้เหมาะกับช่วงรายการ แล้วค่อยปรับสี/จังหวะต่อ",
      body: `
        <h3>ใช้ยังไง</h3>
        <ul>
          <li>กด preset หนึ่งครั้ง ระบบจะตั้งสี, ความยาวคลิป, จุดตัด OBS และ Motion FX ให้ทันที</li>
          <li>งานกีฬาใช้ Peps Impact, Broadcast Wipe, Court Flash หรือ Stadium Lights</li>
          <li>งานไฮไลต์/Replay ใช้ Replay Impact หรือ Thunder Gate เพราะจังหวะเร็วและแรงกว่า</li>
          <li>งานสปอนเซอร์ใช้ Premium Glass หรือ Clean Sponsor เพื่อให้โลโก้อ่านง่ายและไม่รก</li>
        </ul>
        <p class="help-callout">แนะนำ: หลังเลือก preset ให้กด OBS Point เพื่อดูเฟรมที่ควรตัดใน OBS ก่อน export</p>
      `
    },
    logo: {
      title: "วิธีใช้ Logo Layer",
      intro: "จัดโลโก้ให้อ่านชัดก่อนใส่เอฟเฟกต์ เพราะ Stinger ที่ดีต้องเห็นแบรนด์ในเสี้ยววินาที",
      body: `
        <h3>ขั้นตอน</h3>
        <ul>
          <li>อัปโหลด PNG ที่มีพื้นโปร่งใสจะดีที่สุด</li>
          <li>ถ้าโลโก้มีพื้นหลังขาว ให้เปิด Auto White Matte เพื่อตัดพื้นขาวที่ติดขอบออก</li>
          <li>ปรับขนาดให้อยู่ราว 35-55% สำหรับโลโก้แนวนอน และ 45-70% สำหรับโลโก้ทรงสูง</li>
          <li>ตำแหน่ง X/Y ใช้เมื่อโลโก้ไม่สมดุลหรืออยากให้ชนจุดแสงพอดี</li>
        </ul>
        <p class="help-callout">ถ้าสีเอฟเฟกต์ไม่เข้ากับโลโก้ ให้กด ดูดสีจากโลโก้ แล้วค่อยเลือก preset ใหม่</p>
      `
    },
    timing: {
      title: "วิธีใช้ Timing",
      intro: "Timing คือหัวใจของ Stinger เพราะต้องปิดจอให้มิดพอดีกับจุดตัดซีนใน OBS",
      body: `
        <h3>ค่าที่ควรรู้</h3>
        <ul>
          <li>ความยาวคลิป 1.9-2.6 วินาที เหมาะกับงาน live ที่ต้องไว</li>
          <li>ความยาว 2.8-3.4 วินาที เหมาะกับเปิดรายการ, sponsor bumper หรือจังหวะ cinematic</li>
          <li>จุดตัด OBS ควรอยู่ตอน Alpha Inspector ขึ้นใกล้เต็ม เพราะเป็นช่วงที่จอถูกปิดมิด</li>
          <li>FPS 60 เหมาะกับ motion ที่ลื่น แต่ถ้าเครื่องเบาใช้ 30 ได้</li>
        </ul>
        <p class="help-callout">ใน OBS ให้ตั้ง Transition Point Type เป็น Time (milliseconds) แล้วใส่ค่าที่หน้าเว็บแสดง</p>
      `
    },
    motion: {
      title: "วิธีใช้ Motion FX",
      intro: "เปิดเอฟเฟกต์เป็นชั้น ๆ เพื่อให้ดูสมจริง แต่ยังคุมความเบาและความนิ่งสำหรับ OBS",
      body: `
        <h3>แนวทางเปิด FX</h3>
        <ul>
          <li>Curtain Panels และ Shutter Wipe ช่วยปิดจอให้แน่น เหมาะกับ transition จริง</li>
          <li>Light Rays, Lens Flare และ Glow Mist เพิ่มความสมจริงแบบกล้องถ่ายไฟสนาม</li>
          <li>Energy Ring, Shockwave และ Camera Shake เพิ่มแรงปะทะ ใช้กับ replay หรือเปิดตัวคู่ใหญ่</li>
          <li>Chromatic Edge และ Motion Blur ทำให้โลโก้เคลื่อนเร็วแบบมีน้ำหนัก</li>
          <li>องศาแสงปรับได้ครบ 0-360 องศา เพื่อเลือกทิศทางแสงหรือทิศทางม่านได้อิสระ</li>
        </ul>
        <p class="help-callout">ถ้าใช้ใน OBS เครื่องไม่แรง ให้ลด ความแรง/ความสมจริง หรือปิด Particles, Glow Mist, Camera Shake ก่อน</p>
      `
    },
    export: {
      title: "วิธีใช้ Color & Export",
      intro: "ตั้งสีและคุณภาพไฟล์ก่อน export ให้พร้อมใช้กับ OBS และ GitHub Pages",
      body: `
        <h3>แนะนำ</h3>
        <ul>
          <li>Primary คือสีหลักของม่านและพลังงาน</li>
          <li>Glow คือสีแสงปาดและ flare ถ้าอยากดูแพงใช้ขาว/ครีม ถ้าอยาก esports ใช้ฟ้า/ชมพู</li>
          <li>Preview BG ใช้เช็กว่า alpha และขอบโลโก้ดูดีบนพื้นหลังหลายแบบหรือไม่</li>
          <li>Bitrate 50 Mbps ใช้งานทั่วไปคมมาก 80 Mbps เหมาะกับ 1440p หรือกราฟิกละเอียด</li>
        </ul>
        <p class="help-callout">ไฟล์ที่ export เป็น WebM ใช้ได้กับ OBS Stinger Transition โดยไม่ต้องมี backend</p>
      `
    },
    preview: {
      title: "วิธีใช้ Preview",
      intro: "พื้นที่นี้ใช้ตรวจจังหวะจริงก่อนบันทึกไฟล์",
      body: `
        <h3>วิธีตรวจงาน</h3>
        <ul>
          <li>กด Play เพื่อดู motion เต็ม</li>
          <li>ลาก timeline เพื่อเช็กแต่ละเฟรม โดยเฉพาะขอบโลโก้และช่วงปิดจอ</li>
          <li>กด OBS Point เพื่อหยุดตรงเฟรมที่ OBS จะตัดซีน</li>
          <li>ดู Alpha Inspector ถ้าขึ้นเต็มหรือเกือบเต็ม แปลว่าช่วงนั้นเหมาะกับการตัดซีน</li>
        </ul>
        <p class="help-callout">ก่อนใช้งานจริง ให้ทดสอบไฟล์ WebM ใน OBS หนึ่งครั้งกับฉากมืดและฉากสว่าง</p>
      `
    }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeAngle(value) {
    const angle = Number(value) || 0;
    return ((angle % 360) + 360) % 360;
  }

  function angleRad(offset = 0) {
    return (normalizeAngle(state.sweepAngle + offset) * Math.PI) / 180;
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

  function effectQuality() {
    if (isRecording || state.previewQuality === "full") return 1;
    if (state.previewQuality === "balanced") return 0.76;
    return 0.54;
  }

  function previewScale() {
    if (isRecording || state.previewQuality === "full") return 1;
    const maxPreviewWidth = state.previewQuality === "balanced" ? 1280 : 960;
    return Math.min(1, maxPreviewWidth / state.width);
  }

  function setCanvasSize(force = false) {
    const scale = previewScale();
    const targetWidth = Math.max(2, Math.round(state.width * scale));
    const targetHeight = Math.max(2, Math.round(state.height * scale));
    if (!force && canvas.width === targetWidth && canvas.height === targetHeight) return;

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    logoLayer.width = targetWidth;
    logoLayer.height = targetHeight;
    particles = buildParticles();
  }

  function buildParticles() {
    const count = Math.max(24, Math.round((42 + state.intensity * 1.35) * effectQuality()));
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
    ctx.rotate(angleRad(-8));

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
    ctx.rotate(angleRad(90));
    for (let i = -count; i <= count; i++) {
      const x = i * (w * 0.085) + Math.sin(timeline.t * Math.PI * 2 + i) * 22;
      const alpha = (0.09 + p * 0.12) * (1 - Math.abs(i) / (count + 1));
      ctx.fillStyle = rgba(i % 2 ? state.primaryColor : state.glowColor, alpha);
      ctx.fillRect(x, -h * 1.2, 3 + (i % 3), h * 2.4);
    }
    ctx.restore();
  }

  function drawVolumetricRays(w, h, timeline) {
    if (!state.enableLightRays) return;
    const panel = getPanelProgress(timeline);
    const flareWindow = Math.sin(clamp((timeline.t - 0.08) / 0.78, 0, 1) * Math.PI);
    const alpha = clamp((panel * 0.32 + flareWindow * 0.18) * (state.realism / 100), 0, 0.55);
    if (alpha <= 0.01) return;

    const cx = w * state.logoX / 100;
    const cy = h * state.logoY / 100;
    const beamLength = Math.max(w, h) * 1.25;
    const count = Math.max(4, Math.round(8 * effectQuality()));

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, cy);
    ctx.rotate(angleRad());
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * 0.12;
      const spread = lerp(0.05, 0.18, seeded(i + 31));
      const localAlpha = alpha * lerp(0.35, 1, seeded(i + 34));
      const grad = ctx.createLinearGradient(0, 0, beamLength, 0);
      grad.addColorStop(0, rgba(state.glowColor, localAlpha));
      grad.addColorStop(0.34, rgba(state.primaryColor, localAlpha * 0.45));
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -h * spread + offset * h);
      ctx.lineTo(beamLength, -h * (spread * 1.9) + offset * h);
      ctx.lineTo(beamLength, h * (spread * 1.9) + offset * h);
      ctx.lineTo(0, h * spread + offset * h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGlowMist(w, h, timeline) {
    if (!state.enableGlowMist) return;
    const panel = getPanelProgress(timeline);
    const alpha = clamp((0.12 + panel * 0.28) * (state.realism / 100), 0, 0.42);
    if (alpha <= 0.01) return;

    const cx = w * state.logoX / 100;
    const cy = h * state.logoY / 100;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const mistCount = Math.max(4, Math.round(10 * effectQuality()));
    for (let i = 0; i < mistCount; i += 1) {
      const angle = seeded(i + 51) * Math.PI * 2 + timeline.t * 0.7;
      const radius = Math.max(w, h) * lerp(0.04, 0.34, seeded(i + 54));
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.52;
      const size = Math.max(w, h) * lerp(0.08, 0.24, seeded(i + 57));
      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, rgba(i % 2 ? state.primaryColor : state.glowColor, alpha * lerp(0.22, 0.7, seeded(i + 60))));
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawShutterWipe(w, h, timeline) {
    if (!state.enableShutter) return;
    const p = getPanelProgress(timeline);
    if (p <= 0.02) return;
    const strips = 9;
    const stripH = h / strips;
    const slide = w * (1 - p);

    ctx.save();
    ctx.globalAlpha = clamp(0.18 + p * 0.42, 0, 0.58);
    for (let i = 0; i < strips; i += 1) {
      const fromLeft = i % 2 === 0;
      const x = fromLeft ? -slide : slide;
      const y = i * stripH;
      const grad = ctx.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0, rgba(state.secondaryColor, 0.85));
      grad.addColorStop(0.5, rgba(i % 3 === 0 ? state.primaryColor : state.accentColor, 0.72));
      grad.addColorStop(1, rgba(state.secondaryColor, 0.85));
      ctx.fillStyle = grad;
      ctx.fillRect(x, y + 1, w, stripH - 2);
    }
    ctx.restore();
  }

  function drawEnergyRing(w, h, timeline) {
    if (!state.enableEnergyRing) return;
    const start = timeline.cut - 0.2;
    const end = timeline.cut + 0.42;
    if (timeline.t < start || timeline.t > end) return;
    const p = clamp((timeline.t - start) / (end - start), 0, 1);
    const cx = w * state.logoX / 100;
    const cy = h * state.logoY / 100;
    const base = Math.min(w, h) * lerp(0.14, 0.54, easeOutCubic(p));

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRad(timeline.t * 180));
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i += 1) {
      const r = base + i * Math.min(w, h) * 0.055;
      ctx.strokeStyle = rgba(i === 1 ? state.glowColor : state.primaryColor, (1 - p) * (0.58 - i * 0.1));
      ctx.lineWidth = lerp(12, 2, p) * (1 - i * 0.18);
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI * 0.12, Math.PI * 1.2);
      ctx.stroke();
      const ticks = Math.max(8, Math.round(14 * effectQuality()));
      for (let j = 0; j < ticks; j += 1) {
        const a = (j / ticks) * Math.PI * 2;
        const inner = r + 10;
        const outer = r + 32 + state.intensity * 0.12;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawLensFlare(w, h, timeline) {
    if (!state.enableLensFlare) return;
    const start = timeline.cut - 0.28;
    const end = timeline.cut + 0.32;
    if (timeline.t < start || timeline.t > end) return;
    const p = clamp((timeline.t - start) / (end - start), 0, 1);
    const flash = Math.sin(p * Math.PI);
    const cx = w * state.logoX / 100;
    const cy = h * state.logoY / 100;
    const dir = angleRad();
    const dx = Math.cos(dir);
    const dy = Math.sin(dir);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = flash * (0.38 + state.realism / 260);
    ctx.strokeStyle = rgba(state.glowColor, 0.8);
    ctx.lineWidth = 2 + state.intensity / 24;
    ctx.beginPath();
    ctx.moveTo(cx - dx * w * 0.55, cy - dy * h * 0.55);
    ctx.lineTo(cx + dx * w * 0.55, cy + dy * h * 0.55);
    ctx.stroke();

    const sizes = [0.018, 0.034, 0.012, 0.052, 0.024];
    for (let i = 0; i < sizes.length; i += 1) {
      const dist = (i - 2) * w * 0.15 + (p - 0.5) * w * 0.18;
      const x = cx + dx * dist;
      const y = cy + dy * dist * 0.56;
      const r = Math.min(w, h) * sizes[i];
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rgba(i % 2 ? state.primaryColor : state.glowColor, 0.8));
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawVignette(w, h, timeline) {
    if (!state.enableVignette) return;
    const p = getPanelProgress(timeline);
    const alpha = clamp((0.18 + p * 0.28) * (state.realism / 100), 0, 0.44);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const grad = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.18, cx, cy, Math.max(w, h) * 0.72);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.62, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function getCameraShake(timeline, w, h) {
    if (!state.enableCameraShake) return { x: 0, y: 0 };
    const impact = Math.max(0, 1 - Math.abs(timeline.t - timeline.cut) / 0.18);
    const exit = Math.max(0, 1 - Math.abs(timeline.t - timeline.exitStart) / 0.13);
    const force = Math.max(impact, exit * 0.55);
    if (force <= 0) return { x: 0, y: 0 };
    const amp = Math.min(w, h) * 0.011 * force * (state.intensity / 100) * (state.realism / 100);
    const phase = timeline.t * 96;
    return {
      x: Math.sin(phase * 1.7) * amp,
      y: Math.cos(phase * 2.1) * amp * 0.62
    };
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

    if (state.enableMotionBlur && blurSteps > 0) {
      for (let i = blurSteps; i >= 1; i--) {
        const ghost = i / blurSteps;
        logoCtx.globalAlpha = opacity * 0.08 * ghost;
        const push = (t > exitStart ? 1 : -1) * ghost * state.intensity * 0.9;
        logoCtx.drawImage(processedLogo, -drawW / 2 + push, -drawH / 2, drawW, drawH);
      }
    }

    if (state.enableChromatic) {
      const glitchWindow = Math.max(0, 1 - Math.abs(t - timeline.cut) / 0.22);
      const edge = (2 + state.intensity * 0.09) * (0.32 + glitchWindow);
      logoCtx.save();
      logoCtx.globalCompositeOperation = "lighter";
      logoCtx.globalAlpha = opacity * (0.09 + glitchWindow * 0.13);
      logoCtx.filter = `drop-shadow(${edge}px 0 0 ${state.primaryColor}) drop-shadow(${-edge}px 0 0 ${state.glowColor})`;
      logoCtx.drawImage(processedLogo, -drawW / 2, -drawH / 2, drawW, drawH);
      logoCtx.restore();
    }

    logoCtx.globalAlpha = opacity;
    logoCtx.filter = "none";
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
    logoCtx.rotate(angleRad());

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

  function drawFrame(timeMs, forceReadout = false) {
    currentTime = clamp(timeMs, 0, state.duration);
    const w = canvas.width;
    const h = canvas.height;
    const timeline = getTimeline(currentTime);

    ctx.clearRect(0, 0, w, h);
    const shake = getCameraShake(timeline, w, h);
    ctx.save();
    ctx.translate(shake.x, shake.y);
    drawVolumetricRays(w, h, timeline);
    drawGlowMist(w, h, timeline);
    drawPanels(w, h, timeline);
    drawShutterWipe(w, h, timeline);
    drawSplitBars(w, h, timeline);
    drawEnergyRing(w, h, timeline);
    drawShockwave(w, h, timeline);
    drawParticles(w, h, timeline);
    drawLogoToLayer(w, h, timeline);
    ctx.drawImage(logoLayer, 0, 0);
    drawLensFlare(w, h, timeline);
    drawTitleBadge(w, h, timeline);
    drawVignette(w, h, timeline);
    ctx.restore();
    drawPreviewBackgroundGuide(w, h);
    updateReadouts(forceReadout);
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
        drawFrame(state.duration, true);
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
    drawFrame((Number(value) / 1000) * state.duration, true);
  }

  function updateReadouts(force = false) {
    const now = performance.now();
    if (!force && (isPlaying || isRecording) && now - lastReadoutUpdate < 90) return;
    lastReadoutUpdate = now;

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
    const previewText = canvas.width === state.width ? "" : ` / Preview ${canvas.width}x${canvas.height}`;
    $("metricResolution").textContent = `${state.width}x${state.height}${previewText}`;
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

  function normalizeState() {
    state.sweepAngle = normalizeAngle(state.sweepAngle);
    state.duration = Number(state.duration) || 2400;
    state.transitionPoint = clamp(Number(state.transitionPoint) || 1000, 400, Math.max(500, state.duration - 300));
    state.intensity = clamp(Number(state.intensity) || 72, 10, 100);
    state.realism = clamp(Number(state.realism) || 68, 0, 100);
    if (!["smooth", "balanced", "full"].includes(state.previewQuality)) {
      state.previewQuality = "smooth";
    }
  }

  function syncControls() {
    normalizeState();
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
    $("realismValue").textContent = `${state.realism}%`;
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
      if (id === "sweepAngle") {
        state[id] = normalizeAngle(state[id]);
      }
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
        <em>${preset.category || "Preset"}</em>
      </button>`
    )).join("");
    grid.addEventListener("click", (event) => {
      const card = event.target.closest(".preset-card");
      if (card) applyPreset(card.dataset.preset);
    });
  }

  function openHelp(topic) {
    const content = helpContent[topic] || helpContent.preview;
    $("helpTitle").textContent = content.title;
    $("helpIntro").textContent = content.intro;
    $("helpBody").innerHTML = content.body;
    $("helpModal").hidden = false;
  }

  function closeHelp() {
    $("helpModal").hidden = true;
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
    setCanvasSize(true);
    drawFrame(0, true);

    $("exportState").textContent = "กำลังเข้ารหัส WebM...";
    $("btnExport").textContent = "กำลังบันทึก...";
    $("btnExportTop").textContent = "Recording";

    const fps = Number(state.fps) || 60;
    const frameDuration = 1000 / fps;
    const totalFrames = Math.ceil(state.duration / frameDuration);
    let stream;
    try {
      stream = canvas.captureStream(0);
    } catch (error) {
      stream = canvas.captureStream(fps);
    }
    let videoTrack = stream.getVideoTracks()[0];
    let canRequestFrame = Boolean(videoTrack && typeof videoTrack.requestFrame === "function");
    if (!canRequestFrame) {
      stream.getTracks().forEach((track) => track.stop());
      stream = canvas.captureStream(fps);
      videoTrack = stream.getVideoTracks()[0];
      canRequestFrame = Boolean(videoTrack && typeof videoTrack.requestFrame === "function");
    }
    let recorder;
    try {
      recorder = new MediaRecorder(stream, getRecorderOptions());
    } catch (error) {
      recorder = new MediaRecorder(stream);
    }
    const chunks = [];
    let exportFailed = false;

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };

    recorder.onerror = () => {
      exportFailed = true;
      stream.getTracks().forEach((track) => track.stop());
      isRecording = false;
      setCanvasSize(true);
      $("btnExport").textContent = "บันทึก WebM";
      $("btnExportTop").textContent = "Export";
      drawFrame(state.transitionPoint, true);
      alert("Export ไม่สำเร็จ ลองลด FPS/Resolution หรือปิด Motion FX บางตัวแล้วบันทึกใหม่");
    };

    recorder.onstop = () => {
      if (exportFailed) return;
      if (!chunks.length) {
        stream.getTracks().forEach((track) => track.stop());
        isRecording = false;
        setCanvasSize(true);
        $("btnExport").textContent = "บันทึก WebM";
        $("btnExportTop").textContent = "Export";
        drawFrame(state.transitionPoint, true);
        alert("Export ไม่สำเร็จเพราะ browser ไม่ส่งข้อมูลวิดีโอ ลองใช้ Chrome/Edge รุ่นล่าสุด");
        return;
      }

      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      downloadBlob(blob, `pepslive-stinger-studio-${dateStamp()}.webm`);
      stream.getTracks().forEach((track) => track.stop());
      isRecording = false;
      setCanvasSize(true);
      $("btnExport").textContent = "บันทึก WebM";
      $("btnExportTop").textContent = "Export";
      drawFrame(state.transitionPoint, true);
      flashStatus(`Export สำเร็จ ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
    };

    recorder.start();
    let frameIndex = 0;
    const startedAt = performance.now();
    lastExportStatus = 0;

    const renderExportFrame = () => {
      const frameTime = Math.min(frameIndex * frameDuration, state.duration);
      drawFrame(frameTime, frameIndex === 0 || frameIndex >= totalFrames);
      if (canRequestFrame) videoTrack.requestFrame();

      const now = performance.now();
      if (now - lastExportStatus > 120 || frameIndex >= totalFrames) {
        const percent = Math.min(100, Math.round((frameIndex / totalFrames) * 100));
        $("exportState").textContent = `กำลังเข้ารหัส ${percent}%`;
        lastExportStatus = now;
      }

      frameIndex += 1;
      if (frameIndex <= totalFrames) {
        const targetTime = startedAt + frameIndex * frameDuration;
        const delay = Math.max(0, targetTime - performance.now());
        window.setTimeout(() => requestAnimationFrame(renderExportFrame), delay);
      } else {
        drawFrame(state.duration, true);
        if (canRequestFrame) videoTrack.requestFrame();
        window.setTimeout(() => recorder.stop(), Math.max(140, frameDuration * 2));
      }
    };
    requestAnimationFrame(renderExportFrame);
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
    document.querySelectorAll(".help-btn").forEach((button) => {
      button.addEventListener("click", () => openHelp(button.dataset.help));
    });
    $("helpClose").addEventListener("click", closeHelp);
    $("helpModal").addEventListener("click", (event) => {
      if (event.target === $("helpModal")) closeHelp();
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !$("helpModal").hidden) {
        closeHelp();
        return;
      }
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
