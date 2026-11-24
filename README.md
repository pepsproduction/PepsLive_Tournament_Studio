# PepsLive Tournament Studio

เว็บเดียวสำหรับจัดการแข่งขันแบบใช้งานกับ PepsLive / OBS ได้ง่ายขึ้น

## สิ่งที่เพิ่มใน Final

- ตัด Excel Export ออกแล้ว เหลือ Copy + Google Sheet
- เพิ่มระบบ Stepper เห็นสถานะงานชัดขึ้น
- เพิ่มระบบ Ranking Rules: คะแนนชนะ/เสมอ/แพ้ และจำนวนทีมเข้ารอบต่อสาย
- เพิ่ม Manual Qualifier Override สำหรับกรณีหน้างานต้องแก้อันดับ/ทีมเข้ารอบเอง
- เพิ่ม Knockout Auto Advance: QF → SF → Final / Third Place
- เพิ่ม Match Status: Pending, Live, Finished, Bye, Forfeit A, Forfeit B
- เพิ่ม Rest Warning แจ้งทีมที่พักน้อยเกินไป
- เพิ่ม Copy Export หลายรูปแบบ: Draw, Schedule, Scores, Standings, Knockout, Caption, Presenter Script, All
- เพิ่ม Live Sources สำหรับ OBS เฉพาะ Draw Animation และ Groups Table
- เพิ่ม Google Apps Script Webhook ตัวอย่างสำหรับ Export เข้า Google Sheet

## วิธีใช้งานเร็ว

1. ดับเบิลคลิก `run.bat` เพื่อเปิด Local Server และหน้า Control อัตโนมัติ
2. ไปที่ `Setup` ตั้งค่ารายการ
3. ไปที่ `Teams` วางรายชื่อทีมทีละบรรทัด
4. ไปที่ `Draw` กด `Start Draw` แล้วกด `Confirm Result`
5. ไปที่ `Schedule` กด `Generate Schedule`
6. ไปที่ `Scores` กรอกคะแนนและสถานะเป็น `Finished`
7. ไปที่ `Knockout` กด `Generate / Refresh Knockout`
8. ไปที่ `Export` เพื่อ Copy หรือส่ง Google Sheet

ถ้าเครื่องไม่มี Python 3 ให้ติดตั้งก่อนใช้ `run.bat` โดยระบบจะใช้ Python แบบไม่ต้องติดตั้งแพ็กเกจเพิ่ม

บนหน้า Setup เลือกแบ่งอัตโนมัติหรือระบุจำนวนทีมรายสายได้ เช่น `4/3/3/3` โดยโหมดกำหนดเองต้องมีรายชื่อครบ 13 ทีมก่อนสุ่ม ตัวอย่างนี้จะสร้างตาราง 15 คู่ และระบบจะเปิดให้สร้าง Knockout เมื่อบันทึกผลครบตามผังสาย

## สั่งหมุนวงล้อจากมือถือ

1. เปิด `run.bat` และเปิดหน้า `Live Sources` ในหน้า Control
2. ใช้มือถือสแกน QR ในการ์ด `Mobile Remote`
3. มือถือจะแสดงเฉพาะปุ่ม `หมุนวงล้อ` ไม่มีสิทธิ์แก้รายชื่อทีม คะแนน หรือการตั้งค่า
4. ต้องให้มือถือกับคอมพิวเตอร์อยู่ Wi-Fi/LAN เดียวกัน และต้องเปิดหน้า Control ไว้เพื่อรับคำสั่ง

ระบบจะสร้างลิงก์ด้วย LAN IP ของคอมพิวเตอร์ เช่น `http://192.168.1.34:8787/remote.html?...` โดยอัตโนมัติ
หากต้องการยกเลิกลิงก์เดิม ให้กด `สร้าง QR ใหม่` ในการ์ด Mobile Remote ซึ่งจะเปลี่ยน Token ทันที

ถ้า Windows Firewall ถามสิทธิ์ ให้ Allow เฉพาะเครือข่าย Private ที่ใช้งานอยู่

## OBS Browser Source URLs

ถ้าใช้ Local Server ให้ใช้ URL ของเซิร์ฟเวอร์ เช่น:

