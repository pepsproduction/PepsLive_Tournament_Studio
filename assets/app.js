/* PepsLive Tournament Studio - Clean Core V13
   - Replaces old source model directly in assets/app.js
   - Draw Animation Source is single: ?view=draw-animation
   - Old aliases wheel/slot/card/lottery/glitch/galaxy/crystal/plasma/vortex/winner map to draw-animation
   - Live Sources remain: Draw Animation and Groups Table
*/
(() => {
  'use strict';

  const STORAGE_KEY = 'pepsliveTournamentControlV2';
  const DRAW_TEXT_PREVIEW_KEY = 'pepsliveDrawTextPreviewV12';
  const APP_VERSION = 'Clean-Core-13.0.0';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const on = (el, evt, fn, opts) => { if (el) el.addEventListener(evt, fn, opts); };
  const nowIso = () => new Date().toISOString();
  const clamp = (v, min, max, d = min) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d;
  };
  const intClamp = (v, min, max, d = min) => Math.round(clamp(v, min, max, d));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));

  const PANELS = [
    ['dashboard', 'Dashboard', 'ภาพรวม'],
    ['setup', 'Setup', 'ตั้งค่ารายการ'],
    ['teams', 'Teams', 'รายชื่อทีม'],
    ['draw', 'Draw', 'สุ่มสาย'],
    ['schedule', 'Schedule', 'ตารางแข่ง'],
    ['scores', 'Scores', 'คะแนน/อันดับ'],
    ['knockout', 'Knockout', 'รอบต่อไป'],
    ['sources', 'Live Sources', 'OBS'],
    ['export', 'Export', 'Copy/Sheet'],
    ['settings', 'Settings', 'ตั้งค่า']
  ];

  const NAV_GROUPS = [
    ['เตรียมรายการ', ['dashboard', 'setup', 'teams', 'draw']],
    ['ดำเนินการแข่งขัน', ['schedule', 'scores', 'knockout']],
    ['ถ่ายทอดและส่งออก', ['sources', 'export']],
    ['ระบบ', ['settings']]
  ];

  const DRAW_SOURCE_ID = 'draw-animation';
  const DRAW_SOURCE_ALIASES = ['wheel', 'slot', 'card', 'lottery', 'glitch', 'galaxy', 'crystal', 'plasma', 'vortex', 'winner'];

  const SOURCES = [
    ['draw-animation', 'Draw Animation Source', 'ใช้รูปแบบ Animation และผลล่าสุดจาก Draw Control แบบ real-time'],
    ['groups', 'Groups Table', 'ใช้ข้อมูลและรูปแบบตารางเดียวกับ Groups ในหน้าเว็บ']
  ];

  const SOURCE_META = Object.fromEntries(SOURCES.map(([id, title, desc]) => [id, { id, title, desc }]));
  const OBS_SOURCE_VIEWS = SOURCES.map(([id]) => id);

  const PANEL_HELP = {
    dashboard: 'หน้าภาพรวม ใช้ดูว่าตั้งค่า ทีม สุ่มสาย ตาราง คะแนน และรอบ Knockout ไปถึงขั้นตอนไหนแล้ว',
    setup: 'หน้าตั้งค่ารายการ เช่น ชื่อรายการ ประเภทกีฬา จำนวนสาย จำนวนสนาม เวลาเริ่ม และกติกาคะแนน',
    teams: 'หน้าใส่รายชื่อทีม ทีละบรรทัด ระบบจะเอารายชื่อนี้ไปสุ่มสายและสร้างตารางแข่ง',
    draw: 'หน้าจับสลากแบ่งสาย เลือกรูปแบบ animation แล้วสุ่มทีมเข้ากลุ่มก่อนกดยืนยันผล',
    schedule: 'หน้าสร้างและแก้ตารางแข่งรอบแบ่งกลุ่ม พร้อมดูตัวอย่างคู่ Knockout ที่จะรอไว้ล่วงหน้า',
    scores: 'หน้ากรอกผลการแข่งขัน ระบบจะคำนวณตารางคะแนนและอันดับให้ทันที',
    knockout: 'หน้าสร้างสายรอบ Knockout จากอันดับในรอบแบ่งกลุ่ม และบันทึกผลรอบต่อไป',
    sources: 'หน้ารวม URL สำหรับเอาไปใส่ใน OBS Browser Source เฉพาะ Draw Animation และ Groups Table',
    export: 'หน้าส่งออกข้อมูลเป็นข้อความ, Excel, JSON หรือ Google Sheet สำหรับนำไปใช้ต่อ',
    settings: 'หน้าปรับขนาดหน้าจอ แผงควบคุม รูปแบบหน้า Draw และการแสดงผลของ OBS Source'
  };

  const ID_HELP = {
    autosavePill: 'แสดงเวลาล่าสุดที่ระบบบันทึกข้อมูลลงใน browser อัตโนมัติ',
    sheetPill: 'บอกสถานะว่าได้ตั้งค่า Google Sheet Webhook แล้วหรือยัง',
    btnSaveProject: 'ดาวน์โหลดข้อมูลโปรเจกต์ทั้งหมดเป็นไฟล์ JSON เพื่อเก็บสำรองหรือย้ายเครื่อง',
    loadProjectInput: 'โหลดไฟล์ JSON ที่เคย Save ไว้กลับเข้าระบบ',
    safeLiveToggle: 'โหมดปลอดภัยสำหรับงานสด ผลสุ่มจะยังไม่ถือเป็นผลจริงจนกว่าจะกด Confirm Result',
    goNext: 'ข้ามไปหน้าถัดไปตามลำดับการทำงานของระบบ',
    eventName: 'ชื่อรายการแข่งขันที่จะใช้แสดงบน Dashboard, OBS Source และไฟล์ Export',
    sportType: 'ประเภทกีฬา ใช้เป็นข้อมูลประกอบรายการและช่วยให้ทีมงานเข้าใจรูปแบบการแข่งขัน',
    preset: 'ชุดตั้งค่าตัวอย่างตามประเภทกีฬา เลือกเพื่อช่วยเริ่มต้นเร็วขึ้น',
    groupCount: 'จำนวนสายหรือกลุ่มที่ต้องการแบ่งทีม เช่น 4 คือสาย A-D',
    courtCount: 'จำนวนสนามที่ใช้แข่งพร้อมกัน ระบบจะกระจายคู่แข่งลงสนามตามจำนวนนี้',
    startTime: 'เวลาเริ่มคู่แรกของตารางแข่ง',
    matchInterval: 'ระยะเวลาห่างระหว่างรอบเวลาแต่ละชุด เช่น 15 นาทีต่อ slot',
    breakEverySlots: 'กำหนดให้แทรกเวลาพักทุกกี่รอบเวลา ใส่ 0 ถ้าไม่ต้องการพัก',
    breakMinutes: 'จำนวนนาทีที่ต้องการพักเมื่อถึงรอบเวลาพัก',
    pointsWin: 'แต้มที่ทีมได้รับเมื่อชนะในรอบแบ่งกลุ่ม',
    pointsDraw: 'แต้มที่ทีมได้รับเมื่อเสมอ',
    pointsLoss: 'แต้มที่ทีมได้รับเมื่อแพ้',
    qualifiersPerGroup: 'จำนวนทีมที่เข้ารอบจากแต่ละสาย เช่น 2 คืออันดับ 1-2 ของทุกสาย',
    saveSetup: 'บันทึกค่ารายการและกติกาคะแนนที่กรอกไว้',
    resetAll: 'ล้างข้อมูลโปรเจกต์ทั้งหมดและเริ่มใหม่ ควร Save JSON สำรองก่อนใช้',
    teamText: 'วางรายชื่อทีมทีละบรรทัด ระบบจะนับและใช้ชื่อเหล่านี้ในการสุ่มสาย',
    saveTeams: 'บันทึกรายชื่อทีม ถ้ามี Draw/Schedule เดิม ระบบอาจรีเซ็ตข้อมูลที่เกี่ยวข้อง',
    dedupeTeams: 'ลบชื่อทีมที่ซ้ำกันออก เหลือชื่อทีมละหนึ่งรายการ',
    sampleTeams: 'ใส่รายชื่อทีมตัวอย่าง 16 ทีม เพื่อทดลองระบบอย่างรวดเร็ว',
    drawAnimation: 'เลือกรูปแบบภาพเคลื่อนไหวตอนสุ่ม เช่น Wheel, Slot, Card หรือ Lottery',
    drawMethod: 'เลือกวิธีเปิดผลสุ่ม: อัตโนมัติทีละทีม, กดเองทีละทีม, หรือสุ่มทั้งหมดทีเดียว',
    drawDuration: 'กำหนดเวลาหน่วง animation ก่อนแสดงผลสุ่ม',
    drawNote: 'ใส่หมายเหตุของรอบจับสาย เช่น รอบเช้า รอบบ่าย หรือ seed ที่ใช้',
    drawStage: 'พื้นที่แสดง animation และผลทีมที่กำลังถูกสุ่ม',
    startDraw: 'เริ่มสุ่มสายตามรายชื่อทีมและวิธีสุ่มที่เลือก',
    nextReveal: 'เปิดผลทีมถัดไป ใช้กับโหมด Manual Reveal',
    confirmDraw: 'ยืนยันผลแบ่งสายให้เป็นผลจริง ก่อนนำไปสร้างตารางแข่ง',
    redraw: 'ล้างผลสุ่มที่เตรียมไว้ เพื่อเริ่มสุ่มใหม่ก่อนยืนยัน',
    undoDraw: 'ย้อนกลับผลสุ่มล่าสุดหนึ่งขั้น ใช้แก้กรณีกดพลาดก่อนยืนยัน',
    toggleDrawExpand: 'ขยายหน้าต่าง Draw ให้ใหญ่ขึ้น เหมาะกับการแสดงบนจอหรือเช็กหน้างาน',
    pendingBox: 'แสดงสถานะผลสุ่มที่รอยืนยัน',
    scheduleDuration: 'กำหนดเวลาหน่วงตอนเปิดผลตารางแข่ง',
    randomizeSchedule: 'เปิดเพื่อสุ่มลำดับสายและคู่แข่งในตาราง ปิดเพื่อเรียงตามลำดับเดิม',
    scheduleRevealStyle: 'เลือกรูปแบบ animation ตอนแสดงผลตารางแข่ง',
    generateSchedule: 'สร้างตารางแข่งรอบแบ่งกลุ่มจากผลแบ่งสายที่ยืนยันแล้ว',
    rebalanceSchedule: 'สร้างตารางใหม่อีกครั้งแบบสุ่ม ใช้เมื่ออยากจัดลำดับคู่ใหม่',
    copyScheduleBtn: 'คัดลอกตารางแข่งเป็นข้อความ เพื่อนำไปวางในแชทหรือเอกสาร',
    saveScores: 'บันทึกคะแนนและสถานะของทุกคู่ แล้วคำนวณตารางคะแนนใหม่',
    markAllPending: 'ตั้งสถานะทุกคู่กลับเป็น Pending ใช้เมื่อต้องการเริ่มกรอกผลใหม่',
    copyStandingsBtn: 'คัดลอกตารางคะแนนเป็นข้อความ',
    enableThird: 'เปิด/ปิดการสร้างรอบชิงอันดับ 3 ในสาย Knockout',
    enableFinal: 'เปิด/ปิดการสร้างรอบชิงชนะเลิศ',
    generateKnockout: 'สร้างหรือรีเฟรชสาย Knockout จากอันดับในตารางคะแนน',
    copyKnockoutBtn: 'คัดลอกสาย Knockout เป็นข้อความ',
    clearOverrides: 'ล้างการแก้ไขทีมเข้ารอบแบบพิเศษทั้งหมด',
    webhookUrl: 'URL ของ Google Apps Script Web App ที่ใช้รับข้อมูลจากระบบนี้',
    webhookToken: 'รหัสลับที่ใช้ยืนยันกับ Apps Script ควรตั้งให้ตรงกับฝั่ง Google',
    sheetId: 'รหัส Google Sheet ที่ต้องการส่งข้อมูลเข้าไป เว้นว่างได้ถ้า Script สร้างใหม่',
    saveWebhook: 'บันทึก URL, Token และ Sheet ID สำหรับส่งข้อมูลไป Google Sheet',
    testWebhook: 'ส่งข้อมูลทดสอบไปยัง Webhook เพื่อตรวจว่าตั้งค่าถูกหรือไม่',
    sendWebhook: 'ส่งข้อมูลรายการจริงไป Google Sheet ผ่าน Apps Script',
    sourceBg: 'เลือกพื้นหลังของ OBS Source เช่น Dark, Transparent หรือ Green Screen',
    sourceOpacity: 'ปรับความเข้มของพื้นผิวและตารางใน OBS Live Sources ให้อ่านง่ายขึ้นบนภาพกล้อง',
    fontScale: 'ปรับขนาดตัวอักษรโดยรวมของ OBS Source',
    drawAnimationScale: 'ปรับขนาดกราฟิก animation ใน Draw Source',
    sidebarWidth: 'ปรับความกว้างของแถบ Control Center ด้านซ้าย',
    appMaxWidth: 'ปรับความกว้างสูงสุดของหน้าเว็บทั้งหมด',
    drawStageHeight: 'ปรับความสูงของพื้นที่แสดง Draw',
    drawPanelMode: 'เลือกรูปแบบพื้นที่หน้า Draw ว่าปกติ กว้าง หรือเต็มพื้นที่',
    uiDensity: 'เลือกระยะห่างของ UI: Comfortable ดูโปร่ง หรือ Compact ดูแน่นขึ้น',
    saveLayoutSettings: 'บันทึกค่าขนาดและรูปแบบ layout ที่ตั้งไว้',
    resetLayoutSettings: 'คืนค่าขนาด layout กลับเป็นค่าเริ่มต้น',
    saveDisplaySettings: 'บันทึกค่าการแสดงผลของ OBS Source',
    settingsDrawTextBtn: 'เปิดหน้าปรับขนาดตัวอักษรใน Draw และ OBS Draw Source แบบละเอียด',
    drawGroupColumnsRange: 'ปรับจำนวนคอลัมน์ของตารางแบ่งสายบนหน้า Draw',
    settingsGroupColumnsRange: 'ปรับจำนวนคอลัมน์ของตารางแบ่งสายในหน้าตั้งค่า',
    createEmptySchedule: 'สร้างตารางแข่งเปล่าเพื่อกรอกเองทั้งหมด',
    editScheduleRows: 'เปิดโหมดแก้ไขตารางแข่งทีละแถว',
    addScheduleRow: 'เพิ่มคู่แข่งใหม่ในตารางแก้ไข',
    saveScheduleRows: 'บันทึกตารางแข่งที่แก้ไขเอง',
    cancelScheduleEdit: 'ยกเลิกการแก้ไขตารางและกลับไปดูตารางปกติ',
    coreGenerateFromStandings: 'สร้าง Knockout จากอันดับในตารางคะแนนปัจจุบัน',
    coreGenerateResolved: 'สร้าง Knockout จากลำดับที่แก้ไว้ใน Tie Resolver',
    coreSaveKnockoutScores: 'บันทึกผลรอบ Knockout และส่งผู้ชนะไปรอบถัดไป',
    phase55SendDb: 'ส่งข้อมูลทั้งหมดเป็นฐานข้อมูลการแข่งขันเข้า Google Sheet',
    phase55CopyPayload: 'คัดลอก JSON payload ที่จะส่งเข้า Google Sheet เพื่อตรวจหรือ debug',
    phase55CopyScriptUrl: 'คัดลอก path ของไฟล์ Apps Script template ใน repo',
    closeModal: 'ปิดหน้าต่างรายละเอียด Source',
    copyModalUrl: 'คัดลอก URL ของ OBS Source ที่เปิดดูอยู่',
    openModalUrl: 'เปิด preview ของ OBS Source นี้ในแท็บใหม่'
  };

  const COPY_HELP = {
    draw: 'คัดลอกผลแบ่งสายเป็นตารางแนวนอน: หัวตารางอยู่แถวแรก และแต่ละทีมอยู่คนละแถว',
    schedule: 'คัดลอกตารางแข่งเป็นตารางแนวนอน: เวลา, สนาม, สาย, ทีม A และทีม B แยกเป็นคอลัมน์',
    scores: 'คัดลอกผลคะแนนเป็นตารางแนวนอน: แต่ละคู่แยกเป็นคนละแถว',
    standings: 'คัดลอกตารางคะแนนเป็นตารางแนวนอน: แต่ละทีมแยกเป็นคนละแถว',
    knockout: 'คัดลอกสาย Knockout เป็นตารางแนวนอน: แต่ละคู่แยกเป็นคนละแถว',
    caption: 'คัดลอกข้อความแคปชันสำหรับโพสต์ Facebook',
    all: 'คัดลอกทุกตารางแบบแนวนอน โดยแต่ละส่วนมีหัวตารางและข้อมูลแยกเป็นแถว',
    script: 'คัดลอกสคริปต์สำหรับผู้บรรยายหรือพิธีกร'
  };

  const EXCEL_HELP = {
    groups: 'ดาวน์โหลดไฟล์ Excel เฉพาะข้อมูลกลุ่มและรายชื่อทีมแต่ละสาย',
    schedule: 'ดาวน์โหลดไฟล์ Excel ตารางแข่ง พร้อม sheet Knockout Preview สำหรับแก้ต่อ',
    all: 'ดาวน์โหลดไฟล์ Excel รวมข้อมูลกลุ่ม ตารางแข่ง และ Knockout Preview'
  };

  const DATA_HELP = {
    'manual-groups-create': 'สร้างตารางแบ่งสายเปล่าเพื่อกรอกทีมเอง',
    'manual-groups-add-row': 'เพิ่มแถวทีมในทุกสายสำหรับกรอกเพิ่ม',
    'manual-groups-del-row': 'ลบแถวทีมท้ายสุดของทุกสาย',
    'manual-groups-save': 'บันทึกการจัดกลุ่มทีมที่กรอกเอง',
    'manual-groups-cancel': 'ยกเลิกการแก้ไขกลุ่มด้วยมือ',
    'manual-groups-edit': 'แก้ไขผลแบ่งสายด้วยมือ',
    'manual-groups-clear': 'ล้างโหมดจัดกลุ่มเองและกลับไปใช้ผลสุ่ม',
    'core-save-tie': 'บันทึกลำดับทีมที่คะแนนเท่ากันตามที่จัดไว้',
    'core-random-tie': 'สุ่มจับลำดับทีมที่คะแนนเท่ากัน',
    'save-text-size': 'บันทึกขนาดตัวอักษร Draw ที่ปรับไว้',
    'reset-text-size': 'คืนค่าขนาดตัวอักษร Draw เป็นค่าเริ่มต้น',
    'cancel-text-size': 'ยกเลิกการปรับขนาดตัวอักษรและปิดหน้าต่าง',
    'close-text-modal': 'ปิดหน้าต่างตั้งค่าขนาดตัวอักษร'
  };

  const FIELD_HELP = {
    'score-a': 'กรอกคะแนนของทีมฝั่งซ้ายในคู่นี้',
    'score-b': 'กรอกคะแนนของทีมฝั่งขวาในคู่นี้',
    status: 'เลือกสถานะคู่แข่ง เช่น Pending, Live, Finished หรือ Forfeit',
    'schedule-time': 'เวลาแข่งของคู่นี้ เช่น 09:00',
    'schedule-court': 'สนามที่ใช้แข่งคู่นี้',
    'schedule-group': 'สายหรือกลุ่มของคู่นี้ เช่น A',
    'schedule-team-a': 'ชื่อทีมฝั่ง A ของคู่นี้',
    'schedule-team-b': 'ชื่อทีมฝั่ง B ของคู่นี้',
    'schedule-status': 'สถานะของคู่นี้ในตารางแข่ง',
    'manual-team': 'กรอกชื่อทีมในช่องนี้ หรือพิมพ์ BYE ถ้าต้องการช่องว่าง',
    'size-key': 'เลื่อนเพื่อปรับขนาดตัวอักษรส่วนนี้ใน Draw/OBS Source'
  };

  const HEADING_HELP = {
    Dashboard: PANEL_HELP.dashboard,
    'Setup Event': PANEL_HELP.setup,
    Teams: PANEL_HELP.teams,
    Draw: PANEL_HELP.draw,
    Schedule: PANEL_HELP.schedule,
    'Scores & Standings': PANEL_HELP.scores,
    Knockout: PANEL_HELP.knockout,
    'Live Sources': PANEL_HELP.sources,
    Export: PANEL_HELP.export,
    Settings: PANEL_HELP.settings,
    'Draw Control': 'ชุดควบคุมการสุ่มสาย เลือกรูปแบบ วิธีสุ่ม เวลา animation และยืนยันผล',
    'ผลแบ่งสาย / Reveal Feed': 'แสดงผลทีมที่ถูกสุ่มเข้าแต่ละสายและลำดับการเปิดผล',
    'Schedule Reveal Control': 'ตั้งค่าวิธีแสดงและสร้างตารางแข่ง',
    'Match Scores': 'รายการคู่แข่งสำหรับกรอกคะแนนและสถานะ',
    Standings: 'ตารางอันดับที่ระบบคำนวณจากคะแนนและสถานะการแข่งขัน',
    'Qualifier Override': 'พื้นที่สำหรับตรวจหรือแก้ทีมเข้ารอบแบบพิเศษจากหน้างาน',
    'Knockout Builder': 'เครื่องมือสร้างสาย Knockout จากอันดับรอบแบ่งกลุ่ม',
    'Copy Export': 'ปุ่มคัดลอกข้อมูลในรูปแบบข้อความ',
    'Google Sheet Webhook': 'ตั้งค่าการส่งข้อมูลไปยัง Google Sheet ผ่าน Apps Script',
    'Excel Export': 'ดาวน์โหลดข้อมูลเป็นไฟล์ Excel สำหรับใช้งานต่อ',
    'Layout Resize': 'ปรับขนาดส่วนต่าง ๆ ของหน้าจอควบคุม',
    'Source Display': 'ปรับการแสดงผลของ OBS Browser Source',
    'Debug State': 'ข้อมูลภายในของโปรเจกต์ ใช้ตรวจปัญหาหรือส่งให้ทีมพัฒนา'
  };

  const DEFAULT_DRAW_TEXT_SIZES = {
    chip: 13,
    groupLabel: 18,
    groupLetter: 18,
    team: 52,
    meta: 22,
    status: 18,
    sourceTeam: 52,
    sourceMeta: 22,
    groupTitle: 14,
    groupTeam: 14
  };
  const LEGACY_DRAW_TEXT_DEFAULTS = {
    chip: 12,
    groupLabel: 16,
    groupLetter: 30,
    team: 56,
    meta: 14,
    status: 12,
    sourceTeam: 72,
    sourceMeta: 22,
    groupTitle: 14,
    groupTeam: 14
  };

  function readDrawTextPreview() {
    try {
      return JSON.parse(localStorage.getItem(DRAW_TEXT_PREVIEW_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function normalizeDrawTextSizes(values = {}) {
    const looksLegacyDefault = Object.keys(LEGACY_DRAW_TEXT_DEFAULTS).every((key) => Number(values?.[key]) === LEGACY_DRAW_TEXT_DEFAULTS[key]);
    const normalized = looksLegacyDefault ? { ...DEFAULT_DRAW_TEXT_SIZES } : { ...DEFAULT_DRAW_TEXT_SIZES, ...values };
    // OBS Draw Animation Source references Draw Control sizes.
    normalized.sourceTeam = normalized.team;
    normalized.sourceMeta = normalized.meta;
    return normalized;
  }

  function drawTextSizes(settings = state?.settings || {}, includePreview = true) {
    const saved = { ...DEFAULT_DRAW_TEXT_SIZES, ...((settings && settings.drawTextSizes) || {}) };
    const preview = includePreview ? readDrawTextPreview() : null;
    return normalizeDrawTextSizes(preview ? { ...saved, ...preview } : saved);
  }

  function setDrawTextSizeVars(values = drawTextSizes()) {
    const normalized = normalizeDrawTextSizes(values);
    const root = document.documentElement;
    root.style.setProperty('--draw-chip-fs', `${normalized.chip}px`);
    root.style.setProperty('--draw-group-label-fs', `${normalized.groupLabel}px`);
    root.style.setProperty('--draw-group-letter-fs', `${normalized.groupLetter}px`);
    root.style.setProperty('--draw-team-fs', `${normalized.team}px`);
    root.style.setProperty('--draw-meta-fs', `${normalized.meta}px`);
    root.style.setProperty('--draw-status-fs', `${normalized.status}px`);
    root.style.setProperty('--source-team-fs', `${normalized.team}px`);
    root.style.setProperty('--source-meta-fs', `${normalized.meta}px`);
    root.style.setProperty('--group-title-fs', `${normalized.groupTitle}px`);
    root.style.setProperty('--group-team-fs', `${normalized.groupTeam}px`);
  }

  function textSizeVarsStyle(values = drawTextSizes()) {
    const normalized = normalizeDrawTextSizes(values);
    return [
      `--draw-chip-fs:${normalized.chip}px`,
      `--draw-group-label-fs:${normalized.groupLabel}px`,
      `--draw-group-letter-fs:${normalized.groupLetter}px`,
      `--draw-team-fs:${normalized.team}px`,
      `--draw-meta-fs:${normalized.meta}px`,
      `--draw-status-fs:${normalized.status}px`,
      `--source-team-fs:${normalized.team}px`,
      `--source-meta-fs:${normalized.meta}px`,
      `--group-title-fs:${normalized.groupTitle}px`,
      `--group-team-fs:${normalized.groupTeam}px`
    ].join(';');
  }

  function publishDrawTextPreview(values) {
    const normalized = normalizeDrawTextSizes(values);
    try {
      localStorage.setItem(DRAW_TEXT_PREVIEW_KEY, JSON.stringify(normalized));
    } catch {}
    window.dispatchEvent(new CustomEvent('pepslive-draw-text-preview', { detail: normalized }));
  }

  function clearDrawTextPreview() {
    try {
      localStorage.removeItem(DRAW_TEXT_PREVIEW_KEY);
    } catch {}
    window.dispatchEvent(new CustomEvent('pepslive-draw-text-preview-clear'));
  }

  function effectiveGroupColumns(requested, availableWidth = window.innerWidth) {
    const requestedCols = intClamp(requested || state.settings.groupColumns || 4, 1, 10, 4);
    const safeWidth = Math.max(240, Number(availableWidth) || 960);
    const maxByWidth = Math.max(1, Math.floor(safeWidth / 220));
    return Math.max(1, Math.min(requestedCols, maxByWidth));
  }


  const sampleTeamList = [
    'Volcano A', 'Volcano B', 'Sisaket One', 'Sisaket Two',
    'Thunder 3x3', 'Dragon Hoop', 'Peps United', 'Moonlight',
    'Red Phoenix', 'Blue Shark', 'Rocket Team', 'Wild Cats',
    'Storm Rider', 'Black Wolf', 'Golden Lion', 'Sky Runner'
  ];

  let state = loadState();
  let activePanel = 'dashboard';
  let modalSource = null;
  let saveTimer = null;
  let drawTimer = null;
  let drawTickerTimer = null;
  let scheduleTimer = null;
  let manualGroupsEditing = false;
  let manualGroupRows = 0;
  let manualGroupsDraft = null;
  let scheduleEditing = false;
  let scheduleDraft = null;
  let scheduleFilterGroup = 'all';
  let scheduleFilterCourt = 'all';
  let scheduleFilterStatus = 'all';
  let scheduleSearch = '';
  let scoreFilterGroup = 'all';
  let scoreFilterStatus = 'all';
  let scoreSearch = '';
  let groupCapacityDraft = null;
  let stateSyncTimer = null;
  let stateSyncHeartbeat = null;
  let stateSyncInFlight = false;
  let stateSyncQueued = false;
  const MAX_MANUAL_GROUP_ROWS = 64;

  function defaultState() {
    return {
      version: APP_VERSION,
      updatedAt: nowIso(),
      event: {
        name: 'PepsLive Tournament',
        sport: 'Basketball 3x3',
        preset: 'custom',
        groupCount: 4,
        groupSizingMode: 'auto',
        groupCapacities: { A: 4, B: 4, C: 4, D: 4 },
        courtCount: 1,
        startTime: '09:00',
        matchInterval: 15,
        breakEverySlots: 0,
        breakMinutes: 0,
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
        qualifiersPerGroup: 2,
        enableThird: true,
        enableFinal: true
      },
      teams: [],
      groups: {},
      manualGroups: { active: false, rows: 0, updatedAt: '' },
      pendingGroups: null,
      drawHistory: [],
      pendingSequence: [],
      pendingRevealIndex: 0,
      pendingComplete: false,
      drawLive: {
        running: false,
        waiting: false,
        finished: false,
        phase: 'idle',
        current: null,
        pendingItem: null,
        revealEndsAt: 0,
        progress: 0,
        total: 0,
        feed: []
      },
      matches: [],
      manualSchedule: { active: false, updatedAt: '' },
      pendingSchedule: [],
      scheduleLive: { running: false, waiting: false, revealEndsAt: 0, total: 0, style: 'shuffle' },
      standings: {},
      qualifierOverrides: {},
      knockoutUseResolvedOrder: false,
      knockout: [],
      lastResult: null,
      settings: {
        safeLive: true,
        sourceBg: 'transparent',
        sourceOpacity: 0.90,
        fontScale: 1,
        drawAnimation: 'wheel',
        drawAnimationScale: 0.80,
        drawMethod: 'auto-sequence',
        drawDuration: 5,
        randomizeSchedule: true,
        scheduleDuration: 5,
        scheduleRevealStyle: 'shuffle',
        sidebarWidth: 284,
        appMaxWidth: 1280,
        drawStageHeight: 420,
        drawPanelMode: 'normal',
        uiDensity: 'comfortable',
        groupColumns: 4,
        drawTextSizes: { ...DEFAULT_DRAW_TEXT_SIZES }
      },
      webhook: { url: '', token: '', sheetId: '' },
      audit: []
    };
  }

  function stripNestedVersionKeys(value, keepVersion = true) {
    if (Array.isArray(value)) return value.map((item) => stripNestedVersionKeys(item, false));
    if (!value || typeof value !== 'object') return value;
    const cleaned = {};
    Object.entries(value).forEach(([key, item]) => {
      if (key === 'version' && !keepVersion) return;
      cleaned[key] = stripNestedVersionKeys(item, false);
    });
    return cleaned;
  }

  function merge(base, incoming, isRoot = true) {
    if (!incoming || typeof incoming !== 'object') return base;
    const source = isRoot ? stripNestedVersionKeys(incoming, true) : incoming;
    for (const [k, v] of Object.entries(source)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        base[k] = merge(base[k], v, false);
      } else {
        base[k] = v;
      }
    }
    if (isRoot) base.version = APP_VERSION;
    return base;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const loaded = merge(defaultState(), JSON.parse(raw));
      const serialized = JSON.stringify(loaded);
      if (serialized !== raw) localStorage.setItem(STORAGE_KEY, serialized);
      return loaded;
    } catch (err) {
      console.warn('loadState failed', err);
      return defaultState();
    }
  }

  function saveState(note = 'save', render = true) {
    state.updatedAt = nowIso();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSavePill();
    applyLayoutSettings();
    if (render) renderAll(false);
    queueStateSync();
    if (note) console.debug('[PepsLive] saved', note);
  }

  function canSyncState() {
    return location.protocol === 'http:' || location.protocol === 'https:';
  }

  function queueStateSync() {
    if (!canSyncState()) return;
    stateSyncQueued = true;
    clearTimeout(stateSyncTimer);
    stateSyncTimer = setTimeout(syncStateToLocalServer, 60);
  }

  async function syncStateToLocalServer() {
    if (!canSyncState()) return;
    if (stateSyncInFlight) return;
    if (!stateSyncQueued) return;
    stateSyncQueued = false;
    stateSyncInFlight = true;
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      });
    } catch {}
    stateSyncInFlight = false;
    if (stateSyncQueued) queueStateSync();
  }

  function startStateSync() {
    if (!canSyncState() || stateSyncHeartbeat) return;
    queueStateSync();
    stateSyncHeartbeat = setInterval(queueStateSync, 3000);
  }

  function scheduleSave(note) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveState(note), 180);
  }

  function audit(action, data = {}) {
    state.audit.unshift({ at: nowIso(), action, data });
    state.audit = state.audit.slice(0, 100);
  }

  function sourceUrl(id) {
    const normalized = normalizeSourceView(id);
    const base = location.href.split('?')[0].split('#')[0];
    return `${base}?view=${encodeURIComponent(normalized)}`;
  }

  function normalizeSourceView(view) {
    if (DRAW_SOURCE_ALIASES.includes(view)) return DRAW_SOURCE_ID;
    return view || '';
  }

  function letters(count) {
    const n = intClamp(count, 1, 26, 4);
    return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  }

  function isCustomGroupSizing(event = state.event) {
    return event?.groupSizingMode === 'custom';
  }

  function groupCapacities(count = state.event.groupCount, source = state.event.groupCapacities) {
    return Object.fromEntries(letters(count).map(group => [group, intClamp(source?.[group], 1, 64, 4)]));
  }

  function groupCapacityTotal(capacities) {
    return Object.values(capacities || {}).reduce((total, capacity) => total + Number(capacity || 0), 0);
  }

  function readGroupCapacityDraftFromForm() {
    const container = $('#groupCapacityFields');
    if (!container) return groupCapacityDraft || groupCapacities();
    const next = { ...(groupCapacityDraft || state.event.groupCapacities || {}) };
    container.querySelectorAll('[data-group-capacity]').forEach(input => {
      next[input.dataset.groupCapacity] = input.value;
    });
    groupCapacityDraft = next;
    return next;
  }

  function renderGroupCapacitySetup(useSavedCapacities = false) {
    const field = $('#groupCapacityField');
    const container = $('#groupCapacityFields');
    const summary = $('#groupCapacitySummary');
    if (!field || !container || !summary) return;

    const mode = $('#groupSizingMode')?.value || state.event.groupSizingMode || 'auto';
    const custom = mode === 'custom';
    const capacities = useSavedCapacities
      ? { ...(state.event.groupCapacities || {}) }
      : readGroupCapacityDraftFromForm();
    groupCapacityDraft = { ...capacities };
    field.hidden = !custom;
    if (!custom) {
      container.innerHTML = '';
      summary.textContent = '';
      return;
    }

    const count = intClamp($('#groupCount')?.value, 1, 26, state.event.groupCount || 4);
    const activeCapacities = groupCapacities(count, capacities);
    container.innerHTML = Object.entries(activeCapacities).map(([group, capacity]) => `
      <div class="field"><label for="groupCapacity${group}">สาย ${group}</label><input id="groupCapacity${group}" data-group-capacity="${group}" type="number" min="1" max="64" step="1" value="${capacity}" /></div>
    `).join('');
    groupCapacityDraft = { ...capacities, ...activeCapacities };
    updateGroupCapacitySummary();
  }

  function updateGroupCapacitySummary() {
    const summary = $('#groupCapacitySummary');
    const container = $('#groupCapacityFields');
    if (!summary || !container || $('#groupSizingMode')?.value !== 'custom') return;
    const values = Array.from(container.querySelectorAll('[data-group-capacity]')).map(input => Number(input.value));
    if (values.some(value => !Number.isInteger(value) || value < 1 || value > 64)) {
      summary.textContent = 'กำหนดจำนวนเต็ม 1–64 ทีมในทุกสาย';
      return;
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    const teamCount = (state.teams || []).length;
    const difference = total - teamCount;
    let rosterSummary = `รวม ${total} ที่นั่ง · ยังไม่มีรายชื่อทีม`;
    if (teamCount) {
      rosterSummary = difference === 0
        ? `รวม ${total} ที่นั่ง ตรงกับรายชื่อ ${teamCount} ทีม`
        : difference > 0
          ? `รวม ${total} ที่นั่ง มากกว่ารายชื่อ ${teamCount} ทีมอยู่ ${difference} ทีม`
          : `รวม ${total} ที่นั่ง น้อยกว่ารายชื่อ ${teamCount} ทีมอยู่ ${Math.abs(difference)} ทีม`;
    }
    const quota = Number($('#qualifiersPerGroup')?.value);
    const quotaHint = values.some(value => value < quota)
      ? ` · ลดโควตาเข้ารอบเหลือไม่เกิน ${Math.min(...values)} ทีมก่อนสร้าง Knockout`
      : '';
    summary.textContent = `${rosterSummary} · กำหนดได้สายละ 1–64 ทีม${quotaHint}`;
  }

  function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function parseTeams(text) {
    return String(text || '').split(/\r?\n/).map(t => t.trim()).filter(Boolean);
  }

  function normalizeName(v) {
    return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function uniqueTeams(list) {
    const seen = new Set();
    const out = [];
    for (const team of list) {
      const key = normalizeName(team);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(team);
    }
    return out;
  }

  function isRealTeamName(team) {
    const value = String(team || '').trim();
    return !!value && value.toUpperCase() !== 'BYE';
  }

  function groupKeys(groups = state.groups) {
    const base = letters(state.event.groupCount || 4);
    const extra = Object.keys(groups || {}).filter(Boolean);
    return uniqueTeams([...base, ...extra]).sort();
  }

  function manualRowsForGroups(groups = state.groups) {
    const keys = groupKeys(groups);
    const existingRows = keys.reduce((max, g) => Math.max(max, Array.isArray(groups?.[g]) ? groups[g].length : 0), 0);
    const teamRows = Math.ceil(Math.max(1, state.teams.length) / Math.max(1, keys.length));
    return Math.max(2, Number(state.manualGroups?.rows) || 0, manualGroupRows || 0, existingRows, teamRows);
  }

  function emptyGroups(rowCount = manualRowsForGroups({})) {
    const rows = Math.max(1, Number(rowCount) || 2);
    return Object.fromEntries(letters(state.event.groupCount || 4).map(g => [
      g,
      Array.from({ length: isCustomGroupSizing() ? (groupCapacities()[g] || 4) : rows }, () => '')
    ]));
  }

  function normalizeManualGroups(groups, rowCount = manualRowsForGroups(groups)) {
    const rows = Math.max(1, Number(rowCount) || 2);
    const normalized = {};
    groupKeys(groups).forEach(g => {
      const source = Array.isArray(groups?.[g]) ? groups[g] : [];
      const groupRows = isCustomGroupSizing() ? (groupCapacities()[g] || 4) : rows;
      normalized[g] = Array.from({ length: groupRows }, (_, i) => String(source[i] || '').trim());
    });
    return normalized;
  }

  function makeManualGroupsDraft(groups = getDisplayGroups(false), rows = manualRowsForGroups(groups)) {
    const rowCount = Math.max(1, Math.min(MAX_MANUAL_GROUP_ROWS, Number(rows) || 2));
    return { groups: normalizeManualGroups(groups, rowCount), rows: rowCount };
  }

  function ensureManualGroupsDraft(groups = getDisplayGroups(false)) {
    if (!manualGroupsDraft) {
      manualGroupsDraft = makeManualGroupsDraft(groups);
      manualGroupRows = manualGroupsDraft.rows;
    }
    return manualGroupsDraft;
  }

  function readManualGroupsDraftFromEditor() {
    const cards = Array.from(document.querySelectorAll('[data-manual-group-row]'));
    if (!cards.length) return manualGroupsDraft;
    const groups = {};
    let maxSlot = 0;
    cards.forEach(card => {
      const group = card.dataset.manualGroupRow;
      if (!group) return;
      groups[group] = [];
      card.querySelectorAll('[data-manual-team]').forEach(input => {
        const slot = Math.max(0, Number(input.dataset.manualSlot || 1) - 1);
        maxSlot = Math.max(maxSlot, slot + 1);
        groups[group][slot] = String(input.value || '').trim();
      });
    });
    const rows = Math.max(1, maxSlot || manualGroupsDraft?.rows || 1);
    manualGroupsDraft = makeManualGroupsDraft(groups, rows);
    manualGroupRows = manualGroupsDraft.rows;
    return manualGroupsDraft;
  }

  function setManualGroupRowCount(nextRows) {
    const draft = readManualGroupsDraftFromEditor() || ensureManualGroupsDraft();
    const rows = Math.max(1, Math.min(MAX_MANUAL_GROUP_ROWS, Number(nextRows) || draft.rows || 1));
    manualGroupsDraft = makeManualGroupsDraft(draft.groups, rows);
    manualGroupRows = manualGroupsDraft.rows;
    renderGroups();
  }

  function groupsToFeed(groups) {
    const feed = [];
    Object.keys(groups || {}).sort().forEach(group => {
      (groups[group] || []).forEach((team, i) => {
        const cleanTeam = String(team || '').trim();
        if (!cleanTeam) return;
        feed.unshift({ group, slot: i + 1, team: cleanTeam, manual: true });
      });
    });
    return feed.slice(0, 20);
  }

  function syncTeamsFromGroups(groups) {
    const fromGroups = Object.values(groups || {}).flat().filter(isRealTeamName).map(t => String(t).trim());
    if (!fromGroups.length) return;
    state.teams = uniqueTeams([...(state.teams || []), ...fromGroups]);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function init() {
    injectCoreCss();

    const params = new URLSearchParams(location.search);
    const view = normalizeSourceView(params.get('view') || '');
    if (view && view !== 'control') {
      renderSource(view);
      return;
    }

    applyLayoutSettings();
    installShellEnhancements();
    buildNav();
    bindEvents();
    installHelpTooltips();
    fillForms();
    renderAll(true);
    startStateSync();
  }

  function buildNav() {
    const nav = $('#nav');
    if (!nav) return;

    const progress = groupStageProgress();
    const panelMap = new Map(PANELS.map((panel, index) => [panel[0], [...panel, index]]));
    nav.innerHTML = NAV_GROUPS.map(([groupTitle, ids]) => `
      <div class="nav-group">
        <div class="nav-group-title">${esc(groupTitle)}</div>
        ${ids.map((id) => {
          const panel = panelMap.get(id);
          if (!panel) return '';
          const [, title, sub, index] = panel;
          return `
            <button class="navbtn ${id === activePanel ? 'active' : ''}" data-panel-target="${esc(id)}" type="button">
              <span class="nav-index">${String(index + 1).padStart(2, '0')}</span>
              <span class="nav-copy"><b>${esc(title)}</b><small>${esc(sub)}</small></span>
              <span class="nav-state ${panelDone(id, progress) ? 'done' : ''}" aria-hidden="true"></span>
            </button>
          `;
        }).join('')}
      </div>
    `).join('');

    $$('[data-panel-target]', nav).forEach(btn => {
      on(btn, 'click', () => showPanel(btn.dataset.panelTarget));
    });
  }

  function refreshNavState() {
    const progress = groupStageProgress();
    $$('#nav [data-panel-target]').forEach((button) => {
      const id = button.dataset.panelTarget;
      button.classList.toggle('active', id === activePanel);
      button.querySelector('.nav-state')?.classList.toggle('done', panelDone(id, progress));
    });
  }

  function installShellEnhancements() {
    if (window.__PEPSLIVE_SHELL_ENHANCED__) return;
    window.__PEPSLIVE_SHELL_ENHANCED__ = true;

    const topbar = $('.topbar');
    if (topbar && !$('#mobileMenuButton')) {
      const menu = document.createElement('button');
      menu.id = 'mobileMenuButton';
      menu.className = 'iconbtn mobile-menu-trigger';
      menu.type = 'button';
      menu.setAttribute('aria-label', 'เปิดเมนูหลัก');
      menu.setAttribute('aria-expanded', 'false');
      menu.textContent = '☰';
      topbar.prepend(menu);
    }

    const sidebar = $('.sidebar');
    if (sidebar && !$('#sidebarClose')) {
      const head = document.createElement('div');
      head.className = 'sidebar-mobile-head';
      head.innerHTML = '<b>เมนูหลัก</b><button class="iconbtn" id="sidebarClose" type="button" aria-label="ปิดเมนู">×</button>';
      sidebar.prepend(head);
    }

    if (!$('#sidebarBackdrop')) {
      const backdrop = document.createElement('button');
      backdrop.id = 'sidebarBackdrop';
      backdrop.className = 'sidebar-backdrop';
      backdrop.type = 'button';
      backdrop.setAttribute('aria-label', 'ปิดเมนู');
      document.body.appendChild(backdrop);
    }
  }

  function setMobileNav(open) {
    document.body.classList.toggle('nav-open', !!open);
    $('#mobileMenuButton')?.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function installHelpTooltips() {
    if (window.__PEPSLIVE_HELP_TOOLTIP_INSTALLED__) return;
    window.__PEPSLIVE_HELP_TOOLTIP_INSTALLED__ = true;

    const tip = document.createElement('div');
    tip.id = 'pepsHelpTooltip';
    tip.className = 'peps-help-tooltip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);

    let activeEl = null;
    let activeText = '';
    let showTimer = null;
    let pendingEvent = null;

    const show = (el, event) => {
      const text = helpTextForElement(el);
      if (!text) return;
      activeEl = el;
      activeText = text;
      tip.innerHTML = `<b>คำอธิบาย</b><span>${esc(text)}</span>`;
      tip.classList.add('open');
      positionHelpTooltip(tip, event);
    };
    const queueShow = (el, event, delay = 460) => {
      clearTimeout(showTimer);
      pendingEvent = event;
      showTimer = setTimeout(() => show(el, pendingEvent), delay);
    };
    const hide = () => {
      clearTimeout(showTimer);
      activeEl = null;
      activeText = '';
      pendingEvent = null;
      tip.classList.remove('open');
    };

    document.addEventListener('pointerover', (event) => {
      const el = helpTargetFrom(event.target);
      if (!el || el === activeEl) return;
      queueShow(el, event);
    }, true);
    document.addEventListener('pointermove', (event) => {
      pendingEvent = event;
      if (activeText) positionHelpTooltip(tip, event);
    }, true);
    document.addEventListener('pointerout', (event) => {
      if (!activeEl) return;
      if (event.relatedTarget && activeEl.contains(event.relatedTarget)) return;
      hide();
    }, true);
    document.addEventListener('focusin', (event) => {
      const el = helpTargetFrom(event.target);
      if (el) queueShow(el, event, 180);
    }, true);
    document.addEventListener('focusout', hide, true);
  }

  function positionHelpTooltip(tip, event) {
    const pad = 14;
    const x = event?.clientX ?? (window.innerWidth / 2);
    const y = event?.clientY ?? 80;
    const rect = tip.getBoundingClientRect();
    let left = x + 14;
    let top = y + 16;
    if (left + rect.width + pad > window.innerWidth) left = Math.max(pad, x - rect.width - 14);
    if (top + rect.height + pad > window.innerHeight) top = Math.max(pad, y - rect.height - 14);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function helpTargetFrom(target) {
    if (!target || target === document || target === window) return null;
    return target.closest?.([
      '[data-help]',
      '[data-panel-target]',
      '[data-copy]',
      '[data-excel-export]',
      '[data-open-source]',
      '[data-copy-source]',
      '[data-preview-source]',
      '[data-manual-groups-create]',
      '[data-manual-groups-add-row]',
      '[data-manual-groups-del-row]',
      '[data-manual-groups-save]',
      '[data-manual-groups-cancel]',
      '[data-manual-groups-edit]',
      '[data-manual-groups-clear]',
      '[data-core-save-tie]',
      '[data-core-random-tie]',
      '[data-save-text-size]',
      '[data-reset-text-size]',
      '[data-cancel-text-size]',
      '[data-close-text-modal]',
      '[data-score-a]',
      '[data-score-b]',
      '[data-status]',
      '[data-schedule-time]',
      '[data-schedule-court]',
      '[data-schedule-group]',
      '[data-schedule-team-a]',
      '[data-schedule-team-b]',
      '[data-schedule-status]',
      '[data-manual-team]',
      '[data-size-key]',
      'button',
      'input',
      'select',
      'textarea',
      'label',
      '.navbtn',
      '.step',
      '.pill',
      '.source-card',
      '.score-row',
      '.manual-group-card',
      '.knockout-preview-card',
      '.phase6-tie',
      '.pre6-match',
      '.field',
      'h2',
      'h3'
    ].join(','));
  }

  function helpTextForElement(el) {
    if (!el) return '';
    if (el.dataset?.help) return el.dataset.help;
    if (el.id && ID_HELP[el.id]) return ID_HELP[el.id];
    if (el.dataset?.panelTarget) return PANEL_HELP[el.dataset.panelTarget] || '';
    if (el.dataset?.copy) return COPY_HELP[el.dataset.copy] || '';
    if (el.dataset?.excelExport) return EXCEL_HELP[el.dataset.excelExport] || '';
    if (el.dataset?.openSource) return `ดูรายละเอียดของ OBS Source: ${sourceTitle(el.dataset.openSource)} พร้อม URL สำหรับนำไปใช้`;
    if (el.dataset?.copySource) return `คัดลอก URL ของ ${sourceTitle(el.dataset.copySource)} เพื่อนำไปวางใน OBS Browser Source`;
    if (el.dataset?.previewSource) return `เปิดหน้าตัวอย่างของ ${sourceTitle(el.dataset.previewSource)} เพื่อตรวจภาพก่อนใช้งานจริง`;

    for (const [key, text] of Object.entries(DATA_HELP)) {
      const attr = `data-${key}`;
      if (el.hasAttribute?.(attr)) return text;
    }
    for (const [key, text] of Object.entries(FIELD_HELP)) {
      const attr = `data-${key}`;
      if (el.hasAttribute?.(attr)) return text;
    }

    if (el.classList?.contains('core-ko-score-a')) return 'กรอกคะแนนทีมฝั่งซ้ายของคู่ Knockout นี้';
    if (el.classList?.contains('core-ko-score-b')) return 'กรอกคะแนนทีมฝั่งขวาของคู่ Knockout นี้';
    if (el.classList?.contains('core-ko-winner')) return 'เลือกผู้ชนะของคู่ Knockout ถ้าคะแนนไม่ชัดหรือมีการตัดสินพิเศษ';
    if (el.classList?.contains('phase6-tie-order')) return 'จัดลำดับทีมที่คะแนนเท่ากัน บรรทัดบนสุดคืออันดับที่สูงกว่า';

    if (el.matches?.('label.file-btn')) return 'เลือกไฟล์ JSON ที่เคย Save ไว้เพื่อโหลดโปรเจกต์กลับมา';
    if (el.matches?.('.field')) {
      const control = el.querySelector('input,select,textarea');
      return control ? helpTextForElement(control) : '';
    }
    if (el.matches?.('label')) {
      const control = el.querySelector('input,select,textarea') || el.closest('.field')?.querySelector('input,select,textarea');
      if (control) return helpTextForElement(control);
    }
    if (el.matches?.('input,select,textarea')) {
      const dataHelp = dataFieldHelp(el);
      if (dataHelp) return dataHelp;
      const label = el.closest('.field')?.querySelector('label')?.textContent?.trim();
      return label ? `ช่อง "${label}" ใช้กรอกหรือเลือกค่าที่ระบบจะนำไปคำนวณและแสดงผล` : '';
    }
    if (el.matches?.('h2,h3')) {
      const text = cleanHeading(el.textContent);
      if (HEADING_HELP[text]) return HEADING_HELP[text];
      if (/^สาย\s+/i.test(text)) return 'หัวข้อตารางของสายนั้น ๆ ใช้ดูรายชื่อทีม อันดับ หรือข้อมูลที่เกี่ยวกับกลุ่มนี้';
      if (/^Group\s+/i.test(text)) return 'หัวข้อกลุ่มในไฟล์หรือ preview ใช้ดูข้อมูลของกลุ่มนั้นโดยเฉพาะ';
      return text ? `หัวข้อ "${text}" ใช้บอกว่าส่วนนี้เกี่ยวกับข้อมูลหรือคำสั่งชุดใด` : '';
    }
    if (el.matches?.('.step')) return 'ขั้นตอนใน workflow ถ้าขึ้นสถานะเสร็จ แปลว่าข้อมูลส่วนนั้นพร้อมใช้งานต่อ';
    if (el.matches?.('.source-card')) return 'การ์ด OBS Source ใช้คัดลอก URL, เปิด preview หรือดูรายละเอียดของ source นี้';
    if (el.matches?.('.score-row')) return 'แถวกรอกผลของคู่แข่งหนึ่งคู่ ใส่คะแนนและสถานะแล้วกดบันทึกคะแนน';
    if (el.matches?.('.manual-group-card')) return 'กล่องนี้แทนหนึ่งสาย กรอกชื่อทีมตามลำดับที่ต้องการ';
    if (el.matches?.('.knockout-preview-card')) return 'แบบจำลองคู่รอบ Knockout ที่ใช้ seed เช่น ที่ 1 สาย A เจอที่ 2 สาย B เพื่อเตรียมไฟล์งานล่วงหน้า';
    if (el.matches?.('.phase6-tie')) return 'กล่องแก้กรณีทีมคะแนนเท่ากัน ใช้จัดลำดับก่อนสร้าง Knockout';
    if (el.matches?.('.pre6-match')) return 'แถวกรอกผลรอบ Knockout เพื่อส่งผู้ชนะไปยังรอบถัดไป';

    const text = cleanHeading(el.textContent);
    if (text && HEADING_HELP[text]) return HEADING_HELP[text];
    if (text) return buttonTextHelp(text);
    return '';
  }

  function dataFieldHelp(el) {
    if (el.hasAttribute?.('data-score-a')) return FIELD_HELP['score-a'];
    if (el.hasAttribute?.('data-score-b')) return FIELD_HELP['score-b'];
    if (el.hasAttribute?.('data-status')) return FIELD_HELP.status;
    if (el.hasAttribute?.('data-schedule-time')) return FIELD_HELP['schedule-time'];
    if (el.hasAttribute?.('data-schedule-court')) return FIELD_HELP['schedule-court'];
    if (el.hasAttribute?.('data-schedule-group')) return FIELD_HELP['schedule-group'];
    if (el.hasAttribute?.('data-schedule-team-a')) return FIELD_HELP['schedule-team-a'];
    if (el.hasAttribute?.('data-schedule-team-b')) return FIELD_HELP['schedule-team-b'];
    if (el.hasAttribute?.('data-schedule-status')) return FIELD_HELP['schedule-status'];
    if (el.hasAttribute?.('data-manual-team')) return FIELD_HELP['manual-team'];
    if (el.hasAttribute?.('data-size-key')) return FIELD_HELP['size-key'];
    return '';
  }

  function buttonTextHelp(text) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const map = {
      'Save Order': 'บันทึกลำดับทีมที่จัดไว้ในกรณีคะแนนเท่ากัน',
      'Draw Lots': 'สุ่มลำดับทีมที่คะแนนเท่ากัน',
      'Generate from Standings': ID_HELP.coreGenerateFromStandings,
      'Generate from Resolved Order': ID_HELP.coreGenerateResolved,
      'Save Knockout Scores': ID_HELP.coreSaveKnockoutScores,
      'Copy Teams': 'คัดลอกรายชื่อทีมทั้งหมดเป็นข้อความ',
      'Clear Teams': 'ล้างช่องรายชื่อทีม เพื่อเตรียมกรอกใหม่',
      'ESC / ปิด': 'ปิดหน้าต่าง Draw ที่ขยายอยู่ กดปุ่ม ESC ได้เช่นกัน',
      '×': 'ปิดหน้าต่างนี้'
    };
    return map[normalized] || '';
  }

  function sourceTitle(id) {
    return SOURCE_META[normalizeSourceView(id)]?.title || id || 'Source';
  }

  function cleanHeading(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function refreshHelpAttributes() {
    $$('button,input,select,textarea,label,.navbtn,.step,.pill,.source-card,.score-row,.manual-group-card,.knockout-preview-card,.phase6-tie,.pre6-match,.field,h2,h3').forEach((el) => {
      const help = helpTextForElement(el);
      if (!help) return;
      el.dataset.pepsHelpReady = '1';
      if (!el.getAttribute('aria-label') && el.matches('button,input,select,textarea')) {
        const label = el.textContent?.trim() || el.closest('.field')?.querySelector('label')?.textContent?.trim();
        if (label) el.setAttribute('aria-label', label);
      }
    });
  }

  function bindEvents() {
    window.addEventListener('peps:remote-info', () => {
      if (activePanel === 'sources') renderSourceCards();
    });
    on($('#mobileMenuButton'), 'click', () => setMobileNav(!document.body.classList.contains('nav-open')));
    on($('#sidebarClose'), 'click', () => setMobileNav(false));
    on($('#sidebarBackdrop'), 'click', () => setMobileNav(false));
    on($('#goNext'), 'click', () => showPanel(nextPanel()));
    on($('#btnSaveProject'), 'click', downloadJson);
    on($('#loadProjectInput'), 'change', loadJsonFile);
    on($('#safeLiveToggle'), 'change', e => {
      state.settings.safeLive = !!e.target.checked;
      saveState('safe-live');
    });

    on($('#preset'), 'change', applyPreset);
    on($('#groupCount'), 'change', renderGroupCapacitySetup);
    on($('#groupSizingMode'), 'change', renderGroupCapacitySetup);
    on($('#groupCapacityFields'), 'input', updateGroupCapacitySummary);
    on($('#qualifiersPerGroup'), 'input', updateGroupCapacitySummary);
    on($('#saveSetup'), 'click', saveSetupFromForm);
    on($('#resetAll'), 'click', resetAll);

    on($('#saveTeams'), 'click', saveTeamsFromText);
    on($('#dedupeTeams'), 'click', dedupeTeams);
    on($('#sampleTeams'), 'click', sampleTeams);

    on($('#drawAnimation'), 'change', e => {
      state.settings.drawAnimation = e.target.value;
      saveState('draw-animation');
      window.dispatchEvent(new CustomEvent("peps:draw-style-changed", { detail: { style: e.target.value } }));
    });
    on($('#drawMethod'), 'change', e => {
      state.settings.drawMethod = e.target.value;
      saveState('draw-method');
    });
    on($('#drawDuration'), 'input', e => {
      state.settings.drawDuration = intClamp(e.target.value, 1, 20, 5);
      setText($('#drawDurationValue'), state.settings.drawDuration);
      scheduleSave('draw-duration');
    });
    on($('#startDraw'), 'click', startDraw);
    on($('#nextReveal'), 'click', () => nextReveal());
    on($('#confirmDraw'), 'click', confirmDraw);
    on($('#redraw'), 'click', resetPreparedDraw);
    on($('#undoDraw'), 'click', undoDraw);
    on($('#toggleDrawExpand'), 'click', toggleDrawExpand);

    on($('#generateSchedule'), 'click', generateSchedule);
    on($('#rebalanceSchedule'), 'click', generateSchedule);
    on($('#copyScheduleBtn'), 'click', () => copyKind('schedule'));
    on($('#scheduleDuration'), 'input', e => {
      state.settings.scheduleDuration = intClamp(e.target.value, 1, 15, 5);
      setText($('#scheduleDurationValue'), state.settings.scheduleDuration);
      scheduleSave('schedule-duration');
    });
    on($('#randomizeSchedule'), 'change', e => {
      state.settings.randomizeSchedule = !!e.target.checked;
      saveState('randomize-schedule');
    });
    on($('#scheduleRevealStyle'), 'change', e => {
      state.settings.scheduleRevealStyle = e.target.value;
      saveState('schedule-style');
    });

    on($('#saveScores'), 'click', readScores);
    on($('#markAllPending'), 'click', () => {
      state.matches.forEach(m => { m.status = 'Pending'; });
      audit('mark-all-pending');
      saveState('mark-all-pending');
    });
    on($('#copyStandingsBtn'), 'click', () => copyKind('standings'));

    on($('#enableThird'), 'change', e => {
      state.event.enableThird = !!e.target.checked;
      saveState('enable-third');
    });
    on($('#enableFinal'), 'change', e => {
      state.event.enableFinal = !!e.target.checked;
      saveState('enable-final');
    });
    on($('#knockoutUseResolvedOrder'), 'change', e => {
      state.knockoutUseResolvedOrder = e.target.checked;
      saveState('knockout-seed-order');
    });
    on($('#generateKnockout'), 'click', () => generateKnockout());
    on($('#copyKnockoutBtn'), 'click', () => copyKind('knockout'));
    on($('#clearOverrides'), 'click', () => {
      state.qualifierOverrides = {};
      saveState('clear-overrides');
    });

    $$('[data-copy]').forEach(btn => on(btn, 'click', () => copyKind(btn.dataset.copy)));

    on($('#saveWebhook'), 'click', saveWebhookFromForm);
    on($('#testWebhook'), 'click', () => sendWebhook(true));
    on($('#sendWebhook'), 'click', () => sendWebhook(false));

    on($('#sourceBg'), 'change', e => {
      state.settings.sourceBg = e.target.value;
      saveState('source-bg');
    });
    on($('#sourceOpacity'), 'input', e => {
      state.settings.sourceOpacity = Number(e.target.value || 0.90);
      setText($('#sourceOpacityValue'), `${Math.round(state.settings.sourceOpacity * 100)}%`);
      scheduleSave('source-opacity');
    });
    on($('#fontScale'), 'input', e => {
      state.settings.fontScale = Number(e.target.value || 1);
      scheduleSave('font-scale');
    });
    on($('#drawAnimationScale'), 'input', e => {
      state.settings.drawAnimationScale = Number(e.target.value || 0.85);
      setText($('#drawAnimationScaleValue'), state.settings.drawAnimationScale.toFixed(2));
      document.documentElement.style.setProperty('--draw-fx-scale', state.settings.drawAnimationScale);
      scheduleSave('draw-animation-scale');
    });
    on($('#sidebarWidth'), 'input', e => updateRangeSetting('sidebarWidth', e.target.value, 220, 430, 'sidebarWidthValue'));
    on($('#appMaxWidth'), 'input', e => updateRangeSetting('appMaxWidth', e.target.value, 1100, 1900, 'appMaxWidthValue'));
    on($('#drawStageHeight'), 'input', e => updateRangeSetting('drawStageHeight', e.target.value, 300, 760, 'drawStageHeightValue'));
    on($('#drawPanelMode'), 'change', e => {
      state.settings.drawPanelMode = e.target.value;
      applyLayoutSettings();
      saveState('draw-panel-mode');
    });
    on($('#uiDensity'), 'change', e => {
      state.settings.uiDensity = e.target.value;
      applyLayoutSettings();
      saveState('ui-density');
    });
    on($('#saveLayoutSettings'), 'click', () => saveState('layout'));
    on($('#resetLayoutSettings'), 'click', resetLayoutSettings);
    on($('#saveDisplaySettings'), 'click', () => saveState('display'));

    on($('#closeModal'), 'click', () => $('#sourceModal')?.classList.remove('open'));
    on($('#copyModalUrl'), 'click', () => modalSource && copyText(sourceUrl(modalSource), 'คัดลอก URL แล้ว'));
    on($('#openModalUrl'), 'click', () => modalSource && window.open(sourceUrl(modalSource), '_blank'));

    document.addEventListener('click', (e) => {
      const dashboardTarget = e.target.closest('[data-dashboard-target]');
      if (dashboardTarget) showPanel(dashboardTarget.dataset.dashboardTarget);
      const sourceBtn = e.target.closest('[data-open-source]');
      if (sourceBtn) openSourceModal(sourceBtn.dataset.openSource);
      const copyBtn = e.target.closest('[data-copy-source]');
      if (copyBtn) copyText(sourceUrl(copyBtn.dataset.copySource), 'คัดลอก URL แล้ว');
      const previewBtn = e.target.closest('[data-preview-source]');
      if (previewBtn) window.open(sourceUrl(previewBtn.dataset.previewSource), '_blank');
      const excelBtn = e.target.closest('[data-excel-export]');
      if (excelBtn) exportExcelWorkbook(excelBtn.dataset.excelExport);
    }, true);

    document.addEventListener('change', (e) => {
      if (e.target.matches('[data-schedule-filter-group]')) {
        scheduleFilterGroup = e.target.value;
        applyScheduleFilters();
      }
      if (e.target.matches('[data-schedule-filter-court]')) {
        scheduleFilterCourt = e.target.value;
        applyScheduleFilters();
      }
      if (e.target.matches('[data-schedule-filter-status]')) {
        scheduleFilterStatus = e.target.value;
        applyScheduleFilters();
      }
      if (e.target.matches('[data-score-filter-group]')) {
        scoreFilterGroup = e.target.value;
        applyScoreFilters();
      }
      if (e.target.matches('[data-score-filter-status]')) {
        scoreFilterStatus = e.target.value;
        applyScoreFilters();
      }
      if (e.target.matches('#scoresBox [data-status]')) {
        e.target.closest('.score-row')?.classList.remove('invalid');
        applyScoreFilters();
      }
    }, true);

    document.addEventListener('input', (e) => {
      if (e.target.matches('[data-schedule-search]')) {
        scheduleSearch = e.target.value;
        applyScheduleFilters();
      }
      if (e.target.matches('[data-score-search]')) {
        scoreSearch = e.target.value;
        applyScoreFilters();
      }
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      closeDrawOverlay();
      setMobileNav(false);
    });
  }

  function showPanel(id) {
    if (!PANELS.some(([pid]) => pid === id)) id = 'dashboard';
    activePanel = id;
    $$('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === id));
    $$('.navbtn').forEach(b => b.classList.toggle('active', b.dataset.panelTarget === id));
    setMobileNav(false);
    renderAll(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextPanel() {
    const i = PANELS.findIndex(([id]) => id === activePanel);
    return PANELS[(i + 1) % PANELS.length][0];
  }

  function fillForms() {
    setValue($('#eventName'), state.event.name);
    setValue($('#sportType'), state.event.sport);
    setValue($('#preset'), state.event.preset);
    setValue($('#groupCount'), state.event.groupCount);
    setValue($('#groupSizingMode'), state.event.groupSizingMode || 'auto');
    groupCapacityDraft = { ...(state.event.groupCapacities || {}) };
    renderGroupCapacitySetup(true);
    setValue($('#courtCount'), state.event.courtCount);
    setValue($('#startTime'), state.event.startTime);
    setValue($('#matchInterval'), state.event.matchInterval);
    setValue($('#breakEverySlots'), state.event.breakEverySlots);
    setValue($('#breakMinutes'), state.event.breakMinutes);
    setValue($('#pointsWin'), state.event.pointsWin);
    setValue($('#pointsDraw'), state.event.pointsDraw);
    setValue($('#pointsLoss'), state.event.pointsLoss);
    setValue($('#qualifiersPerGroup'), state.event.qualifiersPerGroup);
    updateGroupCapacitySummary();
    setValue($('#teamText'), state.teams.join('\n'));
    setChecked($('#safeLiveToggle'), state.settings.safeLive);
    setValue($('#drawAnimation'), state.settings.drawAnimation);
    setValue($('#drawMethod'), state.settings.drawMethod);
    setValue($('#drawDuration'), state.settings.drawDuration);
    setText($('#drawDurationValue'), state.settings.drawDuration);
    setValue($('#scheduleDuration'), state.settings.scheduleDuration);
    setText($('#scheduleDurationValue'), state.settings.scheduleDuration);
    setChecked($('#randomizeSchedule'), state.settings.randomizeSchedule !== false);
    setValue($('#scheduleRevealStyle'), state.settings.scheduleRevealStyle);
    setChecked($('#enableThird'), state.event.enableThird);
    setChecked($('#enableFinal'), state.event.enableFinal !== false);
    setChecked($('#knockoutUseResolvedOrder'), state.knockoutUseResolvedOrder);
    setValue($('#webhookUrl'), state.webhook.url);
    setValue($('#webhookToken'), state.webhook.token);
    setValue($('#sheetId'), state.webhook.sheetId);
    setValue($('#sourceBg'), state.settings.sourceBg);
    setValue($('#sourceOpacity'), state.settings.sourceOpacity ?? 0.90);
    setText($('#sourceOpacityValue'), `${Math.round((state.settings.sourceOpacity ?? 0.90) * 100)}%`);
    setValue($('#fontScale'), state.settings.fontScale);
    setValue($('#drawAnimationScale'), state.settings.drawAnimationScale || 0.85);
    setText($('#drawAnimationScaleValue'), (state.settings.drawAnimationScale || 0.85).toFixed(2));
    document.documentElement.style.setProperty('--draw-fx-scale', state.settings.drawAnimationScale || 0.85);
    setValue($('#sidebarWidth'), state.settings.sidebarWidth);
    setText($('#sidebarWidthValue'), state.settings.sidebarWidth);
    setValue($('#appMaxWidth'), state.settings.appMaxWidth);
    setText($('#appMaxWidthValue'), state.settings.appMaxWidth);
    setValue($('#drawStageHeight'), state.settings.drawStageHeight);
    setText($('#drawStageHeightValue'), state.settings.drawStageHeight);
    setValue($('#drawPanelMode'), state.settings.drawPanelMode);
    setValue($('#uiDensity'), state.settings.uiDensity);
    applyLayoutSettings();
  }

  function setValue(el, v) { if (el) el.value = v ?? ''; }
  function setText(el, v) { if (el) el.textContent = String(v ?? ''); }
  function setChecked(el, v) { if (el) el.checked = !!v; }

  function setSavePill() {
    const pill = $('#autosavePill');
    if (pill) pill.textContent = 'Auto Save: ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const sheet = $('#sheetPill');
    if (sheet) sheet.textContent = state.webhook.url ? 'Google Sheet: Ready' : 'Google Sheet: Not set';
  }

  function saveSetupFromForm() {
    if (window.pepsActionGuard && !window.pepsActionGuard('saveSetup', 1000)) return;
    const groupCount = Number($('#groupCount')?.value);
    if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > 26) {
      toast('จำนวนสายต้องเป็นจำนวนเต็ม 1–26 สาย', 'warn');
      return;
    }
    const groupSizingMode = $('#groupSizingMode')?.value === 'custom' ? 'custom' : 'auto';
    const capacityDraft = readGroupCapacityDraftFromForm();
    const nextCapacities = {};
    if (groupSizingMode === 'custom') {
      for (const group of letters(groupCount)) {
        const value = Number(capacityDraft[group]);
        if (!Number.isInteger(value) || value < 1 || value > 64) {
          toast(`กรุณากำหนดจำนวนทีมสาย ${group} เป็นจำนวนเต็ม 1–64 ทีม`, 'warn');
          return;
        }
        nextCapacities[group] = value;
      }
    } else {
      Object.assign(nextCapacities, groupCapacities(groupCount, capacityDraft));
    }

    const previousMode = isCustomGroupSizing() ? 'custom' : 'auto';
    const previousCapacities = groupCapacities(state.event.groupCount, state.event.groupCapacities);
    const capacityChanged = groupSizingMode === 'custom' && letters(groupCount).some(group => nextCapacities[group] !== previousCapacities[group]);
    const groupSetupChanged = groupCount !== intClamp(state.event.groupCount, 1, 26, 4)
      || groupSizingMode !== previousMode
      || capacityChanged;
    if (groupSetupChanged && hasTournamentDerivedData()) {
      if (!confirm('การเปลี่ยนจำนวนสายหรือจำนวนทีมต่อสายจะล้างผลจับสาย ตาราง คะแนน และ Knockout ที่มีอยู่ ต้องการดำเนินการต่อหรือไม่?')) {
        fillForms();
        return;
      }
      resetTournamentDerivedData();
    }

    state.event.name = $('#eventName')?.value.trim() || 'PepsLive Tournament';
    state.event.sport = $('#sportType')?.value || 'Custom';
    state.event.preset = $('#preset')?.value || 'custom';
    state.event.groupCount = groupCount;
    state.event.groupSizingMode = groupSizingMode;
    state.event.groupCapacities = nextCapacities;
    groupCapacityDraft = { ...nextCapacities };
    state.event.courtCount = intClamp($('#courtCount')?.value, 1, 16, 1);
    state.event.startTime = $('#startTime')?.value || '09:00';
    state.event.matchInterval = intClamp($('#matchInterval')?.value, 1, 240, 15);
    state.event.breakEverySlots = intClamp($('#breakEverySlots')?.value, 0, 1000, 0);
    state.event.breakMinutes = intClamp($('#breakMinutes')?.value, 0, 240, 0);
    state.event.pointsWin = Number($('#pointsWin')?.value || 3);
    state.event.pointsDraw = Number($('#pointsDraw')?.value || 1);
    state.event.pointsLoss = Number($('#pointsLoss')?.value || 0);
    state.event.qualifiersPerGroup = intClamp($('#qualifiersPerGroup')?.value, 1, 8, 2);
    audit('save-setup', state.event);
    saveState('setup');
    toast('บันทึก Setup แล้ว', 'good');
  }

  function hasTournamentDerivedData() {
    return hasGroups(state.groups)
      || hasGroups(state.pendingGroups)
      || !!state.manualGroups?.active
      || (state.pendingSequence || []).length > 0
      || (state.matches || []).length > 0
      || Object.keys(state.standings || {}).length > 0
      || (state.knockout || []).length > 0;
  }

  function resetMatchDerivedData() {
    clearTimeout(scheduleTimer);
    scheduleEditing = false;
    scheduleDraft = null;
    state.matches = [];
    state.manualSchedule = { active: false, updatedAt: '' };
    state.pendingSchedule = [];
    state.scheduleLive = { running: false, waiting: false, revealEndsAt: 0, total: 0, style: state.settings.scheduleRevealStyle || 'shuffle' };
    state.standings = {};
    state.qualifierOverrides = {};
    state.knockout = [];
    state.lastResult = null;
  }

  function applyPreset() {
    const p = $('#preset')?.value || 'custom';
    if (p === 'basket3x3') {
      setValue($('#sportType'), 'Basketball 3x3');
      setValue($('#groupCount'), 4);
      setValue($('#matchInterval'), 12);
      setValue($('#pointsWin'), 1);
      setValue($('#pointsDraw'), 0);
      setValue($('#pointsLoss'), 0);
    } else if (p === 'football') {
      setValue($('#sportType'), 'Football');
      setValue($('#groupCount'), 4);
      setValue($('#matchInterval'), 20);
      setValue($('#pointsWin'), 3);
      setValue($('#pointsDraw'), 1);
      setValue($('#pointsLoss'), 0);
    } else if (p === 'esport') {
      setValue($('#sportType'), 'Esport');
      setValue($('#groupCount'), 4);
      setValue($('#matchInterval'), 30);
      setValue($('#pointsWin'), 3);
      setValue($('#pointsDraw'), 0);
      setValue($('#pointsLoss'), 0);
    }
    renderGroupCapacitySetup();
  }

  function saveTeamsFromText() {
    if (window.pepsActionGuard && !window.pepsActionGuard('saveTeams', 1000)) return;
    const nextTeams = uniqueTeams(parseTeams($('#teamText')?.value || ''));
    const sameTeams = nextTeams.length === state.teams.length
      && nextTeams.every((team, index) => String(team).trim() === String(state.teams[index]).trim());
    if (sameTeams) {
      setValue($('#teamText'), state.teams.join('\n'));
      toast('รายชื่อทีมไม่เปลี่ยนแปลง เก็บข้อมูลการแข่งขันเดิมไว้แล้ว', 'good');
      return;
    }
    if (hasTournamentDerivedData() && !confirm('การเปลี่ยนรายชื่อทีมจะล้างผลจับสาย ตาราง คะแนน และ Knockout ที่มีอยู่ ต้องการดำเนินการต่อหรือไม่?')) {
      setValue($('#teamText'), state.teams.join('\n'));
      return;
    }
    state.teams = nextTeams;
    resetTournamentDerivedData();
    audit('save-teams', { count: state.teams.length });
    saveState('teams');
    toast('บันทึกรายชื่อทีมแล้ว', 'good');
  }

  function resetTournamentDerivedData() {
    clearDrawTimers();
    clearTimeout(scheduleTimer);
    state.groups = {};
    state.manualGroups = { active: false, rows: 0, updatedAt: '' };
    state.pendingGroups = null;
    state.pendingSequence = [];
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.drawLive = {
      running: false,
      waiting: false,
      finished: false,
      phase: 'idle',
      current: null,
      pendingItem: null,
      revealEndsAt: 0,
      progress: 0,
      total: 0,
      feed: []
    };
    resetMatchDerivedData();
    state.lastResult = null;
  }

  function dedupeTeams() {
    const result = uniqueTeams(parseTeams($('#teamText')?.value || ''));
    setValue($('#teamText'), result.join('\n'));
    saveTeamsFromText();
  }

  function sampleTeams() {
    setValue($('#teamText'), sampleTeamList.join('\n'));
    saveTeamsFromText();
  }

  function teamValidation() {
    const teams = state.teams || [];
    const seen = new Map();
    const dup = [];
    for (const t of teams) {
      const k = normalizeName(t);
      if (seen.has(k)) dup.push(t);
      seen.set(k, true);
    }
    const groupCount = intClamp(state.event.groupCount, 1, 26, 4);
    const custom = isCustomGroupSizing();
    const capacities = groupCapacities(groupCount);
    const slots = custom ? groupCapacityTotal(capacities) : Math.ceil(Math.max(teams.length, 1) / groupCount) * groupCount;
    const reserved = teams.filter(team => String(team).trim().toUpperCase() === 'BYE');
    const capacityMatchesRoster = !custom || teams.length === slots;
    return {
      teams,
      dup,
      reserved,
      groupCount,
      slots,
      capacities,
      byes: custom ? 0 : Math.max(0, slots - teams.length),
      capacityMatchesRoster,
      ok: teams.length > 0 && dup.length === 0 && reserved.length === 0 && capacityMatchesRoster
    };
  }

  function buildDrawPlan() {
    const v = teamValidation();
    if (!v.ok) return null;
    const groupKeys = letters(v.groupCount);
    const shuffled = shuffle(state.teams);
    const groups = Object.fromEntries(groupKeys.map(g => [g, []]));
    if (isCustomGroupSizing()) {
      let nextTeam = 0;
      groupKeys.forEach(group => {
        groups[group] = shuffled.slice(nextTeam, nextTeam + v.capacities[group]);
        nextTeam += v.capacities[group];
      });
    } else {
      while (shuffled.length < v.slots) shuffled.push('BYE');
      shuffled.forEach((team, idx) => {
        const group = groupKeys[idx % groupKeys.length];
        groups[group].push(team);
      });
    }

    const items = [];
    groupKeys.forEach(g => {
      groups[g].forEach((team, i) => items.push({
        order: items.length + 1,
        group: g,
        slot: i + 1,
        team,
        text: `สาย ${g} · ลำดับ ${i + 1} · ${team}`
      }));
    });

    return { groups, sequence: shuffle(items), byes: v.byes };
  }

  function startDraw(options = {}) {
    const source = options?.source === 'remote' ? 'remote' : 'control';
    if (window.pepsActionGuard && !window.pepsActionGuard('startDraw', 1000)) return false;
    if (state.drawLive?.waiting) {
      toast('กำลังเล่นอนิเมชั่นอยู่ รอก่อน', 'warn');
      return false;
    }

    const plan = buildDrawPlan();
    if (!plan) {
      const validation = teamValidation();
      const message = !validation.teams.length
        ? 'กรุณาบันทึกรายชื่อทีมก่อนสุ่ม'
        : validation.dup.length
          ? `พบชื่อทีมซ้ำ: ${validation.dup.join(', ')}`
          : validation.reserved.length
            ? 'ชื่อทีม BYE สงวนไว้สำหรับระบบ กรุณาเปลี่ยนชื่อทีม'
            : `จำนวนทีม ${validation.teams.length} ทีมไม่ตรงกับจำนวนที่กำหนด ${validation.slots} ที่นั่ง`;
      toast(message, 'warn');
      if (!validation.teams.length || validation.dup.length || validation.reserved.length) showPanel('teams');
      else showPanel('setup');
      return false;
    }

    state.pendingGroups = deepClone(plan.groups);
    state.manualGroups = { active: false, rows: 0, updatedAt: '' };
    state.pendingSequence = deepClone(plan.sequence);
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.drawLive = {
      running: false,
      waiting: false,
      finished: false,
      phase: 'prepared',
      current: null,
      pendingItem: null,
      revealEndsAt: 0,
      progress: 0,
      total: plan.sequence.length,
      feed: []
    };
    audit('prepare-draw', { total: plan.sequence.length, byes: plan.byes, method: state.settings.drawMethod, source });
    saveState('draw-prepared', false);

    if (state.settings.drawMethod === 'instant-all') {
      revealAllAtOnce();
    } else {
      nextReveal();
    }
    return true;
  }

  function nextReveal() {
    if (state.drawLive?.waiting) {
      toast('กำลังเล่นอนิเมชั่นอยู่ รอก่อน', 'warn');
      return;
    }
    if (!state.pendingSequence?.length) {
      toast('ยังไม่มีผลสุ่มที่เตรียมไว้', 'warn');
      return;
    }
    if (state.pendingRevealIndex >= state.pendingSequence.length) {
      completeDrawSequence();
      return;
    }

    const item = state.pendingSequence[state.pendingRevealIndex];
    beginDrawSuspense(item);
  }

  function beginDrawSuspense(item) {
    clearDrawTimers();
    const duration = intClamp(state.settings.drawDuration, 1, 20, 5) * 1000;

    state.drawLive.waiting = true;
    state.drawLive.running = true;
    state.drawLive.phase = 'suspense';
    state.drawLive.pendingItem = deepClone(item);
    state.drawLive.current = null;
    state.drawLive.revealEndsAt = Date.now() + duration;
    state.drawLive.progress = state.pendingRevealIndex;
    state.drawLive.total = state.pendingSequence.length;

    saveState('draw-suspense', false);
    renderAll(false);
    startDrawTicker();

    drawTimer = setTimeout(() => {
      state.pendingRevealIndex += 1;
      revealDrawItem(item);
      const finished = state.pendingRevealIndex >= state.pendingSequence.length;
      if (finished) completeDrawSequence(false);
      saveState('draw-reveal');
      if (!finished && state.settings.drawMethod === 'auto-sequence') {
        setTimeout(() => nextReveal(), 280);
      }
    }, duration);
  }

  function revealAllAtOnce() {
    clearDrawTimers();
    const duration = intClamp(state.settings.drawDuration, 1, 20, 5) * 1000;
    state.drawLive.waiting = true;
    state.drawLive.running = true;
    state.drawLive.phase = 'bulk-suspense';
    state.drawLive.pendingItem = { group: 'ALL', slot: '-', team: `${state.pendingSequence.length} Teams` };
    state.drawLive.revealEndsAt = Date.now() + duration;
    state.drawLive.progress = 0;
    state.drawLive.total = state.pendingSequence.length;
    saveState('draw-bulk-suspense', false);
    renderAll(false);
    startDrawTicker();

    drawTimer = setTimeout(() => {
      state.pendingRevealIndex = state.pendingSequence.length;
      state.pendingComplete = true;
      state.drawLive.waiting = false;
      state.drawLive.running = false;
      state.drawLive.phase = 'bulk-revealed';
      state.drawLive.current = deepClone(state.pendingSequence[state.pendingSequence.length - 1] || null);
      state.drawLive.pendingItem = null;
      state.drawLive.progress = state.pendingSequence.length;
      state.drawLive.feed = [...state.pendingSequence].reverse().slice(0, 20);
      state.lastResult = { type: 'draw-reveal-all', text: `สุ่มครบทั้งหมด ${state.pendingSequence.length} รายการแล้ว`, at: nowIso() };
      saveState('draw-reveal-all');
      clearDrawTimers(false);
    }, duration);
  }

  function revealDrawItem(item) {
    state.drawLive.waiting = false;
    state.drawLive.running = false;
    state.drawLive.phase = 'revealed';
    state.drawLive.current = deepClone(item);
    state.drawLive.pendingItem = null;
    state.drawLive.progress = state.pendingRevealIndex;
    state.drawLive.total = state.pendingSequence.length;
    state.drawLive.feed.unshift({ ...item, progress: state.pendingRevealIndex, total: state.pendingSequence.length });
    state.drawLive.feed = state.drawLive.feed.slice(0, 20);
    state.lastResult = { type: 'draw-reveal', text: item.text, at: nowIso() };
    audit('draw-reveal', item);
    clearDrawTimers(false);
  }

  function completeDrawSequence(save = true) {
    state.pendingComplete = true;
    state.drawLive.running = false;
    state.drawLive.waiting = false;
    state.drawLive.finished = true;
    state.drawLive.phase = 'complete';
    clearDrawTimers(false);
    if (save) saveState('draw-complete');
  }

  function confirmDraw() {
    if (window.pepsActionGuard && !window.pepsActionGuard('confirmDraw', 1000)) return;
    if (!state.pendingGroups) {
      toast('ยังไม่มีผลสุ่มให้ยืนยัน', 'warn');
      return;
    }
    if (state.drawLive?.waiting) {
      toast('รอให้ผลออกก่อนค่อย Confirm', 'warn');
      return;
    }
    if (!state.pendingComplete) {
      toast('ต้องเปิดผลให้ครบทุกทีมก่อนยืนยันผลแบ่งสาย', 'warn');
      return;
    }
    const nextGroups = deepClone(state.pendingGroups);
    const groupsChanged = !groupsEqual(state.groups, nextGroups);
    const hasMatchesToClear = (state.matches || []).length > 0 || (state.knockout || []).length > 0;
    if (groupsChanged && hasMatchesToClear && !confirm('ผลแบ่งสายใหม่ไม่ตรงกับชุดที่ยืนยันไว้ ตาราง คะแนน และ Knockout เดิมจะถูกล้าง ต้องการยืนยันผลใหม่หรือไม่?')) return;
    if (groupsChanged) resetMatchDerivedData();
    state.groups = nextGroups;
    state.manualGroups = { active: false, rows: 0, updatedAt: '' };
    state.pendingGroups = null;
    state.pendingComplete = true;
    state.drawHistory.unshift({ at: nowIso(), groups: deepClone(state.groups), teams: deepClone(state.teams) });
    state.drawHistory = state.drawHistory.slice(0, 20);
    state.lastResult = { type: 'draw-confirm', text: 'ยืนยันผลแบ่งสายแล้ว', at: nowIso() };
    audit('confirm-draw', { groups: Object.keys(state.groups).length });
    saveState('confirm-draw');
    toast('Confirm ผลแบ่งสายแล้ว', 'good');
  }

  function resetPreparedDraw() {
    clearDrawTimers();
    state.pendingGroups = null;
    state.pendingSequence = [];
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.drawLive = defaultState().drawLive;
    saveState('reset-draw');
  }

  function undoDraw() {
    const prev = state.drawHistory[0];
    if (!prev) {
      toast('ไม่มีประวัติให้ Undo', 'warn');
      return;
    }
    const previousTeams = (prev.teams || []).map(team => String(team).trim()).sort();
    const currentTeams = (state.teams || []).map(team => String(team).trim()).sort();
    if (JSON.stringify(previousTeams) !== JSON.stringify(currentTeams)) {
      toast('Undo ไม่ได้ เพราะรายชื่อทีมเปลี่ยนจากตอนบันทึกประวัตินี้แล้ว', 'warn');
      return;
    }
    const previousGroups = prev.groups || {};
    const expectedGroups = letters(state.event.groupCount);
    const extraGroup = Object.keys(previousGroups).find(group => !expectedGroups.includes(group) && (previousGroups[group] || []).some(isRealTeamName));
    if (extraGroup) {
      toast('Undo ไม่ได้ เพราะจำนวนสายในประวัติไม่ตรงกับ Setup ปัจจุบัน', 'warn');
      return;
    }
    if (expectedGroups.some(group => !Array.isArray(previousGroups[group]))) {
      toast('Undo ไม่ได้ เพราะจำนวนสายในประวัติไม่ตรงกับ Setup ปัจจุบัน', 'warn');
      return;
    }
    if (isCustomGroupSizing()) {
      const capacities = groupCapacities();
      const mismatch = expectedGroups.find(group => (previousGroups[group] || []).filter(isRealTeamName).length !== capacities[group]);
      if (mismatch) {
        toast(`Undo ไม่ได้ เพราะจำนวนทีมสาย ${mismatch} ในประวัติไม่ตรงกับ Setup ปัจจุบัน`, 'warn');
        return;
      }
    }
    const groupsChanged = !groupsEqual(state.groups, previousGroups);
    if (groupsChanged && ((state.matches || []).length || (state.knockout || []).length)
      && !confirm('Undo จะเปลี่ยนผลแบ่งสายและล้างตาราง คะแนน และ Knockout เดิม ต้องการดำเนินการต่อหรือไม่?')) return;
    state.drawHistory.shift();
    if (groupsChanged) resetMatchDerivedData();
    clearDrawTimers();
    state.pendingGroups = null;
    state.pendingSequence = [];
    state.pendingRevealIndex = 0;
    state.pendingComplete = false;
    state.drawLive = defaultState().drawLive;
    state.groups = deepClone(previousGroups);
    state.manualGroups = { active: false, rows: 0, updatedAt: '' };
    saveState('undo-draw');
  }

  function clearDrawTimers(clearMain = true) {
    if (clearMain && drawTimer) {
      clearTimeout(drawTimer);
      drawTimer = null;
    }
    if (drawTickerTimer) {
      clearInterval(drawTickerTimer);
      drawTickerTimer = null;
    }
  }

  function startDrawTicker() {
    if (drawTickerTimer) clearInterval(drawTickerTimer);
    drawTickerTimer = setInterval(() => {
      if (!state.drawLive?.waiting) {
        clearDrawTimers(false);
        return;
      }
      renderDrawStage();
    }, 95);
  }

  function tickerItem() {
    const teams = state.teams.length ? state.teams : ['READY'];
    const groups = letters(state.event.groupCount);
    const live = state.drawLive || {};
    const totalMs = Math.max(1000, intClamp(state.settings.drawDuration, 1, 20, 5) * 1000);
    const left = live.revealEndsAt ? Math.max(0, live.revealEndsAt - Date.now()) : totalMs;
    const progress = 1 - Math.min(1, left / totalMs);
    const interval = 32 + Math.round(progress * progress * 260);
    const tick = Math.floor(Date.now() / interval);
    const group = groups[(tick * 3) % groups.length];
    const slotCount = isCustomGroupSizing() ? (groupCapacities()[group] || 1) : Math.max(1, Math.ceil(teams.length / groups.length));
    return {
      team: teams[tick % teams.length],
      group,
      slot: ((tick * 5) % slotCount) + 1
    };
  }

  function generateSchedule() {
    if (window.pepsActionGuard && !window.pepsActionGuard('generateSchedule', 1000)) return;
    const groups = getDisplayGroups(true);
    if (!hasGroups(groups)) {
      toast('ต้อง Confirm ผลแบ่งสายก่อนสร้างตาราง', 'warn');
      return;
    }

    const matches = [];
    const previousMatches = state.matches || [];
    const preservedMatches = new Set();
    groupFixtures(groups).forEach(({ group, teamA, teamB }) => {
      const nextMatch = {
        id: `G${group}-${Date.now()}-${matches.length}`,
        group, teamA, teamB, scoreA: '', scoreB: '', status: 'Pending', court: '', time: ''
      };
      const previous = findExistingGroupMatch(group, teamA, teamB, preservedMatches);
      if (previous) preservedMatches.add(previous);
      matches.push(previous ? preserveGroupMatchResult(previous, nextMatch) : nextMatch);
    });

    const droppedResults = previousMatches.filter(match => hasSavedMatchResult(match) && !preservedMatches.has(match));
    if (droppedResults.length && !confirm(`ตารางใหม่นี้ไม่มีคู่เดิมที่มีผลบันทึก ${droppedResults.length} คู่ คะแนนของคู่นั้นจะถูกล้าง ต้องการดำเนินการต่อหรือไม่?`)) return;

    const start = parseTime(state.event.startTime || '09:00');
    const interval = intClamp(state.event.matchInterval, 1, 240, 15);
    const courtCount = intClamp(state.event.courtCount, 1, 16, 1);
    const breakEvery = intClamp(state.event.breakEverySlots, 0, 1000, 0);
    const breakMinutes = intClamp(state.event.breakMinutes, 0, 240, 0);
    const candidates = state.settings.randomizeSchedule ? shuffle(matches) : matches;
    const slots = arrangeMatchesForRest(candidates, courtCount, Boolean(state.settings.randomizeSchedule));
    slots.forEach((slotMatches, slotIndex) => {
      const completedBreaks = breakEvery > 0 ? Math.floor(slotIndex / breakEvery) : 0;
      const time = timeFromMinutes(start + (slotIndex * interval) + (completedBreaks * breakMinutes));
      slotMatches.forEach((m, courtIndex) => {
        m.court = courtIndex + 1;
        m.time = time;
      });
    });

    const ordered = slots.flat();

    state.matches = ordered;
    state.manualSchedule = { active: false, updatedAt: '' };
    scheduleEditing = false;
    scheduleDraft = null;
    state.lastResult = { type: 'schedule', text: `สร้างตาราง ${ordered.length} คู่แล้ว`, at: nowIso() };
    audit('generate-schedule', { count: ordered.length });
    calculateStandings();
    saveState('generate-schedule');
  }

  function arrangeMatchesForRest(matches, courtCount, preferRest = true) {
    const remaining = [...matches];
    const slots = [];
    let previousSlotTeams = new Set();

    while (remaining.length) {
      const currentSlotTeams = new Set();
      const slotMatches = [];
      while (slotMatches.length < courtCount && remaining.length) {
        const canJoinSlot = match => !currentSlotTeams.has(normalizeName(match.teamA)) && !currentSlotTeams.has(normalizeName(match.teamB));
        let index = preferRest
          ? remaining.findIndex(match => canJoinSlot(match) && !previousSlotTeams.has(normalizeName(match.teamA)) && !previousSlotTeams.has(normalizeName(match.teamB)))
          : -1;
        if (index < 0) index = remaining.findIndex(canJoinSlot);
        if (index < 0) break;

        const [match] = remaining.splice(index, 1);
        slotMatches.push(match);
        currentSlotTeams.add(normalizeName(match.teamA));
        currentSlotTeams.add(normalizeName(match.teamB));
      }

      slots.push(slotMatches);
      previousSlotTeams = currentSlotTeams;
    }

    return slots;
  }

  function groupMatchKey(group, teamA, teamB) {
    return JSON.stringify([group, ...[teamA, teamB].sort()]);
  }

  function findExistingGroupMatch(group, teamA, teamB, alreadyPreserved = new Set()) {
    const key = groupMatchKey(group, teamA, teamB);
    const matches = (state.matches || []).filter(match => !alreadyPreserved.has(match)
      && groupMatchKey(match.group, match.teamA, match.teamB) === key);
    return matches.find(hasSavedMatchResult) || matches[0] || null;
  }

  function hasSavedMatchResult(match) {
    const status = String(match?.status || '').toLowerCase();
    return (match?.scoreA !== '' && match?.scoreA != null)
      || (match?.scoreB !== '' && match?.scoreB != null)
      || ['done', 'finished', 'bye', 'forfeit a', 'forfeit b'].includes(status);
  }

  function preserveGroupMatchResult(previous, nextMatch) {
    const sameOrientation = normalizeName(previous.teamA) === normalizeName(nextMatch.teamA);
    const previousStatus = String(previous.status || 'Pending');
    let status = previousStatus;
    if (!sameOrientation && previousStatus.toLowerCase() === 'forfeit a') status = 'Forfeit B';
    else if (!sameOrientation && previousStatus.toLowerCase() === 'forfeit b') status = 'Forfeit A';
    return {
      ...previous,
      ...nextMatch,
      id: previous.id || nextMatch.id,
      status,
      scoreA: sameOrientation ? previous.scoreA : previous.scoreB,
      scoreB: sameOrientation ? previous.scoreB : previous.scoreA
    };
  }

  function parseTime(t) {
    const [h, m] = String(t || '09:00').split(':').map(x => Number(x) || 0);
    return h * 60 + m;
  }

  function timeFromMinutes(total) {
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function readScores() {
    const invalid = [];
    const nextMatches = state.matches.map(m => {
      const row = $(`[data-match-id="${cssEscape(m.id)}"]`);
      if (!row) return m;
      const scoreA = row.querySelector('[data-score-a]')?.value.trim() ?? String(m.scoreA ?? '').trim();
      const scoreB = row.querySelector('[data-score-b]')?.value.trim() ?? String(m.scoreB ?? '').trim();
      const status = row.querySelector('[data-status]')?.value ?? m.status;
      const next = {
        ...m,
        scoreA,
        scoreB,
        status
      };
      row.classList.remove('invalid');
      if (!matchResultIsValid(next)) {
        row.classList.add('invalid');
        invalid.push(`${m.teamA} vs ${m.teamB}`);
      }
      return next;
    });

    if (invalid.length) {
      toast(`ยังบันทึกไม่ได้: คู่ที่ Finished ต้องมีคะแนนครบทั้งสองทีม (${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '…' : ''})`, 'warn');
      return;
    }

    state.matches = nextMatches;
    calculateStandings();
    audit('save-scores', { count: state.matches.length });
    saveState('scores');
    toast('บันทึกคะแนนและคำนวณอันดับแล้ว', 'good');
  }

  function cssEscape(v) {
    if (window.CSS && CSS.escape) return CSS.escape(v);
    return String(v).replace(/["\\]/g, '\\$&');
  }

  function calculateStandings(progress = groupStageProgress()) {
    const groups = getDisplayGroups(true);
    const table = Object.create(null);
    Object.keys(groups).forEach(g => {
      table[g] = Object.create(null);
      (groups[g] || []).filter(isRealTeamName).forEach(team => {
        table[g][team] = { team, group: g, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, PTS: 0 };
      });
    });

    for (const m of progress.resolvedMatches) {
      const groupTable = table[m.group];
      if (!groupTable) continue;
      const a = groupTable[m.teamA];
      const b = groupTable[m.teamB];
      if (!a || !b) continue;
      const status = String(m.status || '').toLowerCase();
      if (!['done', 'finished', 'bye', 'forfeit a', 'forfeit b'].includes(status)) continue;

      if (status === 'forfeit a') {
        a.P += 1;
        b.P += 1;
        applyWinLoss(b, a, 2, 0);
      } else if (status === 'forfeit b') {
        a.P += 1;
        b.P += 1;
        applyWinLoss(a, b, 2, 0);
      } else {
        const sa = scoreNumber(m.scoreA);
        const sb = scoreNumber(m.scoreB);
        if (sa == null || sb == null) continue;
        a.P += 1;
        b.P += 1;
        a.GF += sa; a.GA += sb;
        b.GF += sb; b.GA += sa;
        if (sa > sb) { a.W += 1; b.L += 1; a.PTS += Number(state.event.pointsWin); b.PTS += Number(state.event.pointsLoss); }
        else if (sb > sa) { b.W += 1; a.L += 1; b.PTS += Number(state.event.pointsWin); a.PTS += Number(state.event.pointsLoss); }
        else { a.D += 1; b.D += 1; a.PTS += Number(state.event.pointsDraw); b.PTS += Number(state.event.pointsDraw); }
      }
    }

    Object.values(table).forEach(groupTable => {
      Object.values(groupTable).forEach(r => { r.GD = r.GF - r.GA; });
    });
    state.standings = table;
    return table;
  }

  function scoreNumber(value) {
    if (value == null || (typeof value !== 'number' && (typeof value !== 'string' || !value.trim()))) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function matchResultIsValid(match) {
    const status = String(match?.status || '').toLowerCase();
    if (!['done', 'finished'].includes(status)) return true;
    return scoreNumber(match?.scoreA) != null && scoreNumber(match?.scoreB) != null;
  }

  function isRealGroupMatch(match) {
    return isRealTeamName(match?.teamA) && isRealTeamName(match?.teamB);
  }

  function isResolvedGroupMatch(match) {
    const status = String(match?.status || '').toLowerCase();
    if (['forfeit a', 'forfeit b'].includes(status)) return true;
    return ['done', 'finished'].includes(status) && matchResultIsValid(match);
  }

  function groupFixtures(groups) {
    const fixtures = [];
    for (const group of Object.keys(groups).sort()) {
      const teams = [...new Set((groups[group] || []).filter(isRealTeamName))];
      for (let i = 0; i < teams.length; i += 1) {
        for (let j = i + 1; j < teams.length; j += 1) {
          fixtures.push({ group, teamA: teams[i], teamB: teams[j] });
        }
      }
    }
    return fixtures;
  }

  function groupStageProgress() {
    const groups = getDisplayGroups(true);
    const roster = Object.values(groups).flat().filter(isRealTeamName);
    const duplicateTeams = uniqueTeams(roster).length !== roster.length;
    const expected = new Map(groupFixtures(groups).map(match => [
      groupMatchKey(match.group, match.teamA, match.teamB), match.group
    ]));
    const rows = new Map();
    let invalid = 0;
    for (const match of state.matches || []) {
      if (!match) continue;
      if ([match.teamA, match.teamB].some(team => normalizeName(team) === 'bye')) continue;
      if (!normalizeName(match.teamA) && !normalizeName(match.teamB)) continue;
      const key = groupMatchKey(match.group, match.teamA, match.teamB);
      if (!expected.has(key)) {
        invalid += 1;
        continue;
      }
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(match);
    }

    const resolvedMatches = [];
    const incompleteGroups = new Set();
    let duplicates = 0;
    for (const [key, group] of expected) {
      const matches = rows.get(key) || [];
      if (matches.length > 1) duplicates += matches.length - 1;
      if (matches.length === 1 && isResolvedGroupMatch(matches[0])) resolvedMatches.push(matches[0]);
      else incompleteGroups.add(group);
    }
    const missing = expected.size - rows.size;
    const scheduleReady = roster.length > 0 && !duplicateTeams && !invalid && !missing && !duplicates;
    return {
      total: expected.size,
      done: resolvedMatches.length,
      pending: expected.size - resolvedMatches.length,
      missing,
      duplicates,
      invalid,
      duplicateTeams,
      confirmed: roster.length > 0,
      scheduleReady,
      complete: scheduleReady && resolvedMatches.length === expected.size,
      resolvedMatches,
      incompleteGroups
    };
  }

  function groupStageMessage(progress) {
    if (!progress.confirmed) return 'ยืนยันผลแบ่งสายก่อนสร้าง Knockout';
    const details = [`ผลที่บันทึก ${progress.done}/${progress.total} คู่`];
    if (progress.missing) details.push(`ขาดคู่แข่ง ${progress.missing} คู่`);
    if (progress.duplicates) details.push(`คู่ซ้ำ ${progress.duplicates} แถว`);
    if (progress.invalid) details.push(`คู่ผิดผัง ${progress.invalid} แถว`);
    if (progress.duplicateTeams) details.push('มีชื่อทีมซ้ำในผังสาย');
    return details.join(' · ');
  }

  function applyWinLoss(winner, loser, gf, ga) {
    winner.W += 1; loser.L += 1;
    winner.GF += gf; winner.GA += ga;
    loser.GF += ga; loser.GA += gf;
    winner.PTS += Number(state.event.pointsWin);
    loser.PTS += Number(state.event.pointsLoss);
  }

  function sortedStandings(groupTable) {
    return Object.values(groupTable || {}).sort((a, b) =>
      b.PTS - a.PTS ||
      b.GD - a.GD ||
      b.GF - a.GF ||
      b.W - a.W ||
      a.team.localeCompare(b.team, 'th')
    );
  }

  function knockoutSetupIssue() {
    const groups = Object.entries(getDisplayGroups(true))
      .map(([group, teams]) => [group, teams.filter(isRealTeamName).length])
      .filter(([, count]) => count > 0);
    const quota = intClamp(state.event.qualifiersPerGroup, 1, 8, 2);
    const tooSmall = groups.filter(([, count]) => count < quota);
    if (isCustomGroupSizing() && tooSmall.length) {
      return `โควตาเข้ารอบ ${quota} ทีม เกินจำนวนทีมในสาย ${tooSmall.map(([group]) => group).join(', ')} · แก้ได้ที่ Setup`;
    }
    const total = groups.reduce((sum, [, count]) => sum + Math.min(count, quota), 0);
    if (total < 2) return 'ต้องมีทีมเข้ารอบอย่างน้อย 2 ทีม';
    if (total === 2 && state.event.enableFinal === false) return 'เปิดรอบชิงชนะเลิศเพื่อจัดคู่สำหรับผู้เข้ารอบ 2 ทีม';
    return '';
  }

  function standingsEntries(progress = groupStageProgress()) {
    return Object.entries(calculateStandings(progress))
      .sort(([a], [b]) => a.localeCompare(b, 'th'))
      .map(([group, table]) => [group, sortedStandings(table).map((row, i) => ({
        ...row, rank: i + 1, pts: row.PTS
      }))])
      .filter(([, rows]) => rows.length > 0);
  }

  function tieKey({ group, pts, teams }) {
    return `${group}|${pts}|${teams.slice().sort().join(',')}`;
  }

  function orderBySavedTies(group, rows) {
    const points = new Set(rows.map(row => row.pts));
    const ordered = rows.slice();
    for (const pts of points) {
      const tied = rows.filter(row => row.pts === pts);
      if (tied.length < 2) continue;
      const key = tieKey({ group, pts, teams: tied.map(row => row.team) });
      const saved = state.tieResolvers?.[key]?.order;
      if (!Array.isArray(saved)) continue;
      const order = [...new Set(saved)].map(team => tied.find(row => row.team === team)).filter(Boolean);
      order.push(...tied.filter(row => !order.includes(row)));
      const first = ordered.findIndex(row => row.pts === pts);
      ordered.splice(first, tied.length, ...order);
    }
    return ordered;
  }

  function firstKnockoutPairs(seeds, size) {
    // Keep the established four-group crossover and separate each group's two seeds.
    if (seeds.length === 8 && new Set(seeds.map(seed => seed.group)).size === 4 && seeds.every(seed => seed.rank <= 2)) {
      const [a1, b1, c1, d1, a2, b2, c2, d2] = seeds;
      return [[a1, b2], [c1, d2], [b1, a2], [d1, c2]];
    }

    const byeCount = size - seeds.length;
    const byes = seeds.slice(0, byeCount).map(seed => [seed, { seed: 'BYE', label: 'BYE', team: 'BYE' }]);
    const remaining = seeds.slice(byeCount);
    const played = [];
    while (remaining.length) {
      const first = remaining.shift();
      const counts = new Map();
      for (const { group } of remaining) counts.set(group, (counts.get(group) || 0) + 1);
      const pairsLeft = (remaining.length - 1) / 2;
      let bestIndex = remaining.length - 1;
      let bestConflicts = Infinity;
      // Prefer a lower seed while avoiding any same-group match that can still be avoided.
      for (let i = remaining.length - 1; i >= 0; i -= 1) {
        const opponent = remaining[i].group;
        const largestGroup = Math.max(...Array.from(counts, ([group, count]) => count - Number(group === opponent)));
        const conflicts = Number(first.group === opponent) + Math.max(0, largestGroup - pairsLeft);
        if (conflicts < bestConflicts) {
          bestIndex = i;
          bestConflicts = conflicts;
          if (!conflicts) break;
        }
      }
      played.push([first, remaining.splice(bestIndex, 1)[0]]);
    }

    const pairs = [];
    const slots = size / 2;
    for (let i = 0; i < slots; i += 1) {
      // Space BYEs across the bracket, with higher seeds assigned in group order within each rank.
      const before = Math.ceil(i * byeCount / slots);
      const after = Math.ceil((i + 1) * byeCount / slots);
      pairs.push(after > before ? byes[before] : played[i - before]);
    }
    return pairs;
  }

  function buildKnockoutPreviewPlan({ resolved = state.knockoutUseResolvedOrder, progress = groupStageProgress() } = {}) {
    if (knockoutSetupIssue() || progress.duplicateTeams) return [];
    const quota = intClamp(state.event.qualifiersPerGroup, 1, 8, 2);
    const seeds = standingsEntries(progress).flatMap(([group, rows]) => {
      const ranked = resolved ? orderBySavedTies(group, rows) : rows;
      return ranked.slice(0, quota).map((row, index) => ({
        group,
        rank: index + 1,
        seed: `${group}${index + 1}`,
        label: `ที่ ${index + 1} สาย ${group}`,
        team: progress.incompleteGroups.has(group) || progress.invalid ? '' : row.team
      }));
    }).sort((a, b) => a.rank - b.rank || a.group.localeCompare(b.group, 'th'));

    const plan = [];
    const addMatch = (id, round, a, b) => {
      const bye = b.seed === 'BYE';
      const match = {
        id, round, seedA: a.seed, seedB: b.seed, labelA: a.label, labelB: b.label,
        sourceA: a.source || null, sourceB: b.source || null,
        teamA: a.team, teamB: b.team,
        scoreA: '', scoreB: '', winner: bye ? a.team : '', status: bye ? 'Bye' : 'Pending',
        note: bye ? 'BYE · ผ่านรอบอัตโนมัติ' : a.source || b.source ? 'รอผลรอบก่อน' : a.team && b.team ? 'จากอันดับรอบแบ่งกลุ่ม' : 'รอผลรอบแบ่งกลุ่ม'
      };
      plan.push(match);
      return match;
    };

    const fromMatch = (match, outcome = 'winner') => {
      const seed = `${outcome === 'winner' ? 'Winner' : 'Loser'} ${match.id.toUpperCase()}`;
      return { seed, label: seed, team: seed, source: { id: match.id, outcome } };
    };
    const size = 2 ** Math.ceil(Math.log2(seeds.length));
    let pairs = firstKnockoutPairs(seeds, size);
    let semis = [];
    for (let field = size; field >= 2; field /= 2) {
      if (field === 2 && state.event.enableFinal === false) break;
      const round = field === 2 ? 'Final' : field === 4 ? 'Semi Final' : field === 8 ? 'Quarter Final' : `Round of ${field}`;
      const matches = pairs.map(([a, b], i) => {
        const id = field === 2 ? 'final' : field === 4 ? `sf${i + 1}` : field === 8 ? `qf${i + 1}` : `r${field}-${i + 1}`;
        return addMatch(id, round, a, b);
      });
      if (field === 4) semis = matches;
      pairs = [];
      for (let i = 0; i + 1 < matches.length; i += 2) {
        pairs.push([fromMatch(matches[i]), fromMatch(matches[i + 1])]);
      }
    }
    if (seeds.length >= 4 && semis.length === 2 && state.event.enableThird !== false) {
      addMatch('third', 'Third Place', fromMatch(semis[0], 'loser'), fromMatch(semis[1], 'loser'));
    }
    advancePlannedKnockout(plan);
    return plan;
  }

  function advancePlannedKnockout(matches) {
    const byId = new Map();
    for (const match of matches) {
      for (const side of ['A', 'B']) {
        const source = match[`source${side}`];
        if (!source) continue;
        const parent = byId.get(source.id);
        const winner = parent?.winner;
        let team = match[`seed${side}`];
        if (winner && (winner === parent.teamA || winner === parent.teamB)) {
          if (source.outcome === 'winner') team = winner;
          else if (parent.status !== 'Bye') team = winner === parent.teamA ? parent.teamB : parent.teamA;
        }
        if (match[`team${side}`] !== team) {
          match[`team${side}`] = team;
          match.scoreA = '';
          match.scoreB = '';
          match.winner = '';
          match.status = 'Pending';
        }
      }
      byId.set(match.id, match);
    }
  }

  function renderKnockoutPreviewHtml(progress = groupStageProgress(), plan = buildKnockoutPreviewPlan({ progress })) {
    if (!plan.length) return `<div class="notice">${esc(knockoutSetupIssue() || 'ตรวจชื่อทีมซ้ำในผังสายก่อนจัดคู่')}</div>`;
    return `
      <div class="card compact knockout-preview-card">
        <h3>Knockout Preview</h3>
        ${progress.complete ? '' : `<div class="notice warn">${esc(groupStageMessage(progress))}</div>`}
        <p class="hint">${state.knockoutUseResolvedOrder ? 'ใช้ลำดับที่บันทึกใน Tie Resolver' : 'ใช้อันดับจากตารางคะแนน'} · หากจำนวนทีมไม่ลงตัว ระบบให้ BYE ตามอันดับในสาย แล้วเรียงตามชื่อสายเมื่ออันดับเท่ากัน</p>
        <div class="tablewrap"><table>
          <thead><tr><th>รอบ</th><th>Match</th><th>Seed A</th><th>ทีม A</th><th>Seed B</th><th>ทีม B</th><th>หมายเหตุ</th></tr></thead>
          <tbody>${plan.map(match => `<tr><td>${esc(match.round)}</td><td>${esc(match.id)}</td><td>${esc(match.labelA)}</td><td>${esc(match.teamA)}</td><td>${esc(match.labelB)}</td><td>${esc(match.teamB)}</td><td>${esc(match.note)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
    `;
  }

  function knockoutDrawSignature(matches) {
    return JSON.stringify(matches.map(match => [
      match.id, match.seedA, match.seedB,
      match.sourceA ? null : match.teamA, match.sourceB ? null : match.teamB
    ]));
  }

  function generateKnockout({ resolved = state.knockoutUseResolvedOrder } = {}) {
    const progress = groupStageProgress();
    const issue = progress.complete ? knockoutSetupIssue() : groupStageMessage(progress);
    if (issue) {
      toast(issue, 'warn');
      return false;
    }
    const plan = buildKnockoutPreviewPlan({ resolved, progress });
    const unchanged = knockoutDrawSignature(plan) === knockoutDrawSignature(state.knockout);
    const played = state.knockout.some(match => String(match.status || '').toLowerCase() !== 'bye'
      && (match.winner || match.winnerTeam || hasSavedMatchResult(match)));
    if (!unchanged && played && !confirm('ผัง Knockout ใหม่จะแทนที่สายแข่งและคะแนน Knockout ที่บันทึกไว้ ต้องการสร้างผังใหม่หรือไม่?')) return false;
    if (!unchanged) {
      state.knockout = plan;
      if (state.lastResult?.round) state.lastResult = null;
    }
    state.knockoutUseResolvedOrder = resolved;
    setChecked($('#knockoutUseResolvedOrder'), resolved);
    audit('generate-knockout', { count: plan.length, resolved });
    saveState('knockout');
    window.PepsLiveCoreKnockout?.refresh();
    toast(unchanged ? 'ผัง Knockout ตรงกับผลเดิม' : `สร้างสาย Knockout แล้ว ${plan.length} ช่อง`, 'good');
    return true;
  }

  function hasGroups(groups) {
    return Object.values(groups || {}).some(arr => Array.isArray(arr) && arr.some(t => t && t !== 'BYE'));
  }

  function groupsEqual(left, right) {
    const keys = uniqueTeams([...Object.keys(left || {}), ...Object.keys(right || {})]).sort();
    return keys.every(group => {
      const leftTeams = (Array.isArray(left?.[group]) ? left[group] : []).filter(isRealTeamName).map(team => String(team).trim()).sort();
      const rightTeams = (Array.isArray(right?.[group]) ? right[group] : []).filter(isRealTeamName).map(team => String(team).trim()).sort();
      return JSON.stringify(leftTeams) === JSON.stringify(rightTeams);
    });
  }

  function validateCustomManualGroups(groups) {
    const capacities = groupCapacities();
    const groupNames = letters(state.event.groupCount);
    const unexpected = Object.keys(groups || {}).filter(group => !groupNames.includes(group) && (groups[group] || []).some(isRealTeamName));
    if (unexpected.length) return { ok: false, message: `พบสายที่ไม่ได้กำหนดใน Setup: ${unexpected.join(', ')}` };

    const assignedTeams = groupNames.flatMap(group => (groups[group] || []).filter(isRealTeamName));
    const seen = new Set();
    const duplicates = [];
    assignedTeams.forEach(team => {
      const key = normalizeName(team);
      if (seen.has(key)) duplicates.push(team);
      seen.add(key);
    });
    if (duplicates.length) return { ok: false, message: `มีทีมซ้ำในหลายสาย: ${uniqueTeams(duplicates).join(', ')}` };

    const underfilled = groupNames.filter(group => assignedTeamsIn(groups, group) !== capacities[group]);
    if (underfilled.length) return { ok: false, message: `จำนวนทีมในสาย ${underfilled.map(group => `${group} ${assignedTeamsIn(groups, group)}/${capacities[group]}`).join(', ')} ยังไม่ครบตาม Setup` };

    const roster = new Set((state.teams || []).map(normalizeName));
    const unknown = assignedTeams.filter(team => !roster.has(normalizeName(team)));
    if (unknown.length) return { ok: false, message: `มีทีมที่ไม่อยู่ในรายชื่อ Teams: ${uniqueTeams(unknown).join(', ')}` };
    if (assignedTeams.length !== (state.teams || []).length) {
      const assigned = new Set(assignedTeams.map(normalizeName));
      const missing = state.teams.filter(team => !assigned.has(normalizeName(team)));
      return { ok: false, message: `ยังไม่ได้จัดทีมจากรายชื่อ Teams: ${missing.join(', ')}` };
    }
    return { ok: true, message: '' };
  }

  function assignedTeamsIn(groups, group) {
    return (groups[group] || []).filter(isRealTeamName).length;
  }

  function rowsForGroup(groups, group, defaultRows) {
    if (!isCustomGroupSizing()) return defaultRows;
    return Math.max((groups?.[group] || []).length, groupCapacities()[group] || 0);
  }

  function getDisplayGroups(confirmedOnly = false) {
    if (state.manualGroups?.active && Object.keys(state.groups || {}).length) return normalizeManualGroups(state.groups, manualRowsForGroups(state.groups));
    if (hasGroups(state.groups)) return state.groups;
    if (confirmedOnly) return {};
    if (state.settings.drawMethod === 'instant-all' && state.pendingComplete && state.pendingGroups) return state.pendingGroups;

    const groupCount = intClamp(state.event.groupCount, 1, 26, 4);
    const groups = isCustomGroupSizing()
      ? emptyGroups(manualRowsForGroups({}))
      : Object.fromEntries(letters(groupCount).map(g => [g, []]));
    const feed = [...(state.drawLive?.feed || [])].reverse();
    feed.forEach(item => {
      if (!item || !item.group || item.group === 'ALL') return;
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group][Math.max(0, Number(item.slot || 1) - 1)] = item.team || '';
    });
    return groups;
  }

  function renderAll(rebuildNav = false) {
    if (rebuildNav) buildNav();
    refreshNavState();
    setSavePill();
    applyLayoutSettings();
    setText($('#currentEventName'), state.event.name || 'PepsLive Tournament');

    if (activePanel === 'setup') updateGroupCapacitySummary();
    if (activePanel === 'dashboard') renderDashboard();
    if (activePanel === 'teams') renderTeamValidation();
    if (activePanel === 'draw') { renderDrawStage(); renderDrawTools(); renderGroups(); renderRevealFeed(); }
    if (activePanel === 'schedule') { renderScheduleTools(); renderSchedule(); }
    if (activePanel === 'scores') { renderScores(); renderStandings(); }
    if (activePanel === 'knockout') { renderOverrides(); renderKnockout(); }
    if (activePanel === 'sources') renderSourceCards();
    if (activePanel === 'export') renderExcelExportPanel();
    if (activePanel === 'settings') { renderSettingsTools(); renderDebug(); }

    renderStepper();
    refreshHelpAttributes();
  }

  function renderDrawTools() {
    const actionRow = $('#toggleDrawExpand')?.closest('.row');
    if (!actionRow) return;

    if (!$('#openDrawTextSettings')) {
      const btn = document.createElement('button');
      btn.id = 'openDrawTextSettings';
      btn.className = 'btn';
      btn.type = 'button';
      btn.textContent = 'Text Size';
      btn.addEventListener('click', openDrawTextSettingsModal);
      actionRow.appendChild(btn);
    }

    if (!$('#drawGroupsColumnsTool')) {
      const tool = document.createElement('div');
      tool.id = 'drawGroupsColumnsTool';
      tool.className = 'draw-inline-tool';
      tool.innerHTML = `
        <label>Groups Columns <b id="drawGroupColumnsValue">${esc(state.settings.groupColumns || 4)}</b></label>
        <input id="drawGroupColumnsRange" type="range" min="1" max="10" step="1" value="${esc(state.settings.groupColumns || 4)}" />
      `;
      const pending = $('#pendingBox');
      if (pending) pending.parentNode.insertBefore(tool, pending);
      const range = $('#drawGroupColumnsRange');
      on(range, 'input', (e) => {
        state.settings.groupColumns = intClamp(e.target.value, 1, 10, 4);
        setText($('#drawGroupColumnsValue'), state.settings.groupColumns);
        applyLayoutSettings();
        renderGroups();
        saveState('group-columns', false);
      });
    } else {
      setValue($('#drawGroupColumnsRange'), state.settings.groupColumns || 4);
      setText($('#drawGroupColumnsValue'), state.settings.groupColumns || 4);
    }
  }

  function renderManualGroupsToolbar() {
    const editing = manualGroupsEditing;
    const fixedGroupSizes = isCustomGroupSizing();
    return `
      <details class="advanced-details manual-groups-details" ${editing ? 'open' : ''}>
        <summary><span>จัดกลุ่มด้วยตัวเอง</span><small>${state.manualGroups?.active ? 'กำลังใช้ข้อมูลที่แก้เอง' : 'ใช้เมื่อจำเป็นต้องแก้ผลจับสาย'}</small></summary>
        <div class="manual-groups-toolbar">
          <div>
            <b>Manual Groups</b>
            <span>แก้รายชื่อและตำแหน่งในแต่ละสายโดยตรง ระบบจะถือผลนี้เป็นข้อมูลจริงเมื่อกดบันทึก</span>
          </div>
          <div class="row">
            <button class="btn small" type="button" data-manual-groups-create>สร้างสายว่าง</button>
            ${editing ? `
              ${fixedGroupSizes ? '' : '<button class="btn small" type="button" data-manual-groups-add-row>เพิ่มแถว</button><button class="btn small warn" type="button" data-manual-groups-del-row>ลบแถวท้าย</button>'}
              <button class="btn small primary" type="button" data-manual-groups-save>บันทึกสาย</button>
              <button class="btn small" type="button" data-manual-groups-cancel>ยกเลิก</button>
            ` : `
              <button class="btn small" type="button" data-manual-groups-edit>แก้ไขสาย</button>
              <button class="btn small bad" type="button" data-manual-groups-clear>ล้างข้อมูลที่แก้เอง</button>
            `}
          </div>
        </div>
      </details>
    `;
  }

  function bindManualGroupsToolbar() {
    on($('[data-manual-groups-create]'), 'click', createEmptyManualGroups);
    on($('[data-manual-groups-edit]'), 'click', startManualGroupsEdit);
    on($('[data-manual-groups-add-row]'), 'click', addManualGroupRow);
    on($('[data-manual-groups-del-row]'), 'click', deleteManualGroupRow);
    on($('[data-manual-groups-save]'), 'click', saveManualGroupsFromEditor);
    on($('[data-manual-groups-cancel]'), 'click', () => {
      manualGroupsEditing = false;
      manualGroupRows = 0;
      manualGroupsDraft = null;
      renderGroups();
    });
    on($('[data-manual-groups-clear]'), 'click', clearManualGroups);
  }

  function startManualGroupsEdit() {
    if (state.drawLive?.waiting) {
      toast('Draw is running. Wait for the current reveal before editing groups.', 'warn');
      return;
    }
    const groups = getDisplayGroups(false);
    manualGroupsEditing = true;
    manualGroupsDraft = makeManualGroupsDraft(groups, manualRowsForGroups(groups));
    manualGroupRows = manualGroupsDraft.rows;
    renderGroups();
  }

  function createEmptyManualGroups() {
    if (state.drawLive?.waiting) {
      toast('Draw is running. Wait for the current reveal before creating manual groups.', 'warn');
      return;
    }
    const rows = isCustomGroupSizing()
      ? Math.max(...Object.values(groupCapacities()))
      : Math.max(2, Math.ceil(Math.max(1, state.teams.length) / Math.max(1, state.event.groupCount || 4)));
    manualGroupsEditing = true;
    manualGroupRows = rows;
    manualGroupsDraft = makeManualGroupsDraft(emptyGroups(rows), rows);
    renderGroups();
  }

  function clearManualGroups() {
    if (!state.manualGroups?.active && !hasGroups(state.groups)) return;
    if (!confirm('ล้างผลแบ่งสายและตาราง คะแนน กับ Knockout ที่เกี่ยวข้องทั้งหมดหรือไม่? รายชื่อทีมและ Setup จะยังอยู่')) return;
    resetTournamentDerivedData();
    manualGroupsEditing = false;
    manualGroupRows = 0;
    manualGroupsDraft = null;
    audit('manual-clear-groups');
    saveState('manual-clear-groups');
  }

  function addManualGroupRow() {
    if (isCustomGroupSizing()) return;
    const draft = readManualGroupsDraftFromEditor() || ensureManualGroupsDraft();
    if (draft.rows >= MAX_MANUAL_GROUP_ROWS) {
      toast(`Manual groups limited to ${MAX_MANUAL_GROUP_ROWS} rows`, 'warn');
      return;
    }
    setManualGroupRowCount(draft.rows + 1);
  }

  function deleteManualGroupRow() {
    if (isCustomGroupSizing()) return;
    const draft = readManualGroupsDraftFromEditor() || ensureManualGroupsDraft();
    if (draft.rows <= 1) {
      toast('Manual groups need at least 1 row', 'warn');
      return;
    }
    const lastIndex = draft.rows - 1;
    const hasData = Object.values(draft.groups || {}).some(arr => String(arr?.[lastIndex] || '').trim());
    if (hasData && !confirm('Delete the last manual group row?')) return;
    setManualGroupRowCount(draft.rows - 1);
  }

  function saveManualGroupsFromEditor() {
    const draft = readManualGroupsDraftFromEditor();
    if (!draft) return;
    const groups = draft.groups;
    const rowCount = draft.rows;
    if (isCustomGroupSizing()) {
      const validation = validateCustomManualGroups(groups);
      if (!validation.ok) {
        toast(validation.message, 'warn');
        return;
      }
    }
    if (!groupsEqual(state.groups, groups) && ((state.matches || []).length || (state.knockout || []).length)) {
      if (!confirm('การเปลี่ยนการจัดทีมในสายจะล้างตาราง คะแนน และ Knockout เดิม ต้องการดำเนินการต่อหรือไม่?')) return;
      resetMatchDerivedData();
    }
    state.groups = normalizeManualGroups(groups, rowCount);
    state.manualGroups = { active: true, rows: rowCount, updatedAt: nowIso() };
    state.pendingGroups = null;
    state.pendingSequence = [];
    state.pendingRevealIndex = 0;
    state.pendingComplete = true;
    state.drawLive = { ...defaultState().drawLive, feed: groupsToFeed(state.groups), current: groupsToFeed(state.groups)[0] || null, progress: groupsToFeed(state.groups).length, total: groupsToFeed(state.groups).length, finished: true, phase: 'manual' };
    syncTeamsFromGroups(state.groups);
    manualGroupsEditing = false;
    manualGroupRows = 0;
    manualGroupsDraft = null;
    state.drawHistory.unshift({ at: nowIso(), groups: deepClone(state.groups), teams: deepClone(state.teams), manual: true });
    state.drawHistory = state.drawHistory.slice(0, 20);
    audit('manual-save-groups', { groups: Object.keys(state.groups).length, teams: Object.values(state.groups).flat().filter(isRealTeamName).length });
    saveState('manual-save-groups');
    toast('Manual groups saved', 'good');
  }

  function renderManualGroupsEditor(groups, keys, maxRows) {
    return `
      <div class="manual-groups-editor">
        ${keys.map(g => `
          <div class="manual-group-card" data-manual-group-row="${esc(g)}">
            <div class="manual-group-head"><span>Group ${esc(g)}</span><small>${(groups[g] || []).filter(isRealTeamName).length} teams</small></div>
            ${Array.from({ length: isCustomGroupSizing() ? ((groups[g] || []).length || groupCapacities()[g] || 4) : maxRows }, (_, i) => `
              <label class="manual-group-row">
                <span>${i + 1}</span>
                <input data-manual-team data-manual-slot="${i + 1}" value="${esc((groups[g] || [])[i] || '')}" placeholder="Team name or BYE" />
              </label>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderScheduleTools() {
    const scheduleRow = $('#copyScheduleBtn')?.closest('.row');
    if (!scheduleRow || $('#manualScheduleTools')) return;
    const tools = document.createElement('div');
    tools.id = 'manualScheduleTools';
    tools.className = 'manual-schedule-area';
    tools.innerHTML = `
      <details class="advanced-details" ${scheduleEditing ? 'open' : ''}>
        <summary><span>แก้ตารางด้วยตัวเอง</span><small>สำหรับเพิ่มคู่หรือแก้เวลา/สนามแบบละเอียด</small></summary>
        <div class="manual-schedule-tools">
          <button class="btn" type="button" id="createEmptySchedule">สร้างตารางว่าง</button>
          <button class="btn" type="button" id="editScheduleRows">แก้ไขตาราง</button>
          <button class="btn" type="button" id="addScheduleRow">เพิ่มคู่แข่ง</button>
          <button class="btn primary" type="button" id="saveScheduleRows">บันทึกตาราง</button>
          <button class="btn" type="button" id="cancelScheduleEdit">ยกเลิก</button>
        </div>
      </details>
    `;
    scheduleRow.insertAdjacentElement('afterend', tools);
    on($('#createEmptySchedule'), 'click', createEmptySchedule);
    on($('#editScheduleRows'), 'click', startScheduleEdit);
    on($('#addScheduleRow'), 'click', addScheduleDraftRow);
    on($('#saveScheduleRows'), 'click', saveScheduleFromEditor);
    on($('#cancelScheduleEdit'), 'click', cancelScheduleEdit);
    syncScheduleToolState();
  }

  function syncScheduleToolState() {
    const save = $('#saveScheduleRows');
    const add = $('#addScheduleRow');
    const cancel = $('#cancelScheduleEdit');
    if (save) save.classList.toggle('hidden', !scheduleEditing);
    if (add) add.classList.toggle('hidden', !scheduleEditing);
    if (cancel) cancel.classList.toggle('hidden', !scheduleEditing);
  }

  function scheduleBlankMatch(index = 0) {
    return {
      id: `MAN-${Date.now()}-${Math.random().toString(36).slice(2)}-${index}`,
      group: '',
      teamA: '',
      teamB: '',
      scoreA: '',
      scoreB: '',
      status: 'Pending',
      court: '',
      time: ''
    };
  }

  function startScheduleEdit() {
    scheduleEditing = true;
    scheduleDraft = state.matches.length ? deepClone(state.matches) : [scheduleBlankMatch(0)];
    syncScheduleToolState();
    renderSchedule();
  }

  function createEmptySchedule() {
    const rows = Math.max(4, Number(state.event.groupCount || 4) || 4);
    scheduleEditing = true;
    scheduleDraft = Array.from({ length: rows }, (_, i) => scheduleBlankMatch(i));
    syncScheduleToolState();
    renderSchedule();
  }

  function addScheduleDraftRow() {
    if (!scheduleEditing) startScheduleEdit();
    readScheduleDraftFromEditor();
    scheduleDraft.push(scheduleBlankMatch(scheduleDraft.length));
    renderSchedule();
  }

  function cancelScheduleEdit() {
    scheduleEditing = false;
    scheduleDraft = null;
    syncScheduleToolState();
    renderSchedule();
  }

  function readScheduleDraftFromEditor() {
    if (!scheduleEditing) return;
    const rows = Array.from(document.querySelectorAll('[data-schedule-edit-row]'));
    if (!rows.length) return;
    scheduleDraft = rows.map((row, index) => ({
      id: row.dataset.matchId || scheduleBlankMatch(index).id,
      time: row.querySelector('[data-schedule-time]')?.value.trim() || '',
      court: row.querySelector('[data-schedule-court]')?.value.trim() || '',
      group: row.querySelector('[data-schedule-group]')?.value.trim() || '',
      teamA: row.querySelector('[data-schedule-team-a]')?.value.trim() || '',
      teamB: row.querySelector('[data-schedule-team-b]')?.value.trim() || '',
      status: row.querySelector('[data-schedule-status]')?.value || 'Pending'
    }));
  }

  function saveScheduleFromEditor() {
    if (!scheduleEditing) return;
    readScheduleDraftFromEditor();
    const previousById = new Map(state.matches.map(match => [match.id, match]));
    const retained = new Set();
    const next = scheduleDraft.map((draft, index) => {
      const match = { ...scheduleBlankMatch(index), ...draft };
      const previous = previousById.get(match.id);
      if (!previous) return match;
      if (groupMatchKey(previous.group, previous.teamA, previous.teamB) !== groupMatchKey(match.group, match.teamA, match.teamB)) {
        if (hasSavedMatchResult(previous)) match.status = 'Pending';
        return match;
      }

      retained.add(previous.id);
      const result = preserveGroupMatchResult(previous, match);
      const oldStatus = previous.status === 'Done' ? 'Finished' : previous.status;
      if (match.status !== oldStatus) result.status = match.status;
      return result;
    });
    if (state.matches.some(match => hasSavedMatchResult(match) && !retained.has(match.id))
        && !confirm('การแก้ตารางครั้งนี้จะล้างคะแนนของคู่ที่ถูกเปลี่ยนหรือนำออก ต้องการบันทึกหรือไม่?')) return;

    state.matches = next;
    state.manualSchedule = { active: true, updatedAt: nowIso() };
    scheduleEditing = false;
    scheduleDraft = null;
    calculateStandings();
    audit('manual-save-schedule', { count: state.matches.length });
    saveState('manual-save-schedule');
    toast('บันทึกตารางแข่งแล้ว', 'good');
  }

  function renderScheduleEditorRows() {
    const rows = scheduleDraft || deepClone(state.matches);
    const statuses = ['Pending', 'Live', 'Finished', 'Bye', 'Forfeit A', 'Forfeit B'];
    return `
      <div class="tablewrap manual-schedule-editor">
        <table>
          <thead><tr><th>Time</th><th>Court</th><th>Group</th><th>Team A</th><th>Team B</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.map((m, i) => `
              <tr data-schedule-edit-row data-match-id="${esc(m.id || '')}">
                <td><input data-schedule-time value="${esc(m.time || '')}" placeholder="09:00" /></td>
                <td><input data-schedule-court value="${esc(m.court || '')}" placeholder="1" /></td>
                <td><input data-schedule-group value="${esc(m.group || '')}" placeholder="A" /></td>
                <td><input data-schedule-team-a value="${esc(m.teamA || '')}" placeholder="Team A" /></td>
                <td><input data-schedule-team-b value="${esc(m.teamB || '')}" placeholder="Team B" /></td>
                <td><select data-schedule-status>${statuses.map(s => `<option value="${esc(s)}" ${(m.status === s || (s === 'Finished' && m.status === 'Done')) ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderSettingsTools() {
    const sourceCard = $('#sourceBg')?.closest('.card');
    if (!sourceCard || $('#settingsExtraControls')) return;

    const box = document.createElement('div');
    box.id = 'settingsExtraControls';
    box.className = 'settings-extra-controls';
    box.innerHTML = `
      <div class="field">
        <label>Groups Table Columns</label>
        <div class="inline-range">
          <input id="settingsGroupColumnsRange" type="range" min="1" max="10" step="1" value="${esc(state.settings.groupColumns || 4)}" />
          <div class="range-pill"><span id="settingsGroupColumnsValue">${esc(state.settings.groupColumns || 4)}</span> คอลัมน์</div>
        </div>
      </div>
      <div class="row">
        <button class="btn" id="settingsDrawTextBtn" type="button">Draw Text Size Settings</button>
      </div>
    `;
    const saveBtn = $('#saveDisplaySettings');
    sourceCard.insertBefore(box, saveBtn);

    on($('#settingsGroupColumnsRange'), 'input', (e) => {
      state.settings.groupColumns = intClamp(e.target.value, 1, 10, 4);
      setText($('#settingsGroupColumnsValue'), state.settings.groupColumns);
      applyLayoutSettings();
      saveState('group-columns', false);
    });
    on($('#settingsDrawTextBtn'), 'click', openDrawTextSettingsModal);
  }

  function openDrawTextSettingsModal() {
    clearDrawTextPreview();
    const saved = drawTextSizes(state.settings, false);
    let temp = { ...saved };
    $('#drawTextSettingsModal')?.remove();

    const controls = [
      ['chip', 'ป้าย Style / Reveal', 8, 26, 'Draw Control + OBS'],
      ['groupLabel', 'คำว่า GROUP', 10, 34, 'Draw Control + OBS'],
      ['groupLetter', 'ตัวอักษรสาย A/B/C', 18, 62, 'Draw Control + OBS'],
      ['team', 'ชื่อทีม Draw Control / OBS Source', 34, 84, 'ใช้ร่วมกัน'],
      ['meta', 'บรรทัดสาย/ลำดับ Draw / OBS Meta', 10, 28, 'ใช้ร่วมกัน'],
      ['status', 'Progress / Status', 9, 24, 'Draw Control'],
      ['groupTitle', 'หัวตาราง Groups / OBS Groups Source', 11, 26, 'Groups Table + OBS'],
      ['groupTeam', 'ชื่อทีมใน Groups Table / OBS Groups Source', 11, 24, 'Groups Table + OBS']
    ];

    const modal = document.createElement('div');
    modal.id = 'drawTextSettingsModal';
    modal.className = 'peps-settings-modal open';
    modal.innerHTML = `
      <div class="peps-settings-box">
        <div class="peps-settings-head">
          <div>
            <h3>Draw Text Size Settings</h3>
            <p>เลื่อนแล้วดู Preview แบบ real-time · Draw Animation Source เปลี่ยนตาม Draw Control แบบ real-time · Cancel จะคืนค่าล่าสุด</p>
          </div>
          <button type="button" class="iconbtn" data-close-text-modal>×</button>
        </div>
        <div class="peps-settings-body">
          <div class="peps-settings-sliders">
            ${controls.map(([key, label, min, max, scope]) => `
              <div class="peps-slider">
                <label>
                  <span>${esc(label)} <small>${esc(scope)}</small></span>
                  <b data-size-value="${key}">${esc(temp[key])}px</b>
                </label>
                <input type="range" min="${min}" max="${max}" step="1" value="${esc(temp[key])}" data-size-key="${key}" />
              </div>
            `).join('')}
          </div>
          <div class="peps-settings-preview">
            <div class="preview-section-title">Draw Control Preview</div>
            <div class="draw-stage preview-draw-stage">
              <div class="draw-graphic preview-graphic">
                <div class="draw-fx"><div class="pl-wheel"></div></div>
                <div class="draw-chip">Wheel Spin</div>
                <div class="draw-group-badge">GROUP <b>B</b></div>
                <div class="draw-team-name"><span>Golden Lion</span></div>
                <div class="draw-team-sub">สาย B · ลำดับ 2</div>
                <div class="draw-progress"><div class="draw-progress-bar" style="width:65%"></div></div>
                <div class="draw-progress-text"><span>พร้อมแสดงผล</span><span>65%</span></div>
              </div>
            </div>

            <div class="preview-section-title">OBS Draw Animation Source Preview · ใช้ขนาดจาก Draw Control</div>
            <div class="preview-source-card">
              <div class="pl-anim-core preview-anim-core">
                <div class="pl-anim-fx"><div class="pl-ring"></div></div>
                <div class="draw-chip">Draw Source</div>
                <div class="draw-group-badge">GROUP <b>C</b></div>
                <div class="pl-anim-name"><span>Storm Rider</span></div>
                <div class="pl-anim-meta">สาย C · ลำดับ 3</div>
              </div>
            </div>

            <div class="preview-section-title">Groups Table Preview</div>
            <div class="pl-group-card preview-group-card">
              <div class="pl-group-title"><span>สาย B</span><span>4 ทีม</span></div>
              <div class="pl-group-row"><span class="no">1</span><span class="team">Golden Lion</span></div>
              <div class="pl-group-row"><span class="no">2</span><span class="team">Storm Rider</span></div>
              <div class="pl-group-row"><span class="no">3</span><span class="team">Sisaket Two</span></div>
            </div>
          </div>
        </div>
        <div class="peps-settings-actions">
          <button type="button" class="btn primary" data-save-text-size>บันทึก</button>
          <button type="button" class="btn" data-reset-text-size>Reset</button>
          <button type="button" class="btn" data-cancel-text-size>ยกเลิก</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const applyVarsTo = (el, values) => {
      if (!el) return;
      const normalized = { ...values, sourceTeam: values.team, sourceMeta: values.meta };
      el.style.setProperty('--draw-chip-fs', `${normalized.chip}px`);
      el.style.setProperty('--draw-group-label-fs', `${normalized.groupLabel}px`);
      el.style.setProperty('--draw-group-letter-fs', `${normalized.groupLetter}px`);
      el.style.setProperty('--draw-team-fs', `${normalized.team}px`);
      el.style.setProperty('--draw-meta-fs', `${normalized.meta}px`);
      el.style.setProperty('--draw-status-fs', `${normalized.status}px`);
      el.style.setProperty('--source-team-fs', `${normalized.team}px`);
      el.style.setProperty('--source-meta-fs', `${normalized.meta}px`);
      el.style.setProperty('--group-title-fs', `${normalized.groupTitle}px`);
      el.style.setProperty('--group-team-fs', `${normalized.groupTeam}px`);
    };

    const updatePreview = () => {
      temp = normalizeDrawTextSizes(temp);
      publishDrawTextPreview(temp);
      setDrawTextSizeVars(temp);
      applyVarsTo(modal, temp);
      applyVarsTo($('.peps-settings-preview', modal), temp);

      $$('[data-size-value]', modal).forEach(el => {
        const key = el.dataset.sizeValue;
        el.textContent = `${temp[key]}px`;
      });

      // Force a tiny layout refresh so Chrome/OBS preview repaints immediately while dragging.
      const preview = $('.peps-settings-preview', modal);
      if (preview) preview.dataset.previewTick = String(Date.now());
    };

    $$('[data-size-key]', modal).forEach(input => {
      input.addEventListener('input', (e) => {
        temp[e.target.dataset.sizeKey] = Number(e.target.value);
        updatePreview();
      });
      input.addEventListener('change', (e) => {
        temp[e.target.dataset.sizeKey] = Number(e.target.value);
        updatePreview();
      });
    });

    const closeRestore = () => {
      clearDrawTextPreview();
      setDrawTextSizeVars(saved);
      modal.remove();
      renderAll(false);
    };

    on($('[data-close-text-modal]', modal), 'click', closeRestore);
    on($('[data-cancel-text-size]', modal), 'click', closeRestore);
    on($('[data-reset-text-size]', modal), 'click', () => {
      temp = { ...DEFAULT_DRAW_TEXT_SIZES };
      $$('[data-size-key]', modal).forEach(input => {
        input.value = temp[input.dataset.sizeKey];
      });
      updatePreview();
    });
    on($('[data-save-text-size]', modal), 'click', () => {
      temp = normalizeDrawTextSizes(temp);
      clearDrawTextPreview();
      state.settings.drawTextSizes = { ...temp };
      applyLayoutSettings();
      saveState('draw-text-sizes');
      modal.remove();
      toast('บันทึกขนาดตัวหนังสือแล้ว', 'good');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeRestore();
    });

    updatePreview();
  }

  function renderStepper() {
    const root = $('#stepper');
    if (!root) return;
    const workflow = PANELS.filter(([id]) => ['setup', 'teams', 'draw', 'schedule', 'scores', 'knockout'].includes(id));
    const groupProgress = groupStageProgress();
    const doneCount = workflow.filter(([id]) => panelDone(id, groupProgress)).length;
    const current = workflow.find(([id]) => id === activePanel)
      || workflow.find(([id]) => !panelDone(id, groupProgress)) || workflow[workflow.length - 1];
    const progress = Math.round((doneCount / workflow.length) * 100);
    root.innerHTML = `
      <div class="workflow-summary">
        <div><span>ขั้นตอนปัจจุบัน</span><b>${esc(current?.[1] || 'พร้อมใช้งาน')}</b></div>
        <strong>${doneCount}/${workflow.length}</strong>
      </div>
      <div class="workflow-track" aria-label="ความคืบหน้า ${progress}%"><span style="width:${progress}%"></span></div>
      <div class="workflow-steps">
        ${workflow.map(([id, title], index) => {
          const done = panelDone(id, groupProgress);
          return `<button type="button" class="step ${done ? 'done' : ''} ${activePanel === id ? 'active' : ''}" data-dashboard-target="${esc(id)}"><b>${index + 1}</b><span>${esc(title)}</span></button>`;
        }).join('')}
      </div>
    `;
  }

  function panelDone(id, progress) {
    if (id === 'setup') return !!state.event.name;
    if (id === 'teams') return state.teams.length > 0;
    if (id === 'draw') return hasGroups(state.groups);
    if (id === 'schedule') return progress.scheduleReady;
    if (id === 'scores') return progress.complete;
    if (id === 'knockout') return state.knockout.length > 0;
    return false;
  }

  function renderDashboard() {
    const progress = groupStageProgress();
    const groupCount = Object.values(state.groups || {}).filter((teams) => Array.isArray(teams) && teams.some(isRealTeamName)).length;
    const stats = $('#dashboardStats');
    if (stats) {
      stats.innerHTML = [
        ['ทีม', state.teams.length],
        ['สายที่พร้อม', `${groupCount}/${state.event.groupCount}`],
        ['ผลที่บันทึก', `${progress.done}/${progress.total}`],
        ['สถานะ Knockout', state.knockout.length ? 'พร้อม' : 'รอข้อมูล']
      ].map(([label, value]) => `<div class="stat"><span class="k">${esc(label)}</span><b class="v">${esc(value)}</b></div>`).join('');
    }

    const dashboard = $('[data-panel="dashboard"]');
    if (dashboard && !$('#dashboardWorkspace')) {
      const workspace = document.createElement('div');
      workspace.id = 'dashboardWorkspace';
      workspace.className = 'dashboard-workspace';
      workspace.innerHTML = '<div id="dashboardPrimary"></div><div id="dashboardFlow"></div>';
      stats?.insertAdjacentElement('afterend', workspace);
    }

    const nextPanelId = !state.teams.length
      ? 'teams'
      : !hasGroups(state.groups)
        ? 'draw'
        : !progress.scheduleReady
          ? 'schedule'
          : !progress.complete
            ? 'scores'
            : !state.knockout.length
              ? 'knockout'
              : 'sources';
    const nextPanelMeta = PANELS.find(([id]) => id === nextPanelId) || PANELS[0];
    const nextCopy = {
      teams: 'เพิ่มรายชื่อทีมให้ครบก่อนเริ่มจับสาย',
      draw: 'สุ่มสายและยืนยันผลเพื่อใช้สร้างตารางแข่ง',
      schedule: `ตรวจคู่แข่งในตาราง · ${groupStageMessage(progress)}`,
      scores: `บันทึกผลที่เหลืออีก ${progress.pending} คู่`,
      knockout: 'ตรวจอันดับและสร้างสาย Knockout จริง',
      sources: 'ข้อมูลพร้อมสำหรับ OBS และการส่งออก'
    }[nextPanelId] || 'ตรวจความพร้อมของรายการ';

    const primary = $('#dashboardPrimary');
    if (primary) {
      primary.innerHTML = `
        <section class="dashboard-next">
          <div class="eyebrow">งานถัดไปที่แนะนำ</div>
          <h3>${esc(nextPanelMeta[1])}</h3>
          <p>${esc(nextCopy)}</p>
          <button class="btn primary" type="button" data-dashboard-target="${esc(nextPanelId)}">ไปทำขั้นตอนนี้</button>
        </section>
        <section class="dashboard-readiness">
          <div class="readiness-row"><span>Safe Live Mode</span><b class="${state.settings.safeLive ? 'good-text' : 'warn-text'}">${state.settings.safeLive ? 'เปิดอยู่' : 'ปิดอยู่'}</b></div>
          <div class="readiness-row"><span>บันทึกล่าสุด</span><b>${new Date(state.updatedAt || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</b></div>
          <div class="readiness-row"><span>Google Sheet</span><b>${state.webhook.url ? 'ตั้งค่าแล้ว' : 'ยังไม่ตั้งค่า'}</b></div>
        </section>
      `;
    }

    const flow = $('#dashboardFlow');
    if (flow) {
      const workflow = PANELS.filter(([id]) => ['setup', 'teams', 'draw', 'schedule', 'scores', 'knockout'].includes(id));
      flow.innerHTML = `
        <div class="dashboard-flow-head"><div><span class="eyebrow">Tournament Flow</span><h3>ลำดับงานทั้งหมด</h3></div><button class="btn small" type="button" data-dashboard-target="export">ส่งออกข้อมูล</button></div>
        <div class="dashboard-flow-list">
          ${workflow.map(([id, title, sub], index) => `
            <button type="button" class="dashboard-flow-item ${panelDone(id, progress) ? 'done' : ''} ${id === nextPanelId ? 'current' : ''}" data-dashboard-target="${esc(id)}">
              <span>${String(index + 1).padStart(2, '0')}</span>
              <div><b>${esc(title)}</b><small>${esc(sub)}</small></div>
              <strong>${panelDone(id, progress) ? 'เสร็จ' : id === nextPanelId ? 'ทำต่อ' : 'รอ'}</strong>
            </button>
          `).join('')}
        </div>
      `;
    }

    const next = $('#nextAction');
    if (next) {
      next.textContent = nextCopy;
    }

    const guard = $('#guardList');
    if (guard) {
      guard.innerHTML = `
        <div class="notice ${state.settings.safeLive ? 'good' : 'warn'}">Safe Live Mode: ${state.settings.safeLive ? 'ON' : 'OFF'}</div>
        <div class="notice">Draw Source: ใช้ลิงก์เดียว ?view=draw-animation</div>
        <div class="notice">Live Sources: ${SOURCES.length} รายการ · Draw Animation และ Groups Table</div>
      `;
    }
  }

  function renderTeamValidation() {
    const box = $('#teamValidation');
    if (!box) return;
    const v = teamValidation();
    const capacityLine = isCustomGroupSizing()
      ? `กำหนดที่นั่ง ${v.slots} ทีม · ${v.capacityMatchesRoster ? 'ตรงกับรายชื่อ' : `ต้องมีรายชื่อ ${v.slots} ทีม`}`
      : `BYE ${v.byes}`;
    box.innerHTML = `
      <div class="notice ${v.ok ? 'good' : 'warn'}">
        ทีมทั้งหมด: <b>${v.teams.length}</b> · สาย: <b>${v.groupCount}</b> · ${esc(capacityLine)}
      </div>
      ${v.dup.length ? `<div class="notice warn">ชื่อซ้ำ: ${esc(v.dup.join(', '))}</div>` : '<div class="notice good">ไม่พบชื่อซ้ำ</div>'}
      ${v.reserved.length ? '<div class="notice warn">ชื่อทีม BYE เป็นชื่อสงวน กรุณาเปลี่ยนก่อนสุ่ม</div>' : ''}
      ${isCustomGroupSizing() ? `<div class="hint">${Object.entries(v.capacities).map(([group, size]) => `สาย ${group} ${size} ทีม`).join(' · ')}</div>` : ''}
    `;
  }

  function renderDrawStage() {
    const stage = $('#drawStage');
    if (!stage) return;
    updateDrawStageNode(stage, 'control');

    const overlayStage = $('#drawExpandOverlay .draw-overlay-stage');
    if (overlayStage) updateDrawStageNode(overlayStage, 'overlay');
  }

  function updateDrawStageNode(node, context) {
    const live = state.drawLive || {};
    const waiting = !!live.waiting;
    const running = !!live.running;
    const item = waiting ? tickerItem() : (live.current || live.pendingItem || { team: 'READY', group: '-', slot: '-' });
    const mode = state.settings.drawAnimation || 'wheel';
    const progress = live.total ? Math.round(((live.progress || 0) / live.total) * 100) : 0;
    const animState = (waiting || running) ? 'active' : (live.current ? 'result' : 'idle');

    let core = node.querySelector('.draw-graphic');
    // If the mode changed or no core exists, we must rewrite innerHTML.
    const fxSignature = `${mode}|${state.event?.groupCount || 4}|${(state.teams || []).length}`;
    if (!core || !core.classList.contains(`draw-style-${mode}`) || core.dataset.fxSignature !== fxSignature) {
      node.innerHTML = drawVisualHtml(context);
      return;
    }

    // Otherwise, fast update text nodes to preserve CSS animations
    core.className = `draw-graphic draw-source-card ${animState} draw-style-${esc(mode)} draw-context-${esc(context)}`;
    core.dataset.fxSignature = fxSignature;
    const badge = core.querySelector('.draw-group-pill b');
    if (badge) badge.textContent = item.group || '-';
    const status = core.querySelector('.draw-status-text');
    if (status) status.textContent = waiting ? 'RUNNING' : 'READY';
    const nameSpan = core.querySelector('.draw-team-name span');
    if (nameSpan) nameSpan.textContent = item.team || 'READY';
    const cardGroup = core.querySelector('[data-card-group]');
    if (cardGroup) cardGroup.textContent = `GROUP ${item.group || '-'}`;
    const cardTeam = core.querySelector('[data-card-team]');
    if (cardTeam) cardTeam.textContent = item.team || 'READY';
    const cardSlot = core.querySelector('[data-card-slot]');
    if (cardSlot) cardSlot.textContent = `ลำดับ ${item.slot || '-'}`;
    const sub = core.querySelector('.draw-subtitle');
    if (sub) sub.textContent = waiting ? 'กำลังรันรายชื่อและสาย...' : `สาย ${item.group || '-'} · ลำดับ ${item.slot || '-'}`;
    const bar = core.querySelector('.draw-progress-bar');
    if (bar) bar.style.width = `${progress}%`;
    const meta = core.querySelector('.draw-progress-meta span:last-child');
    if (meta) meta.textContent = `${progress}%`;
    const metaLabel = core.querySelector('.draw-progress-meta span:first-child');
    if (metaLabel) metaLabel.textContent = waiting ? 'กำลังสุ่ม...' : 'พร้อมแสดงผล';
  }

  function drawVisualHtml(context = 'control') {
    const live = state.drawLive || {};
    const waiting = !!live.waiting;
    const running = !!live.running;
    const item = waiting ? tickerItem() : (live.current || live.pendingItem || { team: 'READY', group: '-', slot: '-' });
    const mode = state.settings.drawAnimation || 'wheel';
    const progress = live.total ? Math.round(((live.progress || 0) / live.total) * 100) : 0;
    
    const animState = (waiting || running) ? 'active' : (live.current ? 'result' : 'idle');

    return `
      <div class="draw-graphic draw-source-card ${animState} draw-style-${esc(mode)} draw-context-${esc(context)}" data-fx-signature="${esc(`${mode}|${state.event?.groupCount || 4}|${(state.teams || []).length}`)}">
        <div class="draw-layout">
          <div class="draw-header-zone">
            <div class="draw-style-label">${esc(sourceModeLabel(mode))}</div>
            <div class="draw-group-pill">GROUP <b>${esc(item.group || '-')}</b></div>
            <div class="draw-status-text">${waiting ? 'RUNNING' : 'READY'}</div>
          </div>

          <div class="draw-fx-zone">
            <div class="draw-fx-scale">
              ${drawFx(mode, state)}
            </div>
          </div>

          <div class="draw-result-zone">
            <div class="draw-team-name"><span>${esc(item.team || 'READY')}</span></div>
            <div class="draw-subtitle">${waiting ? 'กำลังรันรายชื่อและสาย...' : `สาย ${esc(item.group || '-')} · ลำดับ ${esc(item.slot || '-')}`}</div>
          </div>

          <div class="draw-progress-zone">
            <div class="draw-progress-track">
              <div class="draw-progress-bar" style="width:${progress}%"></div>
            </div>
            <div class="draw-progress-meta">
              <span>${waiting ? 'กำลังสุ่ม...' : 'พร้อมแสดงผล'}</span>
              <span>${progress}%</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function drawFx(mode) {
    if (mode === 'wheel') return '<div class="wheel-visual"><div class="wheel-rotor"></div><div class="wheel-pointer"></div><div class="wheel-pulse-ring"></div><div class="wheel-dots"><i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i><i style="--i:4"></i><i style="--i:5"></i><i style="--i:6"></i><i style="--i:7"></i></div></div>';
    if (mode === 'slot') return '<div class="slot-visual peps-slot-machine"><div class="slot-frame"><div class="slot-reel slot-reel-group"><div class="slot-reel-track"><div class="slot-chip">สาย A</div><div class="slot-chip">สาย B</div><div class="slot-chip">สาย C</div><div class="slot-chip">สาย D</div><div class="slot-chip">สาย A</div><div class="slot-chip">สาย B</div></div></div><div class="slot-reel slot-reel-team"><div class="slot-reel-track"><div class="slot-chip">Golden Lion</div><div class="slot-chip">Wild Cats</div><div class="slot-chip">Blue Shark</div><div class="slot-chip">Peps United</div><div class="slot-chip">Thunder 3x3</div><div class="slot-chip">Sky Runner</div></div></div></div><div class="slot-shine"></div></div>';
    if (mode === 'card') return '<div class="card-visual"><div class="card-fan"><div class="card-suit">♠</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end">♠</div></div><div class="card-fan"><div class="card-suit" style="color:#ff3b30">♥</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end;color:#ff3b30">♥</div></div><div class="card-fan"><div class="card-suit">♣</div><div class="card-center"></div><div class="card-suit" style="align-self:flex-end">♣</div></div></div>';
    if (mode === 'lottery') return '<div class="lottery-visual"><div class="lottery-stand"></div><div class="lottery-base"></div><div class="lottery-cage"><div class="ball-cloud"><div class="ball-mini red">12</div><div class="ball-mini blue">45</div><div class="ball-mini red">08</div><div class="ball-mini blue">67</div><div class="ball-mini red">33</div><div class="ball-mini blue">91</div></div></div></div>';
    if (mode === 'glitch') return '<div class="glitch-visual"><div class="glitch-scanlines"></div><div class="glitch-lines"><div class="glitch-hline" style="--gi:1"></div><div class="glitch-hline" style="--gi:2"></div><div class="glitch-hline" style="--gi:3"></div><div class="glitch-hline" style="--gi:4"></div><div class="glitch-hline" style="--gi:5"></div></div><div class="glitch-text" data-text="SYSTEM">SYSTEM</div><div class="glitch-corner tl"></div><div class="glitch-corner tr"></div><div class="glitch-corner bl"></div><div class="glitch-corner br"></div></div>';
    if (mode === 'galaxy') return '<div class="galaxy-visual"><div class="galaxy-disk"></div><div class="galaxy-arm arm1"></div><div class="galaxy-arm arm2"></div><div class="galaxy-core"></div><div class="galaxy-star" style="--gd:0deg;--gr:40px;--gi:1"></div><div class="galaxy-star" style="--gd:72deg;--gr:60px;--gi:2"></div><div class="galaxy-star" style="--gd:144deg;--gr:80px;--gi:3"></div><div class="galaxy-star" style="--gd:216deg;--gr:50px;--gi:4"></div><div class="galaxy-star" style="--gd:288deg;--gr:70px;--gi:5"></div></div>';
    if (mode === 'crystal') return '<div class="crystal-visual"><div class="crystal-glow-bg"></div><div class="crystal-orb"><div class="crystal-inner"></div><div class="crystal-shine"></div><div class="crystal-spark" style="--ci:1"></div><div class="crystal-spark" style="--ci:2"></div><div class="crystal-spark" style="--ci:3"></div></div><div class="crystal-stand"></div><div class="crystal-base"></div></div>';
    if (mode === 'plasma') return '<div class="plasma-visual"><div class="plasma-ring ring1"></div><div class="plasma-ring ring2"></div><div class="plasma-ring ring3"></div><div class="plasma-core"></div><div class="plasma-arc" style="--pa:0deg"></div><div class="plasma-arc" style="--pa:120deg"></div><div class="plasma-arc" style="--pa:240deg"></div></div>';
    if (mode === 'vortex') return '<div class="vortex-visual"><div class="vortex-tunnel"><div class="vortex-layer" style="--vl:1"></div><div class="vortex-layer" style="--vl:2"></div><div class="vortex-layer" style="--vl:3"></div><div class="vortex-layer" style="--vl:4"></div><div class="vortex-layer" style="--vl:5"></div></div><div class="vortex-eye"></div></div>';
    if (mode === 'winner') return '<div class="winner-visual"><div class="winner-trophy">🏆</div><div class="winner-sparks"></div></div>';
    return '<div class="pl-ring"></div>';
  }

  function drawFxEnhanced(mode) {
    if (mode === 'wheel') return '<div class="wheel-visual"><div class="wheel-rotor"></div><div class="wheel-pointer"></div><div class="wheel-pulse-ring"></div><div class="wheel-dots"><i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i><i style="--i:4"></i><i style="--i:5"></i><i style="--i:6"></i><i style="--i:7"></i></div></div>';
    if (mode === 'slot') return '<div class="slot-visual peps-slot-machine peps-slot-panel"><div class="slot-frame"><div class="slot-reel slot-reel-group"><div class="slot-reel-label">GROUP</div><div class="slot-reel-track"><div class="slot-chip">สาย A</div><div class="slot-chip">สาย B</div><div class="slot-chip">สาย C</div><div class="slot-chip">สาย D</div><div class="slot-chip">สาย A</div><div class="slot-chip">สาย B</div></div></div><div class="slot-reel slot-reel-team"><div class="slot-reel-label">TEAM</div><div class="slot-reel-track"><div class="slot-chip">Golden Lion</div><div class="slot-chip">Wild Cats</div><div class="slot-chip">Blue Shark</div><div class="slot-chip">Peps United</div><div class="slot-chip">Thunder 3x3</div><div class="slot-chip">Sky Runner</div></div></div></div><div class="slot-center-line"></div><div class="slot-shine"></div></div>';
    if (mode === 'card') return '<div class="card-visual peps-card-table"><div class="card-scan"></div><div class="card-orbit"></div><div class="card-fan card-back"><div class="card-code">PL</div><div class="card-pattern">DRAW</div><div class="card-code">24</div></div><div class="card-fan card-live"><div class="card-code">A</div><div class="card-center">?</div><div class="card-code">GROUP</div></div><div class="card-fan card-back"><div class="card-code">PL</div><div class="card-pattern">LIVE</div><div class="card-code">88</div></div><div class="card-shine"></div></div>';
    if (mode === 'lottery') return '<div class="lottery-visual peps-lottery-machine"><div class="lottery-glass"></div><div class="lottery-cage"><div class="ball-cloud"><div class="ball-mini orange">A</div><div class="ball-mini blue">B</div><div class="ball-mini orange">C</div><div class="ball-mini blue">D</div><div class="ball-mini orange">2</div><div class="ball-mini blue">4</div><div class="ball-mini orange">8</div></div></div><div class="lottery-chute"><span></span></div><div class="lottery-stand"></div><div class="lottery-base"></div></div>';
    if (mode === 'glitch') return '<div class="glitch-visual peps-glitch-console"><div class="glitch-scanlines"></div><div class="glitch-grid"></div><div class="glitch-lines"><div class="glitch-hline" style="--gi:1"></div><div class="glitch-hline" style="--gi:2"></div><div class="glitch-hline" style="--gi:3"></div><div class="glitch-hline" style="--gi:4"></div><div class="glitch-hline" style="--gi:5"></div></div><div class="glitch-lock">RANDOMIZE</div><div class="glitch-text" data-text="SYSTEM">SYSTEM</div><div class="glitch-corner tl"></div><div class="glitch-corner tr"></div><div class="glitch-corner bl"></div><div class="glitch-corner br"></div></div>';
    if (mode === 'galaxy') return '<div class="galaxy-visual peps-galaxy-engine"><div class="galaxy-disk"></div><div class="galaxy-arm arm1"></div><div class="galaxy-arm arm2"></div><div class="galaxy-ring ring-a"></div><div class="galaxy-ring ring-b"></div><div class="galaxy-core"></div><div class="galaxy-star" style="--gd:0deg;--gr:42px;--gi:1"></div><div class="galaxy-star" style="--gd:55deg;--gr:67px;--gi:2"></div><div class="galaxy-star" style="--gd:132deg;--gr:86px;--gi:3"></div><div class="galaxy-star" style="--gd:218deg;--gr:58px;--gi:4"></div><div class="galaxy-star" style="--gd:304deg;--gr:78px;--gi:5"></div></div>';
    if (mode === 'crystal') return '<div class="crystal-visual peps-crystal-oracle"><div class="crystal-glow-bg"></div><div class="crystal-orb"><div class="crystal-inner"></div><div class="crystal-prism"></div><div class="crystal-shine"></div><div class="crystal-spark" style="--ci:1"></div><div class="crystal-spark" style="--ci:2"></div><div class="crystal-spark" style="--ci:3"></div><div class="crystal-spark" style="--ci:4"></div></div><div class="crystal-stand"></div><div class="crystal-base"></div></div>';
    if (mode === 'plasma') return '<div class="plasma-visual peps-plasma-reactor"><div class="plasma-field"></div><div class="plasma-ring ring1"></div><div class="plasma-ring ring2"></div><div class="plasma-ring ring3"></div><div class="plasma-core"><div class="plasma-core-inner"></div></div><div class="plasma-arc" style="--pa:0deg;--pi:1"></div><div class="plasma-arc" style="--pa:60deg;--pi:2"></div><div class="plasma-arc" style="--pa:120deg;--pi:3"></div><div class="plasma-arc" style="--pa:180deg;--pi:4"></div><div class="plasma-arc" style="--pa:240deg;--pi:5"></div><div class="plasma-arc" style="--pa:300deg;--pi:6"></div><div class="plasma-particle" style="--ppd:25deg;--ppi:1"></div><div class="plasma-particle" style="--ppd:155deg;--ppi:2"></div><div class="plasma-particle" style="--ppd:278deg;--ppi:3"></div></div>';
    if (mode === 'vortex') return '<div class="vortex-visual peps-vortex-portal"><div class="vortex-ring" style="--vi:1"></div><div class="vortex-ring" style="--vi:2"></div><div class="vortex-ring" style="--vi:3"></div><div class="vortex-ring" style="--vi:4"></div><div class="vortex-ring" style="--vi:5"></div><div class="vortex-ring" style="--vi:6"></div><div class="vortex-center"></div><div class="vortex-particle" style="--vpd:20deg;--vpi:1"></div><div class="vortex-particle" style="--vpd:110deg;--vpi:2"></div><div class="vortex-particle" style="--vpd:210deg;--vpi:3"></div><div class="vortex-particle" style="--vpd:300deg;--vpi:4"></div></div>';
    return '<div class="pl-ring"></div>';
  }
  drawFx = drawFxEnhanced;

  function repeatedFxItems(items, minItems = 12) {
    const cleanItems = (Array.isArray(items) ? items : []).map(v => String(v || '').trim()).filter(Boolean);
    const base = cleanItems.length ? cleanItems : ['-'];
    const target = Math.max(minItems, base.length * 3);
    return Array.from({ length: target }, (_, i) => base[i % base.length]);
  }

  function lotteryBallMarkup(drawState) {
    const groupLetters = letters(drawState?.event?.groupCount || 4);
    const size = groupLetters.length > 14 ? 17 : groupLetters.length > 8 ? 20 : 25;
    const radiusX = groupLetters.length > 10 ? 36 : 34;
    const radiusY = groupLetters.length > 10 ? 27 : 31;
    const center = 43;
    return groupLetters.map((g, i) => {
      const angle = (-Math.PI / 2) + ((Math.PI * 2 * i) / groupLetters.length);
      const left = Math.round(center - (size / 2) + Math.cos(angle) * radiusX);
      const top = Math.round(center - (size / 2) + Math.sin(angle) * radiusY);
      return `<div class="ball-mini ${i % 2 ? 'blue' : 'orange'}" style="left:${left}px;top:${top}px;width:${size}px;height:${size}px;font-size:${Math.max(9, Math.round(size * .43))}px;animation-delay:${(i * .09).toFixed(2)}s">${esc(g)}</div>`;
    }).join('');
  }

  function drawFxRefined(mode, drawState = state) {
    if (mode === 'card') {
      const live = drawState?.drawLive || {};
      const feed = Array.isArray(live.feed) ? live.feed : [];
      const item = live.current || live.pendingItem || feed[0] || { team: 'READY', group: '-', slot: '-' };
      const safeTeam = esc(item.team || 'READY');
      const safeGroup = esc(item.group || '-');
      const safeSlot = esc(item.slot || '-');
      const deckCards = Array.from({ length: 10 }, (_, i) => `<i class="deck-card" style="--ci:${i}"></i>`).join('');
      const flyingCards = Array.from({ length: 8 }, (_, i) => `<i class="shuffle-card" style="--si:${i}"></i>`).join('');
      return `<div class="card-visual peps-card-deck"><div class="card-table-glow"></div><div class="deck-stack">${deckCards}</div><div class="shuffle-stream">${flyingCards}</div><div class="deal-path"></div><div class="reveal-card"><div class="card-code">PL</div><div class="reveal-group" data-card-group>GROUP ${safeGroup}</div><div class="reveal-team" data-card-team>${safeTeam}</div><div class="reveal-slot" data-card-slot>ลำดับ ${safeSlot}</div></div></div>`;
    }
    if (mode === 'slot') {
      const groupItems = repeatedFxItems(letters(drawState?.event?.groupCount || 4), 14).map(g => `<div class="slot-chip">สาย ${esc(g)}</div>`).join('');
      const sourceTeams = Array.isArray(drawState?.teams) && drawState.teams.length ? drawState.teams : ['Golden Lion', 'Wild Cats', 'Blue Shark', 'Peps United', 'Thunder 3x3', 'Sky Runner'];
      const teamItems = repeatedFxItems(sourceTeams.slice(0, Math.max(6, Math.min(10, sourceTeams.length))), 14).map(t => `<div class="slot-chip">${esc(t)}</div>`).join('');
      return `<div class="slot-visual peps-slot-machine peps-slot-panel peps-slot-wide"><div class="slot-frame"><div class="slot-reel slot-reel-group"><div class="slot-reel-label">GROUP</div><div class="slot-reel-track">${groupItems}</div></div><div class="slot-reel slot-reel-team"><div class="slot-reel-label">TEAM</div><div class="slot-reel-track">${teamItems}</div></div></div><div class="slot-center-line"></div><div class="slot-shine"></div></div>`;
    }
    if (mode === 'lottery') {
      const currentGroup = drawState?.drawLive?.current?.group || drawState?.drawLive?.pendingItem?.group || letters(drawState?.event?.groupCount || 4)[0] || 'A';
      return `<div class="lottery-visual peps-lottery-machine peps-lottery-groups"><div class="lottery-glass"></div><div class="lottery-cage"><div class="ball-cloud">${lotteryBallMarkup(drawState)}</div></div><div class="lottery-chute"><span>${esc(currentGroup)}</span></div><div class="lottery-stand"></div><div class="lottery-base"></div></div>`;
    }
    return drawFxEnhanced(mode);
  }
  drawFx = drawFxRefined;

  function sourceModeLabel(mode) {
    return ({
      wheel: 'Wheel Spin',
      slot: 'Slot Reveal',
      card: 'Card Draw',
      lottery: 'Lottery Ball',
      glitch: 'Glitch Cyber',
      galaxy: 'Galaxy Spiral',
      crystal: 'Crystal Oracle',
      plasma: 'Plasma Arc',
      vortex: 'Vortex Portal'
    })[mode] || mode;
  }

  function renderGroups() {
    setDrawTextSizeVars(drawTextSizes());
    const box = $('#groupResult');
    if (!box) return;
    const displayGroups = getDisplayGroups(false);
    const draft = manualGroupsEditing ? ensureManualGroupsDraft(displayGroups) : null;
    const groups = draft ? draft.groups : displayGroups;
    const keys = Object.keys(groups).length ? Object.keys(groups).sort() : letters(state.event.groupCount);
    const maxRows = manualGroupsEditing ? draft.rows : Math.max(1, ...keys.map(g => (groups[g] || []).length), Math.ceil(Math.max(1, state.teams.length) / Math.max(1, keys.length)));
    const cols = effectiveGroupColumns(state.settings.groupColumns || 4, box.clientWidth || window.innerWidth);

    box.innerHTML = `
      ${renderManualGroupsToolbar()}
      ${manualGroupsEditing ? renderManualGroupsEditor(groups, keys, maxRows) : `
      <div class="pl-groups-grid" style="${textSizeVarsStyle(drawTextSizes())};--group-cols:${cols};grid-template-columns:repeat(${cols},minmax(0,1fr));">
        ${keys.map(g => `
          <div class="pl-group-card">
            <div class="pl-group-title" style="font-size:var(--group-title-fs,14px)!important"><span>สาย ${esc(g)}</span><span>${(groups[g] || []).filter(isRealTeamName).length} ทีม</span></div>
            ${Array.from({ length: rowsForGroup(groups, g, maxRows) }, (_, i) => {
              const team = (groups[g] || [])[i] || '';
              return `<div class="pl-group-row ${team ? '' : 'empty'}"><span class="no">${i + 1}</span><span class="team" style="font-size:var(--group-team-fs,14px)!important">${esc(team || 'รอผลสุ่ม')}</span></div>`;
            }).join('')}
          </div>
        `).join('')}
      </div>
      `}
    `;
    bindManualGroupsToolbar();
  }

  function renderRevealFeed() {
    const box = $('#revealFeed');
    if (!box) return;
    const feed = state.drawLive?.feed || [];
    if (!feed.length) {
      box.innerHTML = '<div class="notice">Reveal Feed ยังว่างอยู่</div>';
      return;
    }
    const recent = feed.slice(0, 6);
    box.innerHTML = `
      <div class="feed-head"><span>ผลล่าสุด</span><b>${feed.length} รายการ</b></div>
      <div class="feed-list">${recent.map(item => `<div class="feed-item"><span>สาย ${esc(item.group)} · ${esc(item.slot)}</span><b>${esc(item.team)}</b></div>`).join('')}</div>
      ${feed.length > recent.length ? `
        <details class="advanced-details feed-history">
          <summary>ดูประวัติทั้งหมด ${feed.length} รายการ</summary>
          <div class="feed-list">${feed.slice(recent.length).map(item => `<div class="feed-item"><span>สาย ${esc(item.group)} · ${esc(item.slot)}</span><b>${esc(item.team)}</b></div>`).join('')}</div>
        </details>
      ` : ''}
    `;
  }

  function renderSchedule() {
    const box = $('#scheduleBox');
    if (!box) return;
    syncScheduleToolState();
    if (scheduleEditing) {
      box.innerHTML = renderScheduleEditorRows();
      return;
    }
    if (!state.matches.length) {
      box.innerHTML = `<div class="notice">ยังไม่มีตารางแข่ง</div>${renderKnockoutPreviewHtml()}`;
      renderScheduleWarnings();
      return;
    }
    const groups = [...new Set(state.matches.map((match) => String(match.group || '')).filter(Boolean))].sort();
    const courts = [...new Set(state.matches.map((match) => String(match.court || '')).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
    const completed = groupStageProgress().done;
    box.innerHTML = `
      <div class="list-toolbar">
        <div class="toolbar-summary"><span>ตารางรอบแบ่งกลุ่ม</span><b><span id="scheduleVisibleCount">${state.matches.length}</span> / ${state.matches.length} คู่</b><small>จบแล้ว ${completed} คู่</small></div>
        <div class="toolbar-controls">
          <label><span>สาย</span><select data-schedule-filter-group><option value="all">ทุกสาย</option>${groups.map((group) => `<option value="${esc(group)}" ${scheduleFilterGroup === group ? 'selected' : ''}>สาย ${esc(group)}</option>`).join('')}</select></label>
          <label><span>สนาม</span><select data-schedule-filter-court><option value="all">ทุกสนาม</option>${courts.map((court) => `<option value="${esc(court)}" ${scheduleFilterCourt === court ? 'selected' : ''}>สนาม ${esc(court)}</option>`).join('')}</select></label>
          <label><span>สถานะ</span><select data-schedule-filter-status>
            <option value="all" ${scheduleFilterStatus === 'all' ? 'selected' : ''}>ทั้งหมด</option>
            <option value="open" ${scheduleFilterStatus === 'open' ? 'selected' : ''}>ยังไม่จบ</option>
            <option value="done" ${scheduleFilterStatus === 'done' ? 'selected' : ''}>จบแล้ว</option>
            <option value="live" ${scheduleFilterStatus === 'live' ? 'selected' : ''}>กำลังแข่ง</option>
          </select></label>
          <label class="toolbar-search"><span>ค้นหา</span><input data-schedule-search value="${esc(scheduleSearch)}" placeholder="ชื่อทีม เวลา หรือสนาม" /></label>
        </div>
      </div>
      <div class="tablewrap schedule-table"><table><thead><tr><th>เวลา</th><th>สนาม</th><th>สาย</th><th>ทีม A</th><th>ทีม B</th><th>สถานะ</th></tr></thead>
      <tbody>${state.matches.map(m => `
        <tr data-schedule-row data-filter-group="${esc(m.group)}" data-filter-court="${esc(m.court)}" data-filter-status="${esc(statusBucket(m.status))}" data-filter-search="${esc(`${m.time} ${m.court} ${m.group} ${m.teamA} ${m.teamB}`.toLowerCase())}">
          <td><b>${esc(m.time || '-')}</b></td><td>${esc(m.court || '-')}</td><td>${esc(m.group || '-')}</td><td>${esc(m.teamA)}</td><td>${esc(m.teamB)}</td><td><span class="status-badge ${esc(statusBucket(m.status))}">${esc(m.status || 'Pending')}</span></td>
        </tr>
      `).join('')}</tbody></table></div>
      <div id="scheduleFilterEmpty" class="notice hidden">ไม่พบคู่แข่งตามตัวกรองนี้</div>
      ${renderKnockoutPreviewHtml()}
    `;
    applyScheduleFilters();
    renderScheduleWarnings();
  }

  function renderScores() {
    const box = $('#scoresBox');
    if (!box) return;
    if (!state.matches.length) {
      box.innerHTML = '<div class="notice">ยังไม่มีคู่แข่งขัน</div>';
      return;
    }
    const groups = [...new Set(state.matches.map((match) => String(match.group || '')).filter(Boolean))].sort();
    const progress = groupStageProgress();
    box.innerHTML = `
      <div class="list-toolbar score-toolbar">
        <div class="toolbar-summary"><span>ผลรอบแบ่งกลุ่ม</span><b><span id="scoreVisibleCount">${state.matches.length}</span> / ${state.matches.length} คู่</b><small>คงเหลือ ${progress.pending} คู่</small></div>
        <div class="toolbar-controls">
          <label><span>สาย</span><select data-score-filter-group><option value="all">ทุกสาย</option>${groups.map((group) => `<option value="${esc(group)}" ${scoreFilterGroup === group ? 'selected' : ''}>สาย ${esc(group)}</option>`).join('')}</select></label>
          <label><span>สถานะ</span><select data-score-filter-status>
            <option value="all" ${scoreFilterStatus === 'all' ? 'selected' : ''}>ทั้งหมด</option>
            <option value="open" ${scoreFilterStatus === 'open' ? 'selected' : ''}>ยังไม่จบ</option>
            <option value="done" ${scoreFilterStatus === 'done' ? 'selected' : ''}>จบแล้ว</option>
            <option value="live" ${scoreFilterStatus === 'live' ? 'selected' : ''}>กำลังแข่ง</option>
          </select></label>
          <label class="toolbar-search"><span>ค้นหาทีม</span><input data-score-search value="${esc(scoreSearch)}" placeholder="พิมพ์ชื่อทีม" /></label>
        </div>
      </div>
      <div class="score-list">
        ${state.matches.map(m => `
          <div class="score-row" data-match-id="${esc(m.id)}" data-filter-group="${esc(m.group)}" data-filter-search="${esc(`${m.teamA} ${m.teamB} ${m.time} ${m.court}`.toLowerCase())}">
            <div class="score-meta"><b>${esc(m.time || '-')}</b><span>สนาม ${esc(m.court || '-')} · สาย ${esc(m.group || '-')}</span></div>
            <span class="score-team team-a">${esc(m.teamA)}</span>
            <input data-score-a type="number" min="0" value="${esc(m.scoreA)}" placeholder="0" aria-label="คะแนน ${esc(m.teamA)}">
            <span class="score-separator">:</span>
            <input data-score-b type="number" min="0" value="${esc(m.scoreB)}" placeholder="0" aria-label="คะแนน ${esc(m.teamB)}">
            <span class="score-team team-b">${esc(m.teamB)}</span>
            <select data-status aria-label="สถานะคู่ ${esc(m.teamA)} พบ ${esc(m.teamB)}">
              ${['Pending', 'Live', 'Finished', 'Bye', 'Forfeit A', 'Forfeit B'].map(s => `<option ${(m.status === s || (s === 'Finished' && m.status === 'Done')) ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        `).join('')}
      </div>
      <div id="scoreFilterEmpty" class="notice hidden">ไม่พบคู่แข่งตามตัวกรองนี้</div>
    `;
    applyScoreFilters();
  }

  function statusBucket(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'live') return 'live';
    if (['done', 'finished', 'bye', 'forfeit a', 'forfeit b'].includes(value)) return 'done';
    return 'open';
  }

  function applyScheduleFilters() {
    const query = scheduleSearch.trim().toLowerCase();
    let visible = 0;
    $$('[data-schedule-row]').forEach((row) => {
      const match = (scheduleFilterGroup === 'all' || row.dataset.filterGroup === scheduleFilterGroup)
        && (scheduleFilterCourt === 'all' || row.dataset.filterCourt === scheduleFilterCourt)
        && (scheduleFilterStatus === 'all' || row.dataset.filterStatus === scheduleFilterStatus)
        && (!query || (row.dataset.filterSearch || '').includes(query));
      row.hidden = !match;
      if (match) visible += 1;
    });
    setText($('#scheduleVisibleCount'), visible);
    $('#scheduleFilterEmpty')?.classList.toggle('hidden', visible > 0);
  }

  function applyScoreFilters() {
    const query = scoreSearch.trim().toLowerCase();
    let visible = 0;
    $$('#scoresBox .score-row').forEach((row) => {
      const status = statusBucket(row.querySelector('[data-status]')?.value);
      const match = (scoreFilterGroup === 'all' || row.dataset.filterGroup === scoreFilterGroup)
        && (scoreFilterStatus === 'all' || status === scoreFilterStatus)
        && (!query || (row.dataset.filterSearch || '').includes(query));
      row.hidden = !match;
      if (match) visible += 1;
    });
    setText($('#scoreVisibleCount'), visible);
    $('#scoreFilterEmpty')?.classList.toggle('hidden', visible > 0);
  }

  function renderScheduleWarnings() {
    const box = $('#restWarnings');
    if (!box) return;
    const warnings = scheduleWarnings();
    if (!state.matches.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = warnings.length
      ? `<div class="notice warn"><b>ควรตรวจตาราง ${warnings.length} จุด</b><div class="warning-list">${warnings.slice(0, 6).map((warning) => `<span>${esc(warning)}</span>`).join('')}</div></div>`
      : '<div class="notice good compact-notice">ตรวจแล้ว: ไม่พบทีมแข่งชนเวลา สนามซ้ำ หรือแข่งติด slot</div>';
  }

  function scheduleWarnings() {
    const warnings = [];
    const realMatches = (state.matches || []).filter(isRealGroupMatch);
    const occupied = new Map();
    realMatches.forEach((match) => {
      if (!match.time || !match.court) return;
      const key = `${match.time}|${match.court}`;
      if (occupied.has(key)) warnings.push(`${match.time} สนาม ${match.court} มีมากกว่า 1 คู่`);
      occupied.set(key, true);
    });

    const byTeam = new Map();
    realMatches.forEach((match) => {
      [match.teamA, match.teamB].forEach((team) => {
        if (!byTeam.has(team)) byTeam.set(team, []);
        byTeam.get(team).push(match);
      });
    });
    const interval = intClamp(state.event.matchInterval, 1, 240, 15);
    byTeam.forEach((matches, team) => {
      matches.sort((a, b) => (scheduleMinutes(a.time) ?? 99999) - (scheduleMinutes(b.time) ?? 99999));
      for (let index = 1; index < matches.length; index += 1) {
        const previous = matches[index - 1];
        const current = matches[index];
        const previousTime = scheduleMinutes(previous.time);
        const currentTime = scheduleMinutes(current.time);
        if (previousTime == null || currentTime == null) continue;
        const gap = currentTime - previousTime;
        if (gap <= interval) warnings.push(`${team} แข่งติดกัน ${previous.time} → ${current.time}`);
      }
    });
    return [...new Set(warnings)];
  }

  function scheduleMinutes(value) {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) return null;
    return (hours * 60) + minutes;
  }

  function renderStandings() {
    const box = $('#standingsBox');
    if (!box) return;
    calculateStandings();
    const groups = Object.keys(state.standings || {}).sort();
    if (!groups.length) {
      box.innerHTML = '<div class="notice">ยังไม่มีตารางคะแนน</div>';
      return;
    }
    box.innerHTML = groups.map(g => `
      <h3>สาย ${esc(g)}</h3>
      <div class="tablewrap"><table><thead><tr><th>#</th><th>ทีม</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr></thead>
      <tbody>${sortedStandings(state.standings[g]).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.team)}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}</td><td>${r.GA}</td><td>${r.GD}</td><td><b>${r.PTS}</b></td></tr>`).join('')}</tbody></table></div>
    `).join('') + renderKnockoutPreviewHtml();
  }

  function renderOverrides() {
    const box = $('#overrideBox');
    if (!box) return;
    calculateStandings();
    const groups = Object.keys(state.standings || {}).sort();
    box.innerHTML = groups.length
      ? groups.map(g => `<div class="notice">สาย ${esc(g)}: ${sortedStandings(state.standings[g]).slice(0, state.event.qualifiersPerGroup).map(r => esc(r.team)).join(', ')}</div>`).join('')
      : '<div class="notice">ยังไม่มีอันดับจากรอบแบ่งกลุ่ม</div>';
  }

  function renderKnockout() {
    const box = $('#knockoutBox');
    if (!box) return;
    const actual = state.knockout.length
      ? `<div class="grid two">${state.knockout.map(match => `
          <div class="card compact"><h3>${esc(match.round)} · ${esc(match.id)}</h3>
          <p>${esc(match.teamA)} vs ${esc(match.teamB)}</p>
          ${match.winner ? `<p class="hint">${match.status === 'Bye' ? 'ผ่านอัตโนมัติ' : 'ผู้ชนะ'} · ${esc(match.winner)}</p>` : ''}
          </div>`).join('')}</div>`
      : '<div class="notice">ยังไม่มีสาย Knockout ที่บันทึกไว้</div>';
    const progress = groupStageProgress();
    const plan = buildKnockoutPreviewPlan({ progress });
    const changed = state.knockout.length && knockoutDrawSignature(plan) !== knockoutDrawSignature(state.knockout);
    const notice = changed
      ? '<div class="notice warn">ผังที่บันทึกไว้ต่างจาก Preview ปัจจุบัน ตรวจอันดับหรือผลรอบกลุ่มก่อนกดอัปเดต Knockout</div>'
      : '';
    box.innerHTML = notice + actual + renderKnockoutPreviewHtml(progress, plan);
  }

  function renderSourceCards() {
    const root = $('#sourceCards');
    if (!root) return;

    const remote = `
      <div class="source-section remote-source-section">
        <h3>Mobile Remote · สั่งหมุนวงล้อ</h3>
        ${remoteControlCardHtml()}
      </div>
    `;

    const draw = `
      <div class="source-section peps-source-section-clean">
        <h3>Draw Animation Source · OBS</h3>
        <div class="source-grid-core single">
          ${sourceCardHtml('draw-animation')}
        </div>
      </div>
    `;

    const live = `
      <div class="source-section peps-source-section-clean">
        <h3>Live Data Sources · OBS</h3>
        <div class="source-grid-core">
          ${SOURCES.filter(([id]) => id !== 'draw-animation').map(([id]) => sourceCardHtml(id)).join('')}
        </div>
      </div>
    `;

    root.className = 'grid three peps-source-holder-clean';
    root.innerHTML = remote + draw + live;
  }

  function remoteControlCardHtml() {
    const info = window.PeppsRemoteBridge?.getInfo?.() || null;
    let qrSrc = '';
    try {
      if (info?.qrUrl) qrSrc = new URL(info.qrUrl, window.location.href).toString();
    } catch {}
    const remoteUrl = info?.remoteUrl || '';
    const remoteStatus = info?.remoteUrl
      ? `พร้อมใช้ · LAN ${info.lanIp}:${info.port}`
      : 'กำลังเชื่อมต่อ...';
    const remoteState = info?.remoteUrl ? 'ready' : 'checking';
    return `
      <div class="remote-control-card" id="remoteControlCard">
        <div class="remote-control-head">
          <div>
            <h3>Remote มือถือ</h3>
            <p>มือถือทำได้เฉพาะ <b>หมุนวงล้อ</b> ไม่สามารถแก้รายชื่อหรือคะแนนได้</p>
          </div>
          <span class="remote-status-pill" data-remote-status data-state="${remoteState}">${esc(remoteStatus)}</span>
        </div>
        <div class="remote-control-body">
          <div class="remote-qr-frame">
            <img data-remote-qr alt="QR สำหรับเปิด Mobile Remote" ${qrSrc ? `src="${esc(qrSrc)}"` : ''} ${qrSrc ? '' : 'hidden'} />
            <div class="remote-qr-empty" data-remote-qr-empty ${qrSrc ? 'hidden' : ''}>รอ Local Server</div>
          </div>
          <div class="remote-control-details">
            <div class="remote-url" data-remote-url>${esc(remoteUrl || 'กำลังรอ Local Server...')}</div>
            <p>สแกน QR ด้วยมือถือที่อยู่ Wi‑Fi เดียวกับคอมเครื่องหลัก</p>
            <div class="row">
              <button class="btn primary" type="button" data-remote-copy ${remoteUrl ? '' : 'disabled'}>คัดลอกลิงก์มือถือ</button>
              <button class="btn" type="button" data-remote-rotate ${remoteUrl ? '' : 'disabled'}>สร้าง QR ใหม่</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function sourceCardHtml(id) {
    const meta = SOURCE_META[id] || { title: id, desc: '' };
    return `
      <div class="source-card peps-source-card-clean">
        <h3>${esc(meta.title)}</h3>
        <p>${esc(meta.desc)}</p>
        <div class="row">
          <button class="btn primary small" type="button" data-copy-source="${esc(id)}">คัดลอกลิงก์</button>
          <button class="btn small" type="button" data-preview-source="${esc(id)}">เปิดตัวอย่าง</button>
          <button class="btn small" type="button" data-open-source="${esc(id)}">รายละเอียด</button>
        </div>
        <div class="source-url">${esc(sourceUrl(id))}</div>
      </div>
    `;
  }

  function openSourceModal(id) {
    modalSource = normalizeSourceView(id);
    const meta = SOURCE_META[modalSource] || { title: modalSource, desc: '' };
    setText($('#modalTitle'), meta.title);
    setText($('#modalDesc'), meta.desc);
    setText($('#modalUrl'), sourceUrl(modalSource));
    $('#sourceModal')?.classList.add('open');
  }

  function renderExcelExportPanel() {
    const panel = $('[data-panel="export"]');
    if (!panel) return;
    let box = $('#excelExportBox');
    if (!box) {
      box = document.createElement('section');
      box.id = 'excelExportBox';
      box.className = 'card';
      const grid = panel.querySelector('.grid.two');
      if (grid) grid.insertAdjacentElement('beforebegin', box);
      else panel.appendChild(box);
    }

    const groups = getDisplayGroups(true);
    const groupCount = Object.keys(groups).length;
    const teamCount = Object.values(groups).flat().filter(Boolean).length;
    const matchCount = state.matches.length;
    box.innerHTML = `
      <h3>Excel Export</h3>
      <p class="hint">ดาวน์โหลดเป็นไฟล์ .xlsx สำหรับนำไปใช้ต่อใน Excel, Google Sheets หรือส่งให้ทีมงาน พร้อม sheet Knockout Preview ในไฟล์ตารางแข่ง</p>
      <div class="grid three">
        <button class="btn primary" type="button" data-excel-export="groups">Download Groups Excel</button>
        <button class="btn primary" type="button" data-excel-export="schedule">Download Schedule Excel</button>
        <button class="btn" type="button" data-excel-export="all">Download Groups + Schedule</button>
      </div>
      <div id="excelStatus" class="notice">พร้อม Export: ${groupCount} กลุ่ม / ${teamCount} ทีม / ${matchCount} คู่แข่ง</div>
    `;
  }

  function renderDebug() {
    const box = $('#debugState');
    if (box) box.textContent = JSON.stringify(state, null, 2);
  }

  function renderSource(view) {
    view = normalizeSourceView(view);
    injectSourceCss();
    const sourceBackground = state.settings?.sourceBg === 'green'
      ? '#00b140'
      : state.settings?.sourceBg === 'transparent'
        ? 'transparent'
        : '#061426';
    const sourceOpacity = Math.max(.35, Math.min(1, Number(state.settings?.sourceOpacity ?? .90) || .90));

    document.documentElement.classList.add('source-mode');
    document.body.classList.add('source-mode-body');
    document.documentElement.style.setProperty('--source-page-bg', sourceBackground);
    document.documentElement.style.setProperty('--source-opacity', sourceOpacity.toFixed(2));
    document.documentElement.style.setProperty('background', sourceBackground, 'important');
    document.documentElement.style.setProperty('background-image', 'none', 'important');
    document.body.style.setProperty('background', sourceBackground, 'important');
    document.body.style.setProperty('background-image', 'none', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');
    $('#app')?.classList.add('hidden');

    const root = $('#sourceRoot') || document.body.appendChild(document.createElement('div'));
    root.id = 'sourceRoot';
    root.classList.remove('hidden');
    root.className = `source-root source-view-${view}`;
    root.style.background = 'transparent';
    root.style.backgroundImage = 'none';

    if (!OBS_SOURCE_VIEWS.includes(view)) {
      root.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center;color:#fff8ed;font-family:Prompt,system-ui,sans-serif"><div><h1 style="margin:0 0 10px">OBS Source นี้ถูกปิดใช้งานแล้ว</h1><p style="margin:0;color:#e2bf8e">ใช้ Draw Animation Source หรือ Groups Table จากหน้า Live Sources</p></div></div>`;
      return;
    }

    let lastHash = '';

    const buildHash = () => {
      const live = state.drawLive || {};
      if (view === 'draw-animation') {
        return JSON.stringify({
          view,
          mode: state.settings.drawAnimation,
          waiting: !!live.waiting,
          current: live.current,
          pendingItem: live.pendingItem,
          feed0: (live.feed || [])[0],
          progress: live.progress,
          total: live.total,
          textSizes: drawTextSizes(),
          tick: live.waiting ? Math.floor(Date.now() / 110) : 0
        });
      }

      if (view === 'groups') {
        return JSON.stringify({
          view,
          groups: state.groups,
          pendingGroups: state.pendingGroups,
          method: state.settings.drawMethod,
          pendingComplete: state.pendingComplete,
          feed: state.drawLive?.feed || [],
          groupCount: state.event.groupCount,
          groupColumns: state.settings.groupColumns,
          eventName: state.event.name,
          textSizes: drawTextSizes()
        });
      }

      return JSON.stringify({
        view,
        eventName: state.event.name,
        matches: state.matches,
        standings: state.standings,
        knockout: state.knockout,
        lastResult: state.lastResult
      });
    };

    const draw = () => {
      if (view === 'draw-animation') renderDrawSource(root);
      else if (view === 'groups') renderGroupsSource(root);
      else if (view === 'schedule') renderScheduleSource(root);
      else if (view === 'standings') renderStandingsSource(root);
      else if (view === 'knockout') renderKnockoutSource(root);
      else renderSimpleSource(root, view);
    };

    const tick = () => {
      state = loadState();
      setDrawTextSizeVars(drawTextSizes());
      const hash = buildHash();

      if (hash !== lastHash) {
        lastHash = hash;
        draw();
      }

      const previewActive = !!readDrawTextPreview();
      const fast = view === 'draw-animation' || previewActive || !!state.drawLive?.waiting;
      setTimeout(tick, fast ? 110 : 650);
    };

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY || e.key === DRAW_TEXT_PREVIEW_KEY) {
        state = loadState();
        setDrawTextSizeVars(drawTextSizes());
        lastHash = '';
        draw();
      }
    });

    tick();
  }

  function renderDrawSource(root) {
    root.innerHTML = `<div class="pl-anim-source">${drawVisualHtml('source')}</div>`;
  }

  function renderGroupsSource(root) {
    setDrawTextSizeVars(drawTextSizes());
    const groups = getDisplayGroups(false);
    const keys = Object.keys(groups).length ? Object.keys(groups).sort() : letters(state.event.groupCount);
    const maxRows = Math.max(1, ...keys.map(g => (groups[g] || []).length), Math.ceil(Math.max(1, state.teams.length) / Math.max(1, keys.length)));
    const cols = effectiveGroupColumns(state.settings.groupColumns || 4, Math.min(1500, window.innerWidth * 0.96));
    const sizeVars = textSizeVarsStyle(drawTextSizes());
    root.innerHTML = `
      <div class="pl-groups-source" style="${sizeVars}">
        <div class="pl-groups-board" style="${sizeVars}">
          <div class="pl-groups-head"><div><h1>${esc(state.event.name || 'PepsLive Tournament')}</h1><p>Groups Table · แสดงตาม Reveal Feed / Confirm Result</p></div></div>
          <div class="pl-groups-grid" style="grid-template-columns:repeat(${cols}, minmax(180px, 1fr));">
            ${keys.map(g => `<div class="pl-group-card"><div class="pl-group-title" style="font-size:var(--group-title-fs,14px)!important"><span>สาย ${esc(g)}</span><span>${(groups[g] || []).filter(isRealTeamName).length} ทีม</span></div>
              ${Array.from({ length: rowsForGroup(groups, g, maxRows) }, (_, i) => {
                const team = (groups[g] || [])[i] || '';
                return `<div class="pl-group-row ${team ? '' : 'empty'}"><span class="no">${i + 1}</span><span class="team" style="font-size:var(--group-team-fs,14px)!important">${esc(team || 'รอผลสุ่ม')}</span></div>`;
              }).join('')}
            </div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderScheduleSource(root) {
    root.innerHTML = sourceBoard('Schedule Table', state.matches.length
      ? `<table><thead><tr><th>เวลา</th><th>สนาม</th><th>สาย</th><th>คู่แข่งขัน</th></tr></thead><tbody>${state.matches.map(m => `<tr><td>${esc(m.time)}</td><td>${esc(m.court)}</td><td>${esc(m.group)}</td><td>${esc(m.teamA)} vs ${esc(m.teamB)}</td></tr>`).join('')}</tbody></table>`
      : '<div class="empty-source">ยังไม่มีตารางแข่ง</div>');
  }

  function renderStandingsSource(root) {
    calculateStandings();
    const groups = Object.keys(state.standings || {}).sort();
    root.innerHTML = sourceBoard('Standings Table', groups.map(g => `
      <h2>สาย ${esc(g)}</h2>
      <table><tbody>${sortedStandings(state.standings[g]).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.team)}</td><td>${r.PTS}</td></tr>`).join('')}</tbody></table>
    `).join('') || '<div class="empty-source">ยังไม่มีตารางคะแนน</div>');
  }

  function renderKnockoutSource(root) {
    root.innerHTML = sourceBoard('Knockout Bracket', state.knockout.length
      ? state.knockout.map(m => `<div class="notice">${esc(m.round)} · ${esc(m.teamA)} vs ${esc(m.teamB)}</div>`).join('')
      : '<div class="empty-source">ยังไม่มี Knockout</div>');
  }

  function renderSimpleSource(root, view) {
    const title = SOURCE_META[view]?.title || view;
    const text = state.lastResult?.text || 'ยังไม่มีข้อมูลล่าสุด';
    root.innerHTML = `<div class="pl-anim-source"><div class="pl-anim-core"><div class="pl-anim-name">${esc(title)}</div><div class="pl-anim-meta">${esc(text)}</div></div></div>`;
  }

  function sourceBoard(title, body) {
    return `<div class="pl-groups-source"><div class="pl-groups-board"><div class="pl-groups-head"><div><h1>${esc(title)}</h1><p>${esc(state.event.name || '')}</p></div></div>${body}</div></div>`;
  }

  function updateRangeSetting(key, value, min, max, outputId) {
    state.settings[key] = intClamp(value, min, max, state.settings[key]);
    setText($('#' + outputId), state.settings[key]);
    applyLayoutSettings();
    scheduleSave(key);
  }

  function applyLayoutSettings() {
    document.documentElement.style.setProperty('--sidebar-w', `${state.settings.sidebarWidth || 284}px`);
    document.documentElement.style.setProperty('--app-max', `${state.settings.appMaxWidth || 1280}px`);
    document.documentElement.style.setProperty('--draw-stage-h', `${state.settings.drawStageHeight || 420}px`);
    document.documentElement.style.setProperty('--group-cols', `${intClamp(state.settings.groupColumns || 4, 1, 10, 4)}`);
    setDrawTextSizeVars(drawTextSizes());
    document.body.dataset.density = state.settings.uiDensity || 'comfortable';
    document.body.dataset.drawPanel = state.settings.drawPanelMode || 'normal';
  }

  function toggleDrawExpand() {
    let overlay = $('#drawExpandOverlay');
    if (overlay) {
      closeDrawOverlay();
      return;
    }

    overlay = document.createElement('div');
    overlay.id = 'drawExpandOverlay';
    overlay.className = 'draw-expand-overlay';
    overlay.innerHTML = `
      <div class="draw-overlay-stage">${drawVisualHtml('overlay')}</div>
      <button type="button" class="draw-overlay-close" aria-label="Close expanded draw">ESC / ปิด</button>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('draw-expanded-active');

    on($('.draw-overlay-close', overlay), 'click', closeDrawOverlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDrawOverlay();
    });
  }

  function closeDrawOverlay() {
    $('#drawExpandOverlay')?.remove();
    document.body.classList.remove('draw-expanded-active');
    $('#drawStage')?.classList.remove('expanded');
  }

  function resetLayoutSettings() {
    Object.assign(state.settings, {
      sidebarWidth: 284,
      appMaxWidth: 1280,
      drawStageHeight: 420,
      drawPanelMode: 'normal',
      uiDensity: 'comfortable'
    });
    fillForms();
    saveState('reset-layout');
  }

  function saveWebhookFromForm() {
    state.webhook.url = $('#webhookUrl')?.value.trim() || '';
    state.webhook.token = $('#webhookToken')?.value.trim() || '';
    state.webhook.sheetId = $('#sheetId')?.value.trim() || '';
    saveState('webhook');
  }

  async function sendWebhook(testOnly = false) {
    saveWebhookFromForm();
    const status = $('#sheetStatus');
    if (!state.webhook.url) {
      if (status) status.textContent = 'ยังไม่ได้ใส่ Webhook URL';
      return;
    }
    const payload = {
      test: testOnly,
      token: state.webhook.token,
      sheetId: state.webhook.sheetId,
      event: state.event,
      teams: state.teams,
      groups: state.groups,
      matches: state.matches,
      standings: state.standings,
      knockout: state.knockout
    };
    try {
      const res = await fetch(state.webhook.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (status) status.textContent = testOnly ? 'ส่ง Test แล้ว' : 'ส่งข้อมูลไป Google Sheet แล้ว';
      state.lastResult = { type: 'webhook', text: 'Export Google Sheet แล้ว', at: nowIso() };
      saveState('webhook-send');
    } catch (err) {
      if (status) status.textContent = 'ส่งไม่สำเร็จ: ' + err.message;
    }
  }

  function resetAll() {
    if (!confirm('Reset โปรเจกต์ทั้งหมด?')) return;
    state = defaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    fillForms();
    renderAll(true);
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(state.event.name || 'pepslive').replace(/[^\wก-๙-]+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function loadJsonFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = merge(defaultState(), JSON.parse(reader.result));
        saveState('load-json');
        fillForms();
        renderAll(true);
      } catch (err) {
        toast('ไฟล์ JSON ไม่ถูกต้อง', 'warn');
      }
    };
    reader.readAsText(file);
  }

  function exportExcelWorkbook(kind = 'all') {
    const sheets = buildExcelSheets(kind);
    if (!sheets.length) {
      toast('ยังไม่มีข้อมูลสำหรับ Export Excel', 'warn');
      return;
    }

    const blob = buildXlsxBlob(sheets);
    const eventName = state.event.name || 'PepsLive Tournament';
    const suffix = kind === 'groups' ? 'groups' : kind === 'schedule' ? 'schedule' : 'groups_schedule';
    downloadBlob(blob, `${safeFileName(eventName)}_${suffix}.xlsx`);
    const status = $('#excelStatus');
    if (status) status.textContent = `Export Excel แล้ว: ${eventName} (${suffix})`;
    toast('ดาวน์โหลดไฟล์ Excel แล้ว', 'good');
  }

  function buildExcelSheets(kind) {
    const sheets = [excelSheet('Event Info', eventInfoRows())];
    if (kind === 'groups' || kind === 'all') {
      const groups = getDisplayGroups(true);
      sheets.push(excelSheet('Groups', groupRows(groups)));
      Object.keys(groups).sort().forEach((group) => {
        sheets.push(excelSheet(`Group ${group}`, singleGroupRows(group, groups[group] || [])));
      });
    }
    if (kind === 'schedule' || kind === 'all') {
      sheets.push(excelSheet('Schedule', scheduleRows()));
      sheets.push(excelSheet('Knockout Preview', knockoutPreviewRows()));
    }
    return sheets;
  }

  function excelSheet(name, rows) {
    return { name: safeSheetName(name), rows: rows.map((row) => row.map((value) => value ?? '')) };
  }

  function eventInfoRows() {
    return [
      ['รายการ', state.event.name || 'PepsLive Tournament'],
      ['ประเภทกีฬา', state.event.sport || ''],
      ['Preset', state.event.preset || ''],
      ['จำนวนกลุ่ม', state.event.groupCount || ''],
      ['จำนวนสนาม', state.event.courtCount || ''],
      ['เวลาเริ่มแข่ง', state.event.startTime || ''],
      ['ระยะห่างแต่ละคู่ (นาที)', state.event.matchInterval || ''],
      ['Exported At', new Date().toLocaleString('th-TH')],
      ['Version', APP_VERSION]
    ];
  }

  function groupRows(groups = getDisplayGroups(true)) {
    const rows = [
      ['รายการ', state.event.name || 'PepsLive Tournament'],
      ['Exported At', new Date().toLocaleString('th-TH')],
      [],
      ['กลุ่ม', 'ลำดับ', 'ทีม', 'BYE']
    ];
    Object.keys(groups || {}).sort().forEach((group) => {
      (groups[group] || []).forEach((team, index) => {
        rows.push([group, index + 1, team || '', team === 'BYE' ? 'YES' : '']);
      });
    });
    return rows;
  }

  function singleGroupRows(group, teams) {
    return [
      ['รายการ', state.event.name || 'PepsLive Tournament'],
      ['กลุ่ม', group],
      ['Exported At', new Date().toLocaleString('th-TH')],
      [],
      ['ลำดับ', 'ทีม', 'BYE'],
      ...(teams || []).map((team, index) => [index + 1, team || '', team === 'BYE' ? 'YES' : ''])
    ];
  }

  function scheduleRows() {
    const rows = [
      ['รายการ', state.event.name || 'PepsLive Tournament'],
      ['Exported At', new Date().toLocaleString('th-TH')],
      [],
      ['ลำดับ', 'เวลา', 'สนาม', 'กลุ่ม', 'ทีม A', 'ทีม B', 'สถานะ', 'คะแนน A', 'คะแนน B', 'Match ID']
    ];
    (state.matches || []).forEach((match, index) => {
      rows.push([
        index + 1,
        match.time || match.startTime || '',
        match.court || match.field || '',
        match.group || '',
        match.teamA || '',
        match.teamB || '',
        match.status || 'Pending',
        match.scoreA ?? '',
        match.scoreB ?? '',
        match.id || ''
      ]);
    });
    return rows;
  }

  function knockoutPreviewRows() {
    const plan = buildKnockoutPreviewPlan();
    const rows = [
      ['รายการ', state.event.name || 'PepsLive Tournament'],
      ['Exported At', new Date().toLocaleString('th-TH')],
      ['รูปแบบ', 'Seed preview สำหรับแก้ไขต่อใน Excel'],
      [],
      ['รอบ', 'Match ID', 'Seed A', 'ทีม A ตามอันดับปัจจุบัน', 'ทีม A Draft', 'Seed B', 'ทีม B ตามอันดับปัจจุบัน', 'ทีม B Draft', 'หมายเหตุ']
    ];
    if (!plan.length) {
      rows.push(['', '', 'ยังไม่มีข้อมูล seed', '', '', '', '', '', knockoutSetupIssue() || 'ตรวจชื่อทีมซ้ำในผังสายก่อนจัดคู่']);
      return rows;
    }
    plan.forEach((match) => {
      rows.push([
        match.round,
        match.id,
        match.labelA,
        match.teamA || '',
        match.draftTeamA || '',
        match.labelB,
        match.teamB || '',
        match.draftTeamB || '',
        match.note || ''
      ]);
    });
    return rows;
  }

  function buildXlsxBlob(sheets) {
    const files = {
      '[Content_Types].xml': contentTypesXml(sheets),
      '_rels/.rels': rootRelsXml(),
      'docProps/app.xml': appPropsXml(),
      'docProps/core.xml': corePropsXml(),
      'xl/workbook.xml': workbookXml(sheets),
      'xl/_rels/workbook.xml.rels': workbookRelsXml(sheets),
      'xl/styles.xml': stylesXml()
    };
    sheets.forEach((sheet, index) => {
      files[`xl/worksheets/sheet${index + 1}.xml`] = worksheetXml(sheet.rows);
    });
    return new Blob([zipFiles(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function contentTypesXml(sheets) {
    return xmlHeader() + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  }

  function rootRelsXml() {
    return xmlHeader() + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>';
  }

  function appPropsXml() {
    return xmlHeader() + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>PepsLive Tournament Studio</Application></Properties>';
  }

  function corePropsXml() {
    const now = new Date().toISOString();
    return xmlHeader() + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEsc(state.event.name || 'PepsLive Tournament')}</dc:title><dc:creator>PepsLive Tournament Studio</dc:creator><cp:lastModifiedBy>PepsLive Tournament Studio</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  }

  function workbookXml(sheets) {
    return xmlHeader() + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${xmlEsc(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`;
  }

  function workbookRelsXml(sheets) {
    return xmlHeader() + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  }

  function stylesXml() {
    return xmlHeader() + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }

  function worksheetXml(rows) {
    const colCount = Math.max(1, ...rows.map((row) => row.length));
    const cols = Array.from({ length: colCount }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${i < 2 ? 18 : 28}" customWidth="1"/>`).join('');
    const body = rows.map((row, rIndex) => {
      const cells = row.map((value, cIndex) => cellXml(value, rIndex + 1, cIndex + 1, rIndex === 0 || rIndex === 3 || rIndex === 4));
      return `<row r="${rIndex + 1}">${cells.join('')}</row>`;
    }).join('');
    return xmlHeader() + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`;
  }

  function cellXml(value, row, col, header = false) {
    const ref = `${excelColumn(col)}${row}`;
    const style = header ? ' s="1"' : '';
    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${style}><v>${value}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${style}><is><t>${xmlEsc(value)}</t></is></c>`;
  }

  function zipFiles(files) {
    const encoder = new TextEncoder();
    const entries = Object.entries(files).map(([name, content]) => ({ name, nameBytes: encoder.encode(name), data: encoder.encode(content) }));
    const chunks = [];
    const central = [];
    let offset = 0;
    entries.forEach((entry) => {
      const crc = crc32(entry.data);
      const local = concatBytes([
        le32(0x04034b50), le16(20), le16(0), le16(0), le16(0), le16(0),
        le32(crc), le32(entry.data.length), le32(entry.data.length),
        le16(entry.nameBytes.length), le16(0), entry.nameBytes, entry.data
      ]);
      chunks.push(local);
      central.push(concatBytes([
        le32(0x02014b50), le16(20), le16(20), le16(0), le16(0), le16(0), le16(0),
        le32(crc), le32(entry.data.length), le32(entry.data.length),
        le16(entry.nameBytes.length), le16(0), le16(0), le16(0), le16(0), le32(0), le32(offset), entry.nameBytes
      ]));
      offset += local.length;
    });
    const centralSize = central.reduce((sum, item) => sum + item.length, 0);
    const end = concatBytes([
      le32(0x06054b50), le16(0), le16(0), le16(entries.length), le16(entries.length),
      le32(centralSize), le32(offset), le16(0)
    ]);
    return concatBytes([...chunks, ...central, end]);
  }

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function le16(v) { return new Uint8Array([v & 255, (v >>> 8) & 255]); }
  function le32(v) { return new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]); }
  function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let at = 0;
    parts.forEach((part) => { out.set(part, at); at += part.length; });
    return out;
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 800);
  }

  function xmlHeader() { return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'; }
  function xmlEsc(value) {
    return String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m]));
  }
  function excelColumn(index) {
    let name = '';
    while (index > 0) {
      const mod = (index - 1) % 26;
      name = String.fromCharCode(65 + mod) + name;
      index = Math.floor((index - mod) / 26);
    }
    return name;
  }
  function safeSheetName(name) {
    return String(name || 'Sheet').replace(/[:\\/?*\[\]]/g, ' ').slice(0, 31).trim() || 'Sheet';
  }
  function safeFileName(name) {
    return String(name || 'pepslive').trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_').replace(/\s+/g, '_').slice(0, 80) || 'pepslive';
  }

  function exportText(kind) {
    if (kind === 'draw') return horizontalTableToText(drawCopyTable(getDisplayGroups(true)), 'ยังไม่มีผลแบ่งสาย');
    if (kind === 'schedule') return horizontalTableToText(scheduleCopyTable(), 'ยังไม่มีตารางแข่ง');
    if (kind === 'scores') return horizontalTableToText(scoreCopyTable(), 'ยังไม่มีคู่สำหรับบันทึกผล');
    if (kind === 'standings') return horizontalTableToText(standingsCopyTable(), 'ยังไม่มีตารางคะแนน');
    if (kind === 'knockout') return horizontalTableToText(knockoutCopyTable(), 'ยังไม่มีสาย Knockout');
    if (kind === 'caption') return `${state.event.name}\n\nติดตามผลการแข่งขันและตารางแข่งแบบสด ๆ โดย PepsLive Tournament Studio`;
    if (kind === 'script') return `สวัสดีครับ ตอนนี้เป็นรายการ ${state.event.name} พร้อมเข้าสู่การแข่งขัน`;
    if (kind === 'all') return allCopyText();
    return '';
  }

  function drawCopyTable(groups = getDisplayGroups(true)) {
    const rows = [];
    Object.keys(groups || {}).sort().forEach((group) => {
      (groups[group] || []).forEach((team, index) => {
        rows.push([group, index + 1, team || '', team === 'BYE' ? 'BYE' : 'จับสายแล้ว']);
      });
    });
    return { headers: ['สาย', 'ลำดับ', 'ทีม', 'สถานะ'], rows };
  }

  function scheduleCopyTable() {
    return {
      headers: ['เวลา', 'สนาม', 'สาย', 'ทีม A', 'ทีม B'],
      rows: (state.matches || []).map((match) => [
        match.time || match.startTime || '',
        match.court || match.field || '',
        match.group || '',
        match.teamA || '',
        match.teamB || ''
      ])
    };
  }

  function scoreCopyTable() {
    return {
      headers: ['เวลา', 'สนาม', 'สาย', 'ทีม A', 'คะแนน A', 'ทีม B', 'คะแนน B', 'สถานะ'],
      rows: (state.matches || []).map((match) => [
        match.time || match.startTime || '',
        match.court || match.field || '',
        match.group || '',
        match.teamA || '',
        match.scoreA ?? '',
        match.teamB || '',
        match.scoreB ?? '',
        match.status || 'Pending'
      ])
    };
  }

  function standingsCopyTable() {
    calculateStandings();
    const rows = [];
    Object.keys(state.standings || {}).sort().forEach((group) => {
      sortedStandings(state.standings[group]).forEach((row, index) => {
        rows.push([
          group,
          index + 1,
          row.team || '',
          row.P ?? 0,
          row.W ?? 0,
          row.D ?? 0,
          row.L ?? 0,
          row.GF ?? 0,
          row.GA ?? 0,
          row.GD ?? 0,
          row.PTS ?? 0
        ]);
      });
    });
    return { headers: ['สาย', 'อันดับ', 'ทีม', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'PTS'], rows };
  }

  function knockoutCopyTable() {
    return {
      headers: ['รอบ', 'Match ID', 'ทีม A', 'คะแนน A', 'ทีม B', 'คะแนน B', 'สถานะ', 'ผู้ชนะ'],
      rows: (state.knockout || []).map((match) => [
        match.round || '',
        match.id || '',
        match.teamA || '',
        match.scoreA ?? '',
        match.teamB || '',
        match.scoreB ?? '',
        match.status || 'Pending',
        match.winner || ''
      ])
    };
  }

  function tsvText(rows) {
    return (rows || []).map((row) => (row || []).map(clipboardCell).join('\t')).join('\n');
  }

  function clipboardCell(value) {
    return String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();
  }

  function horizontalTableToText(table, emptyLabel = 'ยังไม่มีข้อมูล') {
    const headers = table?.headers || [];
    const rows = table?.rows?.length
      ? table.rows
      : [[emptyLabel, ...Array(Math.max(0, headers.length - 1)).fill('')]];
    return tsvText([headers, ...rows]);
  }

  function allCopyText() {
    const sections = [
      ['ผลแบ่งสาย', drawCopyTable(getDisplayGroups(true)), 'ยังไม่มีผลแบ่งสาย'],
      ['ตารางแข่ง', scheduleCopyTable(), 'ยังไม่มีตารางแข่ง'],
      ['ผลคะแนน', scoreCopyTable(), 'ยังไม่มีคู่สำหรับบันทึกผล'],
      ['ตารางอันดับ', standingsCopyTable(), 'ยังไม่มีตารางคะแนน'],
      ['Knockout', knockoutCopyTable(), 'ยังไม่มีสาย Knockout']
    ];
    const rows = [];
    sections.forEach(([title, table, emptyLabel], index) => {
      if (index > 0) rows.push(['', '']);
      rows.push([title, '']);
      rows.push(table.headers);
      const tableRows = table.rows?.length
        ? table.rows
        : [[emptyLabel, ...Array(Math.max(0, table.headers.length - 1)).fill('')]];
      rows.push(...tableRows);
    });
    return tsvText(rows);
  }

  function copyKind(kind) {
    const tabularKinds = ['draw', 'schedule', 'scores', 'standings', 'knockout', 'all'];
    copyText(exportText(kind), tabularKinds.includes(kind) ? 'คัดลอกตารางแนวนอนแล้ว' : 'คัดลอกแล้ว');
    const box = $('#copyStatus');
    if (box) box.textContent = `คัดลอก ${kind} แล้ว`;
  }

  async function copyText(text, msg = 'คัดลอกแล้ว') {
    try {
      await navigator.clipboard.writeText(text || '');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text || '';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast(msg, 'good');
  }

  function toast(msg, mode = 'good') {
    if (window.pepsToast) {
      let type = 'info';
      if (mode === 'good') type = 'success';
      if (mode === 'warn') type = 'warn';
      if (mode === 'bad') type = 'error';
      window.pepsToast(msg, type);
    }
  }

  function injectCoreCss() {
    if ($('#peps-clean-core-css')) return;
    const style = document.createElement('style');
    style.id = 'peps-clean-core-css';
    style.textContent = `
      .hidden{display:none!important}
      .stepper{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:12px auto;max-width:var(--app-max,1280px)}
      .step{border:1px solid var(--line);border-radius:14px;padding:9px;background:rgba(255,255,255,.04);display:flex;gap:8px;align-items:center}
      .step b{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08)}
      .step.done b{background:rgba(66,245,155,.26)}.step.active{outline:2px solid rgba(91,231,255,.25)}
      .statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.stat{border:1px solid var(--line);border-radius:18px;padding:14px;background:rgba(255,255,255,.045)}.stat span{display:block;color:var(--muted)}.stat b{font-size:32px}
      .source-section{grid-column:1/-1;border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.03);padding:14px}.source-section h3{margin:0 0 12px;color:var(--accent)}
      .source-grid-core{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.source-grid-core.single{grid-template-columns:minmax(260px,560px)}
      .source-card{border:1px solid rgba(255,255,255,.14);border-radius:20px;background:rgba(255,255,255,.035);padding:16px}.source-card h3{margin:0 0 8px}.source-card p{color:var(--muted);min-height:34px}
      .source-url{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:#cbefff;border:1px solid var(--line);border-radius:12px;background:rgba(0,0,0,.22);padding:9px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:10px}
      .draw-graphic{text-align:center;display:grid;gap:10px;place-items:center}.draw-fx{height:190px;display:grid;place-items:center}.draw-chip{border:1px solid rgba(255,132,49,.4);border-radius:999px;padding:6px 12px;color:#ffd7bd}.draw-group-badge{border:1px solid rgba(255,132,49,.4);border-radius:999px;padding:8px 16px}.draw-group-badge b{font-size:30px}.draw-team-name{font-size:clamp(34px,5vw,74px);font-weight:950;line-height:.95}.draw-team-sub{color:var(--muted);font-weight:800}.draw-progress{height:10px;width:min(460px,100%);border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}.draw-progress-bar{height:100%;background:linear-gradient(90deg,#ff8131,#5be7ff);transition:width .12s linear}.draw-progress-text{width:min(460px,100%);display:flex;justify-content:space-between;color:var(--muted);font-size:12px}
      .pl-wheel{width:160px;height:160px;border-radius:50%;background:conic-gradient(#ffd51f,#5be7ff,#ff4081,#7d4dff,#ff9500,#ff4b3f,#48e662,#ffd51f);box-shadow:0 0 0 9px rgba(255,255,255,.08);animation:plSpin .95s linear infinite}.pl-slot{display:grid;grid-template-columns:repeat(4,42px);gap:8px}.pl-slot i{height:90px;border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.04));animation:plPulse .55s infinite alternate}.pl-card{width:116px;height:154px;border-radius:18px;background:#fff;color:#111;display:grid;place-items:center;font-size:42px;font-weight:950;animation:plFlip .85s infinite alternate}.pl-ball{width:138px;height:138px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff,#ffbe57 38%,#b95513);display:grid;place-items:center;color:#111;font-size:32px;font-weight:950;animation:plBob .75s infinite alternate}.pl-ring{width:160px;height:160px;border-radius:50%;border:10px solid rgba(255,255,255,.12);border-top-color:#ff8131;border-right-color:#5be7ff;animation:plSpin 1.1s linear infinite}@keyframes plSpin{to{transform:rotate(360deg)}}@keyframes plPulse{to{transform:translateY(-12px);opacity:.55}}@keyframes plFlip{to{transform:rotateY(28deg) rotateZ(3deg)}}@keyframes plBob{to{transform:translateY(-16px)}}
      .pl-groups-grid{display:grid;gap:12px}.pl-group-card{border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(255,255,255,.06);overflow:hidden}.pl-group-title{display:flex;justify-content:space-between;padding:12px 14px;background:rgba(91,231,255,.08);font-weight:950}.pl-group-row{display:grid;grid-template-columns:38px minmax(0,1fr);gap:8px;padding:9px 12px;border-top:1px solid rgba(255,255,255,.11)}.pl-group-row.empty .team{opacity:.45}.pl-group-row .no{color:var(--accent);font-weight:950}.pl-group-row .team{font-weight:850;word-break:break-word}
      .score-row{display:grid;grid-template-columns:1.5fr 1fr 70px auto 70px 1fr 130px;gap:8px;align-items:center;border-bottom:1px solid var(--line);padding:8px 0}.score-row input{min-width:0}
      .toast{position:fixed;right:18px;bottom:18px;z-index:99999;border:1px solid rgba(91,231,255,.4);background:rgba(7,17,31,.94);color:#fff;border-radius:14px;padding:11px 14px;box-shadow:0 14px 40px rgba(0,0,0,.30);font-weight:800}
      body[data-density="compact"] .card{padding:13px}.draw-stage.expanded{position:fixed;inset:24px;z-index:9999;background:var(--panel,#0e1d31);padding:20px;border-radius:24px}

      /* V6: stable Draw layout. Team names can wrap to 2 lines without pushing UI down. */
      .draw-stage{min-height:var(--draw-stage-h,420px)!important}
      .draw-stage .draw-graphic{
        width:min(760px,96%);
        min-height:var(--draw-stage-h,420px);
        display:grid!important;
        grid-template-rows:190px 34px 58px 112px 28px 10px 18px;
        align-content:center;
        justify-items:center;
        gap:10px!important;
        overflow:hidden!important;
      }
      .draw-stage .draw-fx{height:190px!important;min-height:190px!important;display:grid;place-items:center}
      .draw-stage .draw-chip{height:34px;max-width:100%;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}
      .draw-stage .draw-group-badge{min-height:58px;display:inline-flex;align-items:center;justify-content:center}
      .draw-stage .draw-team-name{
        min-height:112px!important;
        max-height:112px!important;
        width:min(680px,96%);
        display:-webkit-box!important;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
        overflow:hidden!important;
        text-overflow:ellipsis;
        overflow-wrap:anywhere;
        word-break:break-word;
        align-content:center;
        line-height:1.02!important;
      }
      .draw-stage .draw-team-sub{
        min-height:28px!important;
        max-height:28px!important;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        white-space:nowrap;
        text-overflow:ellipsis;
        max-width:100%;
      }
      .draw-stage .draw-progress{height:10px!important;margin:0!important}
      .draw-stage .draw-progress-text{height:18px!important;min-height:18px!important;align-items:center;margin:0!important}

      /* V6: expanded Draw is a real top layer, not behind the wheel or control row. */
      body.draw-expanded-active{overflow:hidden}
      .draw-stage.expanded{
        position:fixed!important;
        inset:18px!important;
        z-index:2147483000!important;
        min-height:auto!important;
        width:auto!important;
        height:auto!important;
        margin:0!important;
        padding:22px!important;
        display:grid!important;
        place-items:center!important;
        background:
          radial-gradient(circle at 20% 0%,rgba(91,231,255,.18),transparent 34%),
          radial-gradient(circle at 96% 10%,rgba(255,91,189,.16),transparent 30%),
          rgba(7,17,31,.96)!important;
        border:1px solid rgba(91,231,255,.38)!important;
        box-shadow:0 30px 90px rgba(0,0,0,.62)!important;
      }
      .draw-stage.expanded ~ .row{visibility:hidden!important}
      .draw-stage.expanded .draw-graphic{
        width:min(980px,94vw)!important;
        min-height:min(720px,calc(100vh - 80px))!important;
        grid-template-rows:220px 36px 64px 132px 32px 12px 20px!important;
      }
      .draw-stage.expanded .draw-fx{height:220px!important;min-height:220px!important}
      .draw-stage.expanded .draw-team-name{min-height:132px!important;max-height:132px!important;width:min(860px,94vw)}
      .draw-stage.expanded::after{
        content:'ESC เพื่อปิด Expand';
        position:absolute;
        right:20px;
        top:16px;
        font-size:12px;
        color:rgba(237,245,255,.68);
        border:1px solid rgba(255,255,255,.16);
        border-radius:999px;
        padding:7px 10px;
        background:rgba(0,0,0,.24);
      }


      /* V7: hard-lock Draw card geometry. 1-line and 2-line team names must not change UI height. */
      .draw-stage{
        min-height:var(--draw-stage-h,420px)!important;
        overflow:visible!important;
      }
      .draw-stage .draw-graphic{
        width:min(760px,96%)!important;
        height:var(--draw-stage-h,420px)!important;
        min-height:var(--draw-stage-h,420px)!important;
        max-height:var(--draw-stage-h,420px)!important;
        display:grid!important;
        grid-template-rows:150px 34px 58px 116px 28px 10px 18px!important;
        align-content:center!important;
        justify-items:center!important;
        gap:8px!important;
        overflow:hidden!important;
        contain:layout paint!important;
      }
      .draw-stage .draw-fx{
        grid-row:1!important;
        height:150px!important;
        min-height:150px!important;
        max-height:150px!important;
        display:grid!important;
        place-items:center!important;
        overflow:hidden!important;
      }
      .draw-stage .draw-chip{
        grid-row:2!important;
        height:34px!important;
        min-height:34px!important;
        max-height:34px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
        overflow:hidden!important;
      }
      .draw-stage .draw-group-badge{
        grid-row:3!important;
        min-height:58px!important;
        height:58px!important;
        max-height:58px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
      }
      .draw-stage .draw-team-name{
        grid-row:4!important;
        width:min(680px,96%)!important;
        min-height:116px!important;
        height:116px!important;
        max-height:116px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        overflow:hidden!important;
        text-align:center!important;
        line-height:1!important;
        padding:0 8px!important;
      }
      .draw-stage .draw-team-name > span{
        display:-webkit-box!important;
        -webkit-box-orient:vertical!important;
        -webkit-line-clamp:2!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        overflow-wrap:anywhere!important;
        word-break:break-word!important;
        line-height:1!important;
        max-height:2em!important;
      }
      .draw-stage .draw-team-sub{
        grid-row:5!important;
        height:28px!important;
        min-height:28px!important;
        max-height:28px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        overflow:hidden!important;
        white-space:nowrap!important;
        text-overflow:ellipsis!important;
        width:min(680px,96%)!important;
      }
      .draw-stage .draw-progress{
        grid-row:6!important;
        height:10px!important;
        min-height:10px!important;
        max-height:10px!important;
        margin:0!important;
      }
      .draw-stage .draw-progress-text{
        grid-row:7!important;
        height:18px!important;
        min-height:18px!important;
        max-height:18px!important;
        margin:0!important;
        align-items:center!important;
      }
      .draw-stage .pl-wheel{width:132px!important;height:132px!important}
      .draw-stage .pl-slot i{height:70px!important}
      .draw-stage .pl-card{width:96px!important;height:126px!important}
      .draw-stage .pl-ball{width:118px!important;height:118px!important}

      /* V7: expanded draw is opaque and above every UI element. */
      body.draw-expanded-active{overflow:hidden!important}
      .draw-stage.expanded{
        position:fixed!important;
        inset:0!important;
        width:100vw!important;
        height:100vh!important;
        min-height:100vh!important;
        max-height:100vh!important;
        margin:0!important;
        padding:26px!important;
        z-index:2147483646!important;
        display:grid!important;
        place-items:center!important;
        background:#07111f!important;
        background-image:
          radial-gradient(circle at 16% 0%,rgba(91,231,255,.17),transparent 34%),
          radial-gradient(circle at 94% 10%,rgba(255,91,189,.14),transparent 30%)!important;
        border:0!important;
        border-radius:0!important;
        box-shadow:none!important;
        overflow:hidden!important;
        isolation:isolate!important;
      }
      .draw-stage.expanded + .row,
      .draw-stage.expanded ~ .row,
      body.draw-expanded-active .content .panel[data-panel="draw"] .card > .row{
        visibility:hidden!important;
        pointer-events:none!important;
      }
      .draw-stage.expanded .draw-graphic{
        width:min(980px,94vw)!important;
        height:min(760px,calc(100vh - 80px))!important;
        min-height:min(760px,calc(100vh - 80px))!important;
        max-height:min(760px,calc(100vh - 80px))!important;
        grid-template-rows:190px 36px 66px 132px 32px 12px 20px!important;
        position:relative!important;
        z-index:2147483647!important;
      }
      .draw-stage.expanded .draw-fx{height:190px!important;min-height:190px!important;max-height:190px!important}
      .draw-stage.expanded .draw-team-name{
        width:min(860px,94vw)!important;
        height:132px!important;
        min-height:132px!important;
        max-height:132px!important;
      }
      .draw-stage.expanded .pl-wheel{width:168px!important;height:168px!important}
      .draw-stage.expanded .pl-card{width:116px!important;height:154px!important}
      .draw-stage.expanded .pl-ball{width:138px!important;height:138px!important}
      .draw-stage.expanded::after{
        content:'ESC เพื่อปิด Expand';
        position:absolute;
        top:16px;
        right:20px;
        z-index:2147483647;
        font-size:12px;
        color:rgba(237,245,255,.78);
        border:1px solid rgba(255,255,255,.16);
        border-radius:999px;
        padding:7px 10px;
        background:rgba(0,0,0,.32);
      }


      /* V8: stable Draw card + full wheel visibility. Total row height is below card height. */
      .draw-stage{
        min-height:520px!important;
        overflow:visible!important;
      }
      .draw-stage .draw-graphic{
        width:min(760px,96%)!important;
        height:500px!important;
        min-height:500px!important;
        max-height:500px!important;
        display:grid!important;
        grid-template-rows:170px 32px 56px 118px 28px 10px 18px!important;
        align-content:center!important;
        justify-items:center!important;
        gap:8px!important;
        overflow:hidden!important;
        contain:layout paint!important;
        box-sizing:border-box!important;
      }
      .draw-stage .draw-fx{
        grid-row:1!important;
        height:170px!important;
        min-height:170px!important;
        max-height:170px!important;
        width:100%!important;
        display:grid!important;
        place-items:center!important;
        overflow:visible!important;
      }
      .draw-stage .draw-chip{
        grid-row:2!important;
        height:32px!important;
        min-height:32px!important;
        max-height:32px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
        overflow:hidden!important;
      }
      .draw-stage .draw-group-badge{
        grid-row:3!important;
        height:56px!important;
        min-height:56px!important;
        max-height:56px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
      }
      .draw-stage .draw-team-name{
        grid-row:4!important;
        width:min(680px,96%)!important;
        height:118px!important;
        min-height:118px!important;
        max-height:118px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        overflow:hidden!important;
        text-align:center!important;
        line-height:1!important;
        padding:0 8px!important;
      }
      .draw-stage .draw-team-name > span{
        display:-webkit-box!important;
        -webkit-box-orient:vertical!important;
        -webkit-line-clamp:2!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        overflow-wrap:anywhere!important;
        word-break:break-word!important;
        line-height:1!important;
        max-height:2em!important;
      }
      .draw-stage .draw-team-sub{
        grid-row:5!important;
        height:28px!important;
        min-height:28px!important;
        max-height:28px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        overflow:hidden!important;
        white-space:nowrap!important;
        text-overflow:ellipsis!important;
        width:min(680px,96%)!important;
      }
      .draw-stage .draw-progress{
        grid-row:6!important;
        height:10px!important;
        min-height:10px!important;
        max-height:10px!important;
        margin:0!important;
      }
      .draw-stage .draw-progress-text{
        grid-row:7!important;
        height:18px!important;
        min-height:18px!important;
        max-height:18px!important;
        margin:0!important;
        align-items:center!important;
      }
      .draw-stage .pl-wheel{width:150px!important;height:150px!important}
      .draw-stage .pl-slot{grid-template-columns:repeat(4,38px)!important}
      .draw-stage .pl-slot i{height:78px!important}
      .draw-stage .pl-card{width:106px!important;height:140px!important}
      .draw-stage .pl-ball{width:128px!important;height:128px!important}
      .draw-stage .pl-ring{width:142px!important;height:142px!important}

      /* V8: Expand Draw is a separate body-level overlay, never inside grid/cards. */
      body.draw-expanded-active{overflow:hidden!important}
      .draw-expand-overlay{
        position:fixed!important;
        inset:0!important;
        z-index:2147483647!important;
        display:grid!important;
        place-items:center!important;
        padding:26px!important;
        background:#07111f!important;
        background-image:
          radial-gradient(circle at 16% 0%,rgba(91,231,255,.17),transparent 34%),
          radial-gradient(circle at 94% 10%,rgba(255,91,189,.14),transparent 30%)!important;
        isolation:isolate!important;
      }
      .draw-overlay-stage{
        width:min(1040px,94vw)!important;
        height:min(780px,calc(100vh - 72px))!important;
        display:grid!important;
        place-items:center!important;
        overflow:hidden!important;
        position:relative!important;
        z-index:2!important;
      }
      .draw-overlay-stage .draw-graphic{
        width:min(980px,94vw)!important;
        height:min(740px,calc(100vh - 100px))!important;
        min-height:min(740px,calc(100vh - 100px))!important;
        max-height:min(740px,calc(100vh - 100px))!important;
        grid-template-rows:210px 36px 66px 136px 32px 12px 20px!important;
        overflow:hidden!important;
      }
      .draw-overlay-stage .draw-fx{height:210px!important;min-height:210px!important;max-height:210px!important}
      .draw-overlay-stage .draw-team-name{height:136px!important;min-height:136px!important;max-height:136px!important;width:min(860px,94vw)!important}
      .draw-overlay-stage .pl-wheel{width:190px!important;height:190px!important}
      .draw-overlay-stage .pl-card{width:128px!important;height:170px!important}
      .draw-overlay-stage .pl-ball{width:158px!important;height:158px!important}
      .draw-overlay-stage .pl-ring{width:180px!important;height:180px!important}
      .draw-overlay-close{
        position:absolute!important;
        right:20px!important;
        top:16px!important;
        z-index:3!important;
        font-size:12px!important;
        color:rgba(237,245,255,.82)!important;
        border:1px solid rgba(255,255,255,.16)!important;
        border-radius:999px!important;
        padding:8px 12px!important;
        background:rgba(0,0,0,.35)!important;
      }
      .draw-stage.expanded{position:relative!important;inset:auto!important;width:auto!important;height:auto!important;z-index:auto!important}


      /* V9: real text-size variables + settings modal + adaptive group columns */
      .draw-stage .draw-chip,.draw-stage .draw-style-label{font-size:var(--draw-chip-fs,13px)!important}
      .draw-stage .draw-group-badge,.draw-stage .draw-group-pill{font-size:var(--draw-group-label-fs,18px)!important}
      .draw-stage .draw-group-badge b,.draw-stage .draw-group-pill b{font-size:var(--draw-group-letter-fs,18px)!important}
      .draw-stage .draw-team-name{font-size:var(--draw-team-fs,52px)!important}
      .draw-stage .draw-team-sub,.draw-stage .draw-subtitle{font-size:var(--draw-meta-fs,22px)!important}
      .draw-stage .draw-progress-text,.draw-stage .draw-progress-meta{font-size:var(--draw-status-fs,18px)!important}
      .pl-anim-core .draw-chip{font-size:var(--draw-chip-fs,12px)!important}
      .pl-anim-core .draw-group-badge{font-size:var(--draw-group-label-fs,16px)!important}
      .pl-anim-core .draw-group-badge b{font-size:var(--draw-group-letter-fs,30px)!important}
      .pl-anim-name{font-size:var(--source-team-fs,72px)!important}
      .pl-anim-meta{font-size:var(--source-meta-fs,22px)!important}
      .pl-group-title{font-size:var(--group-title-fs,14px)!important}
      .pl-group-row .team{font-size:var(--group-team-fs,14px)!important}
      .draw-inline-tool{
        display:grid;
        grid-template-columns:minmax(180px,240px) 1fr;
        gap:10px;
        align-items:center;
        margin:12px 0;
        border:1px solid rgba(91,231,255,.18);
        border-radius:16px;
        padding:10px 12px;
        background:rgba(7,20,38,.45);
      }
      .draw-inline-tool label{
        color:var(--muted);
        font-size:12px;
        font-weight:800;
      }
      .draw-inline-tool b{color:var(--text)}
      .settings-extra-controls{
        margin:12px 0;
        padding:12px;
        border:1px solid rgba(91,231,255,.16);
        border-radius:16px;
        background:rgba(7,20,38,.38);
      }
      .peps-settings-modal{
        position:fixed;
        inset:0;
        z-index:2147483600;
        display:none;
        align-items:center;
        justify-content:center;
        padding:18px;
        background:rgba(0,0,0,.66);
        backdrop-filter:blur(10px);
      }
      .peps-settings-modal.open{display:flex}
      .peps-settings-box{
        width:min(980px,96vw);
        max-height:92vh;
        overflow:auto;
        border:1px solid var(--line);
        border-radius:24px;
        background:linear-gradient(180deg,rgba(14,29,49,.98),rgba(7,17,31,.98));
        box-shadow:var(--shadow);
      }
      .peps-settings-head{
        position:sticky;
        top:0;
        z-index:2;
        display:flex;
        justify-content:space-between;
        gap:16px;
        padding:18px 20px;
        border-bottom:1px solid var(--line);
        background:rgba(14,29,49,.98);
      }
      .peps-settings-head h3{margin:0}
      .peps-settings-head p{margin:4px 0 0;color:var(--muted);font-size:13px}
      .peps-settings-body{
        display:grid;
        grid-template-columns:minmax(280px,.85fr) minmax(340px,1.15fr);
        gap:18px;
        padding:18px 20px;
      }
      .peps-settings-sliders{display:grid;gap:10px}
      .peps-slider label{
        display:flex;
        justify-content:space-between;
        gap:12px;
        color:var(--muted);
        font-size:12px;
        font-weight:800;
        margin-bottom:6px;
      }
      .peps-slider b{color:var(--text)}
      .peps-slider input{padding:0;height:8px;accent-color:var(--accent)}
      .peps-settings-preview{
        display:grid;
        align-content:start;
        gap:12px;
      }
      .preview-graphic{
        width:100%!important;
        height:500px!important;
        min-height:500px!important;
      }
      .preview-group-card{width:100%}
      .peps-settings-actions{
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        padding:0 20px 20px;
      }


      /* V13: explicit Groups text-size rules for Control + Preview + Source */
      .pl-group-title{
        font-size:var(--group-title-fs,14px)!important;
        line-height:1.2!important;
      }
      .pl-group-row .team,
      .pl-group-row .no{
        font-size:var(--group-team-fs,14px)!important;
        line-height:1.25!important;
      }
      .preview-group-card .pl-group-title{
        font-size:var(--group-title-fs,14px)!important;
      }
      .preview-group-card .pl-group-row .team,
      .preview-group-card .pl-group-row .no{
        font-size:var(--group-team-fs,14px)!important;
      }
      /* V10: realtime preview selectors for every Draw Text Size control */
      .peps-settings-preview .preview-section-title{
        color:var(--accent);
        font-size:12px;
        font-weight:950;
        letter-spacing:.08em;
        text-transform:uppercase;
        margin:4px 0 -4px;
      }
      .peps-slider small{
        color:rgba(237,245,255,.45);
        font-size:10px;
        margin-left:6px;
        white-space:nowrap;
      }
      .preview-draw-stage{
        min-height:500px!important;
        border:1px solid rgba(91,231,255,.18);
        border-radius:20px;
        background:rgba(7,20,38,.42);
        padding:12px;
        overflow:hidden;
      }
      .preview-graphic{
        width:100%!important;
        height:500px!important;
        min-height:500px!important;
        max-height:500px!important;
      }
      .peps-settings-preview .draw-chip,.peps-settings-preview .draw-style-label{font-size:var(--draw-chip-fs,13px)!important}
      .peps-settings-preview .draw-group-badge,.peps-settings-preview .draw-group-pill{font-size:var(--draw-group-label-fs,18px)!important}
      .peps-settings-preview .draw-group-badge b,.peps-settings-preview .draw-group-pill b{font-size:var(--draw-group-letter-fs,18px)!important}
      .peps-settings-preview .draw-team-name{font-size:var(--draw-team-fs,52px)!important}
      .peps-settings-preview .draw-team-sub,.peps-settings-preview .draw-subtitle{font-size:var(--draw-meta-fs,22px)!important}
      .peps-settings-preview .draw-progress-text,.peps-settings-preview .draw-progress-meta{font-size:var(--draw-status-fs,18px)!important}
      .preview-source-card{
        border:1px solid rgba(91,231,255,.18);
        border-radius:20px;
        background:rgba(7,20,38,.42);
        padding:12px;
        overflow:hidden;
      }
      .preview-source-card .preview-anim-core{
        width:100%!important;
        min-height:420px!important;
        height:420px!important;
        max-height:420px!important;
        box-shadow:none!important;
      }
      .preview-source-card .pl-anim-fx{
        height:120px!important;
        min-height:120px!important;
        max-height:120px!important;
      }
      .preview-source-card .pl-ring{
        width:100px!important;
        height:100px!important;
      }
      .preview-source-card .pl-anim-name{
        font-size:var(--source-team-fs,72px)!important;
      }
      .preview-source-card .pl-anim-meta{
        font-size:var(--source-meta-fs,22px)!important;
      }
      .preview-group-card{width:100%}
      .preview-group-card .pl-group-title{font-size:var(--group-title-fs,14px)!important}
      .preview-group-card .pl-group-row .team{font-size:var(--group-team-fs,14px)!important}

      @media(max-width:860px){
        .peps-settings-body{grid-template-columns:1fr}
        .draw-inline-tool{grid-template-columns:1fr}
      }

      @media(max-width:900px){.score-row{grid-template-columns:1fr 60px auto 60px 1fr}.score-row b,.score-row select{grid-column:1/-1}}
    `;
    document.head.appendChild(style);
  }

  function injectSourceCss() {
    injectCoreCss();
    if ($('#peps-source-css')) return;
    const style = document.createElement('style');
    style.id = 'peps-source-css';
    style.textContent = `
      html.source-mode,
      html.source-mode body,
      html.source-mode #sourceRoot{
        margin:0!important;
        width:100%!important;
        min-height:100%!important;
        background:var(--source-page-bg,transparent)!important;
        background-image:none!important;
        background-color:var(--source-page-bg,transparent)!important;
        overflow:hidden!important;
      }
      html.source-mode body::before,
      html.source-mode body::after,
      html.source-mode #sourceRoot::before,
      html.source-mode #sourceRoot::after{
        display:none!important;
        content:none!important;
        background:none!important;
        background-image:none!important;
      }
      .source-mode #app{display:none!important}
      #sourceRoot{
        min-height:100vh!important;
        width:100vw!important;
        background:transparent!important;
        background-image:none!important;
        background-color:transparent!important;
        overflow:hidden!important;
      }

      .pl-anim-source{
        min-height:100vh!important;
        width:100vw!important;
        display:grid!important;
        place-items:center!important;
        background:transparent!important;
        background-image:none!important;
        background-color:transparent!important;
        color:#edf5ff;
        font-family:Prompt,"IBM Plex Sans Thai",system-ui,sans-serif;
        padding:0!important;
      }
      .pl-anim-core{
        text-align:center;
        width:min(620px,94vw);
        height:560px;
        min-height:560px;
        max-height:560px;
        padding:22px 24px;
        display:grid!important;
        grid-template-rows:210px 34px 64px 132px 32px!important;
        align-content:center!important;
        justify-items:center!important;
        gap:10px!important;
        background:rgba(7,17,31,.82)!important;
        border:1px solid rgba(91,231,255,.26)!important;
        border-radius:28px!important;
        box-shadow:0 24px 70px rgba(0,0,0,.38)!important;
        overflow:hidden!important;
      }
      .pl-anim-fx{
        height:210px!important;
        min-height:210px!important;
        max-height:210px!important;
        display:grid!important;
        place-items:center!important;
        overflow:visible!important;
      }
      .pl-anim-core .draw-chip{
        height:34px!important;
        min-height:34px!important;
        max-height:34px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
      }
      .pl-anim-core .draw-group-badge{
        height:64px!important;
        min-height:64px!important;
        max-height:64px!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        white-space:nowrap!important;
      }
      .pl-anim-name{
        height:132px!important;
        min-height:132px!important;
        max-height:132px!important;
        width:min(560px,92vw)!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        text-align:center!important;
        overflow:hidden!important;
        padding:0 8px!important;
        font-size:clamp(42px,7vw,88px);
        font-weight:950;
        line-height:1!important;
        text-shadow:0 8px 32px rgba(0,0,0,.42);
      }
      .pl-anim-name > span{
        display:-webkit-box!important;
        -webkit-box-orient:vertical!important;
        -webkit-line-clamp:2!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        overflow-wrap:anywhere!important;
        word-break:break-word!important;
        line-height:1!important;
        max-height:2em!important;
      }
      .pl-anim-meta{
        height:32px!important;
        min-height:32px!important;
        max-height:32px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        margin:0!important;
        color:#c8d7ea;
        font-size:clamp(16px,2vw,26px);
        font-weight:800;
        white-space:nowrap!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        max-width:100%;
      }
      .pl-anim-source .pl-wheel{width:190px!important;height:190px!important}
      .pl-anim-source .pl-card{width:128px!important;height:170px!important}
      .pl-anim-source .pl-ball{width:158px!important;height:158px!important}
      .pl-anim-source .pl-ring{width:180px!important;height:180px!important}

      .pl-groups-source{
        min-height:100vh!important;
        width:100vw!important;
        display:grid!important;
        place-items:center!important;
        padding:24px!important;
        color:#edf5ff;
        font-family:"IBM Plex Sans Thai",Prompt,system-ui,sans-serif;
        background:transparent!important;
        background-image:none!important;
        background-color:transparent!important;
      }
      .pl-groups-board{
        width:max-content;
        max-width:calc(100vw - 48px);
        height:max-content;
        max-height:calc(100vh - 48px);
        overflow:auto!important;
        border:1px solid rgba(91,231,255,.24)!important;
        border-radius:28px!important;
        background:rgba(7,17,31,.86)!important;
        box-shadow:0 24px 70px rgba(0,0,0,.38)!important;
        padding:24px!important;
      }
      .pl-groups-head{
        display:flex;
        justify-content:space-between;
        gap:16px;
        align-items:flex-start;
        margin-bottom:16px;
        padding-bottom:14px;
        border-bottom:1px solid rgba(91,231,255,.18);
      }
      .pl-groups-head h1{margin:0;font-size:clamp(28px,3.4vw,56px);line-height:1}
      .pl-groups-head p{margin:6px 0 0;color:#94a8c5}
      .pl-groups-source .pl-groups-grid{
        display:grid!important;
        gap:12px!important;
        align-items:start!important;
        justify-content:start!important;
        max-width:100%!important;
        overflow:visible!important;
      }
      .pl-groups-source .pl-group-card{
        border:1px solid rgba(91,231,255,.18)!important;
        border-radius:18px!important;
        background:rgba(255,255,255,.045)!important;
        overflow:hidden!important;
      }
      .pl-groups-source .pl-group-title{
        display:flex;
        justify-content:space-between;
        gap:12px;
        padding:12px 14px;
        background:linear-gradient(135deg,rgba(91,231,255,.12),rgba(255,91,189,.08))!important;
        font-weight:950;
      }
      .pl-groups-source .pl-group-row{
        display:grid;
        grid-template-columns:38px minmax(0,1fr);
        gap:8px;
        padding:9px 12px;
        border-top:1px solid rgba(255,255,255,.11);
      }
      .pl-groups-source .pl-group-row.empty .team{opacity:.45}
      .pl-groups-source .pl-group-row .no{color:#5be7ff;font-weight:950}
      .pl-groups-source .pl-group-row .team{font-weight:850;word-break:break-word}
      .pl-groups-board table{width:100%;border-collapse:collapse}
      .pl-groups-board th,.pl-groups-board td{border-bottom:1px solid rgba(255,255,255,.15);padding:10px;text-align:left}

      /* V13: Groups Table OBS Source must follow Groups text-size sliders in real time. */
      .pl-groups-source .pl-group-title{
        font-size:var(--group-title-fs,14px)!important;
        line-height:1.2!important;
      }
      .pl-groups-source .pl-group-row .team{
        font-size:var(--group-team-fs,14px)!important;
        line-height:1.25!important;
      }
      .pl-groups-source .pl-group-row .no{
        font-size:var(--group-team-fs,14px)!important;
        line-height:1.25!important;
      }
      .empty-source{font-size:34px;font-weight:900;color:#c8d7ea;padding:40px;text-align:center}
    `;
    document.head.appendChild(style);
  }

  function resetMissingRoots() {
    // Keep function for future extension; avoids ReferenceError in older inline patches.
  }

  function remoteSpin() {
    if (state.drawLive?.waiting) {
      toast('กำลังแสดงผลอยู่ รอผลออกก่อนสั่งครั้งถัดไป', 'warn');
      return false;
    }

    const sequence = Array.isArray(state.pendingSequence) ? state.pendingSequence : [];
    if (sequence.length && !state.pendingComplete) {
      if (Number(state.pendingRevealIndex || 0) >= sequence.length) {
        completeDrawSequence();
        toast('ชุดสุ่มนี้แสดงครบแล้ว', 'warn');
        return false;
      }
      audit('remote-next-reveal', {
        index: Number(state.pendingRevealIndex || 0),
        total: sequence.length
      });
      nextReveal();
      return true;
    }

    if (state.pendingComplete && sequence.length) {
      toast('ชุดสุ่มนี้แสดงครบแล้ว หากต้องการเริ่มใหม่ให้กด Start Draw จากหน้าเว็บ', 'warn');
      return false;
    }

    return startDraw({ source: 'remote' });
  }

  window.PeppsLiveTournamentStudio = {
    getState: () => state,
    saveState,
    renderAll,
    sourceUrl,
    remoteSpin,
    groupStageProgress,
    groupStageMessage,
    knockoutSetupIssue,
    standingsEntries,
    tieKey,
    buildKnockoutPreviewPlan,
    generateKnockout,
    advancePlannedKnockout
  };
  window.PepsLiveTournamentStudio = window.PeppsLiveTournamentStudio;

  init();
})();
