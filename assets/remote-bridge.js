/* Local-server bridge: receives spin commands without exposing tournament data. */
(() => {
  const view = new URLSearchParams(window.location.search).get('view');
  if (view) return;

  let remoteInfo = null;
  let lastEventId = 0;
  let eventStorageKey = '';
  let primed = false;
  let failures = 0;
  let pollTimer = 0;
  let eventStream = null;
  let streamReconnectTimer = 0;
  let streamConnected = false;

  const api = (path) => new URL(path, window.location.href).toString();
  const emitInfo = () => window.dispatchEvent(new CustomEvent('peps:remote-info', { detail: remoteInfo }));

  function setStatus(message, mode = 'idle') {
    document.querySelectorAll('[data-remote-status]').forEach((node) => {
      node.textContent = message;
      node.dataset.state = mode;
    });
  }

  function renderInfo() {
    const urlNode = document.querySelector('[data-remote-url]');
    const qrNode = document.querySelector('[data-remote-qr]');
    const emptyNode = document.querySelector('[data-remote-qr-empty]');
    const copyButtons = document.querySelectorAll('[data-remote-copy]');
    const rotateButtons = document.querySelectorAll('[data-remote-rotate]');
    const hasInfo = !!remoteInfo?.remoteUrl;

    if (urlNode) urlNode.textContent = hasInfo ? remoteInfo.remoteUrl : 'กำลังรอ Local Server...';
    if (qrNode) {
      qrNode.hidden = !hasInfo;
      if (hasInfo) qrNode.src = new URL(remoteInfo.qrUrl, window.location.href).toString();
    }
    if (emptyNode) emptyNode.hidden = hasInfo;
    copyButtons.forEach((button) => { button.disabled = !hasInfo; });
    rotateButtons.forEach((button) => { button.disabled = !hasInfo; });
  }

  async function loadInfo() {
    try {
      const response = await fetch(api('/api/remote/info'), { cache: 'no-store' });
      if (!response.ok) throw new Error('server_unavailable');
      remoteInfo = await response.json();
      const nextStorageKey = remoteInfo?.remoteUrl
        ? `pepslive.remote.lastEvent:${remoteInfo.remoteUrl}`
        : '';
      if (nextStorageKey !== eventStorageKey) {
        eventStorageKey = nextStorageKey;
        lastEventId = 0;
        primed = false;
        try {
          lastEventId = Number(sessionStorage.getItem(eventStorageKey) || 0) || 0;
        } catch {}
      }
      failures = 0;
      setStatus(`พร้อมใช้ · LAN ${remoteInfo.lanIp}:${remoteInfo.port}`, 'ready');
      emitInfo();
      renderInfo();
      return true;
    } catch {
      remoteInfo = null;
      failures += 1;
      setStatus('Local Server ยังไม่พร้อม · เปิด run.bat ก่อน', 'error');
      emitInfo();
      renderInfo();
      return false;
    }
  }

  function rememberEvent(id) {
    lastEventId = Number(id) || lastEventId;
    if (!eventStorageKey) return;
    try { sessionStorage.setItem(eventStorageKey, String(lastEventId)); } catch {}
  }

  function handleSpinEvent(event) {
    const eventId = Number(event?.id) || 0;
    if (eventId && eventId <= lastEventId) return;
    if (!primed) {
      rememberEvent(eventId);
      return;
    }
    rememberEvent(eventId);
    if (typeof window.PeppsLiveTournamentStudio?.remoteSpin !== 'function') return;
    const accepted = window.PeppsLiveTournamentStudio.remoteSpin();
    setStatus(accepted === false ? 'คำสั่งถูกปฏิเสธ · ตรวจสถานะ Draw' : 'มือถือสั่งหมุนแล้ว', accepted === false ? 'error' : 'sent');
  }

  function handleEventBatch(payload) {
    const events = Array.isArray(payload?.events) ? payload.events : [];
    if (!primed) {
      rememberEvent(payload?.latest || (events.length ? events[events.length - 1].id : lastEventId));
      primed = true;
      return;
    }
    events.forEach(handleSpinEvent);
    if (payload?.latest) rememberEvent(payload.latest);
  }

  async function poll() {
    if (streamConnected) return;
    try {
      const response = await fetch(api(`/api/remote/events?since=${encodeURIComponent(lastEventId)}`), { cache: 'no-store' });
      if (!response.ok) throw new Error('poll_failed');
      const payload = await response.json();
      failures = 0;
      handleEventBatch(payload);
    } catch {
      failures += 1;
      if (failures === 2) setStatus('เชื่อมต่อ Local Server ไม่ได้', 'error');
    }
    if (!streamConnected) pollTimer = window.setTimeout(poll, failures >= 3 ? 1800 : 450);
  }

  function schedulePoll(delay = 0) {
    window.clearTimeout(pollTimer);
    pollTimer = window.setTimeout(poll, delay);
  }

  function connectEventStream() {
    if (!remoteInfo?.remoteUrl) return;
    if (typeof window.EventSource !== 'function') {
      schedulePoll(0);
      return;
    }

    window.clearTimeout(streamReconnectTimer);
    eventStream?.close();
    const stream = new EventSource(api(`/api/remote/stream?since=${encodeURIComponent(lastEventId)}`));
    eventStream = stream;
    streamConnected = false;

    stream.onopen = () => {
      if (eventStream !== stream) return;
      streamConnected = true;
      failures = 0;
      window.clearTimeout(pollTimer);
      pollTimer = 0;
      setStatus(`พร้อมใช้ · LAN ${remoteInfo.lanIp}:${remoteInfo.port}`, 'ready');
    };
    stream.addEventListener('spin', (event) => {
      try { handleSpinEvent(JSON.parse(event.data || '{}')); } catch {}
    });
    stream.addEventListener('ready', (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (payload.latest != null) rememberEvent(payload.latest);
      } catch {}
      primed = true;
    });
    stream.onerror = () => {
      if (eventStream !== stream) return;
      streamConnected = false;
      stream.close();
      eventStream = null;
      failures += 1;
      schedulePoll(0);
      window.clearTimeout(streamReconnectTimer);
      streamReconnectTimer = window.setTimeout(connectEventStream, failures >= 3 ? 2500 : 1000);
    };
  }

  async function copyRemoteUrl() {
    if (!remoteInfo?.remoteUrl) return;
    try {
      await navigator.clipboard.writeText(remoteInfo.remoteUrl);
      setStatus('คัดลอกลิงก์มือถือแล้ว', 'sent');
    } catch {
      const field = document.createElement('textarea');
      field.value = remoteInfo.remoteUrl;
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
      setStatus('คัดลอกลิงก์มือถือแล้ว', 'sent');
    }
  }

  async function rotateToken() {
    const buttons = document.querySelectorAll('[data-remote-rotate]');
    buttons.forEach((button) => { button.disabled = true; });
    try {
      const response = await fetch(api('/api/remote/token/rotate'), { method: 'POST' });
      if (!response.ok) throw new Error('rotate_failed');
      remoteInfo = await response.json();
      setStatus('สร้าง QR/ลิงก์ใหม่แล้ว ลิงก์เก่าใช้ไม่ได้', 'ready');
      emitInfo();
      renderInfo();
    } catch {
      setStatus('สร้าง QR ใหม่ไม่ได้ ต้องเปิด Control จาก localhost', 'error');
      renderInfo();
    }
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-remote-copy]')) copyRemoteUrl();
    if (event.target.closest('[data-remote-rotate]')) rotateToken();
  }, true);

  window.PeppsRemoteBridge = {
    getInfo: () => remoteInfo,
    refresh: loadInfo,
    copy: copyRemoteUrl,
    rotate: rotateToken,
  };

  async function boot() {
    renderInfo();
    await loadInfo();
    connectEventStream();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