```text
http://127.0.0.1:8787/?view=wheel
http://127.0.0.1:8787/?view=draw-animation
http://127.0.0.1:8787/?view=groups
```

ถ้าจะเปิดจากเครื่องอื่น ให้เปลี่ยน `127.0.0.1` เป็น LAN IP ของเครื่องหลัก เช่น `192.168.1.34`

หลังอัปขึ้น GitHub Pages ใช้ URL แบบนี้:

```text
index.html?view=wheel
index.html?view=groups
```

ในหน้า `Live Sources` มีปุ่ม Copy URL ให้แล้ว

## ขอบเขตของ Local Server

- `run.bat` จะหา Port ว่างให้อัตโนมัติ และไม่ปิดโปรแกรมหรือเซิร์ฟเวอร์อื่นที่กำลังใช้งานอยู่
- ข้อมูลการแข่งขันยังเก็บใน `localStorage` ของ Browser ตามเดิม
- Control จะส่ง state สำหรับงานถ่ายทอดเข้า Local Server และ OBS Browser Source จะอ่าน snapshot เดียวกัน ทำให้ Draw Animation และ Groups Table ตรงกับหน้าเว็บ
- Local Server ทำหน้าที่เสิร์ฟไฟล์, ส่งคำสั่งหมุนจากมือถือแบบ Server-Sent Events และเป็น state bridge ระหว่าง Control กับ OBS
- การหมุนจากมือถือจะไม่ทำงานถ้าปิดหน้า Control หรือปิด Local Server
- การหมุนครั้งแรกจะเริ่มชุดสุ่ม ส่วนครั้งต่อไปจะเปิดผลถัดไปจากชุดเดิม ไม่สุ่ม/รีเซ็ตสายใหม่ทุกครั้ง หากต้องการเริ่มชุดใหม่ให้กด `Start Draw` จากหน้าเว็บ
- ถ้าต้องการให้ OBS อัปเดตตามเว็บ ให้ใช้ Browser Source URL จาก Local Server เดียวกัน เช่น `http://127.0.0.1:8787/?view=groups` ไม่ใช้ไฟล์ที่เปิดด้วย `file://`
- เปลี่ยนรูปแบบ Wheel/Slot/Card/Lottery ได้ที่ `Draw > รูปแบบ Animation` แล้ว `Draw Animation Source` จะใช้รูปแบบนั้นตาม state ล่าสุด
- ปรับความเข้มของพื้นผิว OBS ได้ที่ `Settings > OBS Source Display > ความเข้ม OBS Live Sources` ค่าเริ่มต้นคือ 90%

## Google Sheet Webhook

1. เปิด Google Apps Script
2. วางโค้ดจาก `apps-script-webhook.gs`
3. Deploy เป็น Web app
4. Execute as: Me
5. Who has access: Anyone with the link
6. Copy Web app URL มาใส่ในหน้า Export

### ตั้ง Secret Token

ไปที่ Apps Script > Project Settings > Script properties

```text
PEPSLIVE_TOKEN = รหัสที่ต้องการ
```

จากนั้นใส่รหัสเดียวกันในช่อง `Secret Token` บนเว็บ

## ข้อจำกัด Final

- ยังไม่สร้าง OBS Source อัตโนมัติผ่าน WebSocket
- Google Sheet รับข้อมูลที่เว็บคำนวณแล้ว ยังไม่ได้ทำสูตร live ภายใน Sheet แบบเต็ม
- Knockout รองรับ 4 หรือ 8 ทีมเข้ารอบดีที่สุด ถ้ามากกว่านั้นระบบจะจัดแบบเบื้องต้น
- ระบบนี้เก็บข้อมูลหลักใน localStorage ของ browser และควร Save JSON Backup ก่อนออกงานจริง

## ไฟล์ในชุดนี้

```text
index.html
assets/style.css
assets/app.js
assets/remote-bridge.js
assets/remote.css
assets/remote.js
apps-script-webhook.gs
remote.html
run.bat
server.py
README.md
```


## Final package

Recommended project name: PepsLive Tournament Studio

GitHub Pages: upload all files in this folder to the repository root. index.html is the entry file.

Final additions:
- Layout resize controls
- Control Center width
- App width
- Draw stage height
- Draw panel mode: Normal / Wide / Full
- Compact UI mode
