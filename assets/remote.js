(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const status = document.getElementById('remoteStatus');
  const button = document.getElementById('spinButton');
  const hint = document.getElementById('remoteHint');
  let busy = false;
  let cooldownTimer = null;

  const setStatus = (message, state = 'checking') => {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  };

  const setBusy = (value) => {
    busy = value;
    if (!button) return;
    button.disabled = value || !token;
  };

  async function validate() {
    if (!token) {
      setStatus('ลิงก์ไม่ครบ กรุณาสแกน QR ใหม่จากเครื่องหลัก', 'error');
      if (hint) hint.textContent = 'ต้องมี Token ในลิงก์ Remote';
      setBusy(true);
      return false;
    }

    try {
      const response = await fetch(`/api/remote/status?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('invalid');
      setStatus('พร้อมเชื่อมต่อเครื่องหลัก', 'ready');
      setBusy(false);
      return true;
    } catch {
      setStatus('ลิงก์หมดอายุ หรือเครื่องหลักยังไม่เปิด', 'error');
      if (hint) hint.textContent = 'เปิด run.bat ที่เครื่องหลัก แล้วสแกน QR ใหม่';
      setBusy(true);
      return false;
    }
  }

  function startCooldown(seconds) {
    window.clearInterval(cooldownTimer);
    let left = Math.max(1, Math.ceil(Number(seconds) || 1));
    setBusy(true);
    setStatus(`ส่งคำสั่งแล้ว · รอ ${left} วินาที`, 'sent');
    cooldownTimer = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        window.clearInterval(cooldownTimer);
        cooldownTimer = null;
        setStatus('พร้อมหมุนวงล้ออีกครั้ง', 'ready');
        setBusy(false);
      } else {
        setStatus(`ส่งคำสั่งแล้ว · รอ ${left} วินาที`, 'sent');
      }
    }, 1000);
  }

  button?.addEventListener('click', async () => {
    if (busy || !token) return;
    setBusy(true);
    setStatus('กำลังส่งคำสั่งไปเครื่องหลัก...', 'busy');
    try {
      const response = await fetch('/api/remote/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 429) {
        startCooldown(payload.retryAfter || 1);
        return;
      }
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'send_failed');
      startCooldown(1);
    } catch {
      setStatus('ส่งคำสั่งไม่สำเร็จ ตรวจ Wi‑Fi และเครื่องหลัก', 'error');
      setBusy(false);
    }
  });

  validate();
})();
