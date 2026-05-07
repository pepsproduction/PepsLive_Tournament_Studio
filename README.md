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
- เพิ่ม Live Sources: Wheel, Slot, Card, Lottery, Winner, Groups, Schedule, Standings, Knockout, Lower Third, Next Match, Latest Result
- เพิ่ม Google Apps Script Webhook ตัวอย่างสำหรับ Export เข้า Google Sheet

## วิธีใช้งานเร็ว

1. เปิด `index.html` ด้วย Chrome
2. ไปที่ `Setup` ตั้งค่ารายการ
3. ไปที่ `Teams` วางรายชื่อทีมทีละบรรทัด
4. ไปที่ `Draw` กด `Start Draw` แล้วกด `Confirm Result`
5. ไปที่ `Schedule` กด `Generate Schedule`
6. ไปที่ `Scores` กรอกคะแนนและสถานะเป็น `Finished`
7. ไปที่ `Knockout` กด `Generate / Refresh Knockout`
8. ไปที่ `Export` เพื่อ Copy หรือส่ง Google Sheet

## OBS Browser Source URLs

หลังอัปขึ้น GitHub Pages ใช้ URL แบบนี้:

```text
index.html?view=wheel
index.html?view=slot
index.html?view=card
index.html?view=lottery
index.html?view=winner
index.html?view=groups
index.html?view=schedule
index.html?view=standings
index.html?view=knockout
index.html?view=lower-third
index.html?view=next-match
index.html?view=latest-result
```

ในหน้า `Live Sources` มีปุ่ม Copy URL ให้แล้ว

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
apps-script-webhook.gs
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
