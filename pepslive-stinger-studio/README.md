# PepsLive Stinger Studio

เครื่องมือสร้าง OBS Stinger Transition แบบ static web สำหรับ PepsProduction / PepsLive

## เปิดใช้งาน

เปิดไฟล์ `index.html` ได้ทันที หรืออัปทั้งโฟลเดอร์ขึ้น GitHub Pages

```text
pepslive-stinger-studio/
  index.html
  assets/
    css/style.css
    js/app.js
    img/pepsproduction-logo.png
```

## ฟีเจอร์หลัก

- โลโก้ PepsProduction อยู่มุมบนซ้ายของเว็บ
- Preset สำเร็จรูป 14 แบบ แยกแนว Live Sport, TV, Arena, Replay, Sponsor และ Final
- Canvas preview 16:9 พร้อม timeline scrubber
- Preview Quality แยกจาก Export Resolution เพื่อให้พรีวิวลื่น แต่ export ยังเต็มคุณภาพ
- ตั้งค่า duration, OBS transition point, FPS, resolution, bitrate
- Effect layers: curtain panels, alpha sweep, particles, shockwave, split bars, light rays, lens flare, glow mist, energy ring, chromatic edge, shutter wipe, vignette, camera shake, motion blur, title badge
- องศาแสงปรับได้ครบ 0-360 องศา
- Export loop ใช้ frame index ตาม FPS เพื่อลดจังหวะสะดุดจากเครื่องตอนบันทึก
- ปุ่ม `วิธีใช้` รายหมวด พร้อม popup อธิบายการใช้งาน
- Auto White Matte สำหรับโลโก้ที่มีพื้นหลังขาว
- ดูดสีจากโลโก้เพื่อทำ palette
- Export เป็น `.webm` ด้วย MediaRecorder
- Save/Load project เป็น JSON และ autosave ใน browser

## ค่า OBS แนะนำ

```text
Scene Transition: Stinger
Transition Point Type: Time (milliseconds)
Transition Point: ใช้ค่าที่แสดงในหน้าเว็บ
Video File: ไฟล์ .webm ที่ export
```

## GitHub Pages

ใช้ path แบบ relative ทั้งหมด จึงสามารถอัปเป็น subfolder ได้ เช่น:

```text
https://pepsproduction.github.io/PepsLive_Tournament_Studio/pepslive-stinger-studio/
```

หรือแยกเป็น repo ใหม่ชื่อ:

```text
pepslive-stinger-studio
```
