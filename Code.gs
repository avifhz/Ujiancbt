/**
 * =========================================================================
 * CBT APP - BACKEND GOOGLE APPS SCRIPT (Code.gs)
 * Versi: Enterprise Ultimate 12.0 - Offline First, Audio Sync, & Report Card
 * Copyright: © 2026 @Jesse R Niq
 * =========================================================================
 */

// ============================================================
// TERHUBUNG KE GOOGLE SPREADSHEET & AKUN APPS SCRIPT TERKONFIGURASI
// Spreadsheet URL: https://docs.google.com/spreadsheets/d/15hhPU3rRpCgodxhmqgDdc0STJigGnu1vRZH25clvh3w/edit?hl=id&gid=2098441566#gid=2098441566
// Akun Pemilik / Deployer: avifzein@gmail.com
// ============================================================
const SPREADSHEET_ID = '15hhPU3rRpCgodxhmqgDdc0STJigGnu1vRZH25clvh3w';
const SPREADSHEET_OWNER_EMAIL = 'avifzein@gmail.com';

function getSpreadsheet() {
  // 1) Buka Spreadsheet target sesuai ID yang terhubung
  const id = String(SPREADSHEET_ID || '').trim();
  if (id && !/^PASTE/i.test(id)) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (errOpen) {
      const activeFallback = SpreadsheetApp.getActiveSpreadsheet();
      if (activeFallback) return activeFallback;
      throw new Error(
        'Gagal membuka Spreadsheet ID (' + id + '). Pastikan proyek Apps Script ini di-Deploy menggunakan akun Google ' + SPREADSHEET_OWNER_EMAIL + '. Detail: ' + (errOpen && errOpen.message ? errOpen.message : errOpen)
      );
    }
  }
  // 2) Fallback: spreadsheet aktif (untuk proyek container-bound)
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  // 3) Tidak ada keduanya -> error jelas untuk memudahkan perbaikan
  throw new Error('SPREADSHEET_ID belum diisi. Buka file Code.gs lalu tempel ID spreadsheet Anda pada const SPREADSHEET_ID (lihat komentar di atas).');
}

function doGet(e) {
  if (e && e.parameter && e.parameter.api === '1') {
    return handleGasBridgeGet_(e);
  }
  let page = 'Index'; 
  if (e && e.parameter && (e.parameter.p === 'admin' || e.parameter.page === 'admin')) page = 'Admin'; 
  else if (e && e.parameter && (e.parameter.p === 'proktor' || e.parameter.page === 'proktor')) page = 'Proktor';

  try {
    return HtmlService.createTemplateFromFile(page)
      .evaluate()
      .setTitle(page === 'Admin' ? 'CBT Admin Panel' : page === 'Proktor' ? 'CBT Proktor Panel' : 'CBT Siswa')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) { return HtmlService.createHtmlOutput('<h1>Terjadi Kesalahan Server</h1><p>' + error.message + '</p>'); }
}

function getSheetSecure(ss, sheetName, defaultHeaders = []) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (defaultHeaders && defaultHeaders.length > 0) sheet.appendRow(defaultHeaders);
  } else if (sheet.getLastRow() === 0 && defaultHeaders && defaultHeaders.length > 0) {
    sheet.appendRow(defaultHeaders);
  }
  return sheet;
}

function getAppSettings() {
  try {
    const ss = getSpreadsheet();
    const sheet = getSheetSecure(ss, 'Setting_Ujian', ['Key', 'Value']);
    const data = sheet.getDataRange().getValues();
    let settings = {};
    for(let i=0; i<data.length; i++) { 
        if(data[i][0]) {
            let val = '';
            for(let j=1; j<data[i].length; j++) {
                if(data[i][j]) val += data[i][j];
            }
            settings[data[i][0]] = val;
        }
    }
    const defaults = {
        token: 'ABC12', durasi: '60', status_ujian: 'Aktif', ujian_ketat: 'Ya', audio_monitoring: 'Tidak',
        kiosk_mode: 'Tidak', exambro_only: 'Tidak', kalkulator: 'Ya', coretan: 'Ya', adaptif_cat: 'Tidak', ai_face_liveness: 'Ya',
        kementerian_header: 'KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI', logo_kementerian: '', notif_email: 'Tidak', email_wali: '', audio_limit: '2', ai_gaze: 'Ya'
    };
    settings = { ...defaults, ...settings };
    return { success: true, data: settings };
  } catch(e) { return { success: false, message: e.message }; }
}

function getAdminDashboardData() {
  try {
    const ss = getSpreadsheet();
    const sheetSiswa = getSheetSecure(ss, 'Data_Siswa', ['NIS', 'Nama', 'Kelas', 'Sesi', 'Password', 'Status']);
    let rawSiswa = sheetSiswa.getDataRange().getDisplayValues();
    
    const sheetSoal = getSheetSecure(ss, 'Bank_Soal', ['Mapel', 'Kelas', 'No', 'Soal', 'A', 'B', 'C', 'D', 'E', 'Kunci', 'Tipe_Soal', 'Bobot_Kesulitan', 'Data_AKM']);
    let rawSoal = sheetSoal.getDataRange().getDisplayValues();
    
    const sheetHasil = getSheetSecure(ss, 'Hasil_Ujian', ['Timestamp', 'NIS', 'Nama', 'Token', 'Skor', 'Status']);
    let rawHasil = sheetHasil.getDataRange().getDisplayValues();
    
    const sheetProktor = getSheetSecure(ss, 'Data_Proktor', ['Username', 'Password', 'Nama']);
    let rawProktor = sheetProktor.getDataRange().getDisplayValues();
    
    const sheetAnalisa = getSheetSecure(ss, 'Analisa_Jawaban', ['NIS', 'Nama', 'Token', 'Jawaban', 'Detail_Analisa']);
    let rawAnalisa = sheetAnalisa.getDataRange().getDisplayValues();
    
    const sheetJadwal = getSheetSecure(ss, 'Jadwal_Ujian', ['Tanggal', 'Mata Pelajaran', 'Kelas', 'Ruang', 'Sesi', 'Jam Mulai', 'Jam Selesai', 'Token', 'Status', 'Proktor', 'Pengawas', 'Banyak Soal', 'Jenis Ujian']);
    let rawJadwal = sheetJadwal.getDataRange().getDisplayValues();
    
    const sheetSetting = getSheetSecure(ss, 'Setting_Ujian', ['Key', 'Value']);
    let rawSetting = sheetSetting.getDataRange().getValues();

    const dataSiswa = rawSiswa.filter(row => row[0] && row[0].toString().trim() !== '');
    
    // Perbaikan: Jangan filter soal hanya berdasarkan kolom Mapel (row[0]),
    // karena banyak bank soal hanya mengisi Mapel di baris pertama atau kosong.
    let currentMapel = 'Umum';
    let currentKelas = 'Semua';
    const dataSoal = rawSoal.filter((row, idx) => {
        if (idx === 0) return true; // Tetap pertahankan baris header untuk diproses frontend
        return row && row.some(cell => cell && cell.toString().trim() !== '');
    }).map((row, idx) => {
        if (idx === 0) return row;
        let r = [...row];
        while (r.length < 13) r.push('');
        if (r[0] && r[0].toString().trim()) currentMapel = r[0].toString().trim();
        else r[0] = currentMapel;
        if (r[1] && r[1].toString().trim()) currentKelas = r[1].toString().trim();
        else r[1] = currentKelas;
        if (!r[2] || r[2].toString().trim() === '') r[2] = String(idx);
        return r;
    });

    const dataHasil = rawHasil.filter(row => row[0] && row[0].toString().trim() !== '');
    const dataProktor = rawProktor.filter(row => row[0] && row[0].toString().trim() !== '');
    const dataAnalisa = rawAnalisa.filter(row => row[0] && row[0].toString().trim() !== '');
    const dataJadwal = rawJadwal.filter(row => row[0] && row[0].toString().trim() !== '');
    
    let settings = {};
    for (let i = 0; i < rawSetting.length; i++) { 
        if (rawSetting[i][0]) {
            let val = '';
            for(let j=1; j<rawSetting[i].length; j++) {
                if(rawSetting[i][j]) val += rawSetting[i][j];
            }
            settings[rawSetting[i][0]] = val;
        }
    }
    const defaults = {
        token: 'ABC12', durasi: '60', status_ujian: 'Aktif', ujian_ketat: 'Ya', audio_monitoring: 'Tidak',
        kiosk_mode: 'Tidak', exambro_only: 'Tidak', kalkulator: 'Ya', coretan: 'Ya', adaptif_cat: 'Tidak', ai_face_liveness: 'Ya',
        kementerian_header: 'KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI', logo_kementerian: '', notif_email: 'Tidak', email_wali: '', audio_limit: '2', ai_gaze: 'Ya'
    };
    settings = { ...defaults, ...settings };

    const sheetFoto = getSheetSecure(ss, "Log_Foto", ["Timestamp", "NIS", "Nama", "FotoBase64", "TokenSesi"]);
    const rawFoto = sheetFoto.getDataRange().getDisplayValues();
    const dataFoto = rawFoto.filter((r, idx) => idx > 0 && r[0]);

    const sheetGFormLinks = getSheetSecure(ss, "Link_GoogleForm", ["Mapel", "Kelas", "FormUrl", "FormId", "Status", "JudulForm", "Timestamp"]);
    const rawGFormLinks = sheetGFormLinks.getDataRange().getDisplayValues();
    const dataGFormLinks = rawGFormLinks.filter(row => row[0] && row[0].toString().trim() !== '');

    return { success: true, data: { siswa: dataSiswa, soal: dataSoal, hasil: dataHasil, proktor: dataProktor, analisa: dataAnalisa, jadwal: dataJadwal, settings: settings, foto: dataFoto, gformLinks: dataGFormLinks } };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function normalizeRectangularArray(dataArray, numCols) {
    if (!dataArray || dataArray.length === 0) return [];
    return dataArray.map(row => {
        let r = Array.isArray(row) ? [...row] : [];
        while (r.length < numCols) r.push(''); 
        return r.slice(0, numCols).map(cell => {
            if (cell === undefined || cell === null) return '';
            let s = String(cell);
            // Cegah batas maksimum 50.000 karakter per cell pada Google Sheets agar tidak error saat simpan
            if (s.length > 49000) s = s.substring(0, 49000);
            return s;
        });
    });
}

function saveSiswaMasal(dataArray) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const sheet = getSheetSecure(ss, 'Data_Siswa', ['NIS', 'Nama', 'Kelas', 'Sesi', 'Password', 'Status']);
    sheet.clear();
    sheet.getRange(1, 1, 1, 6).setValues([['NIS', 'Nama', 'Kelas', 'Sesi', 'Password', 'Status']]);
    
    if (dataArray && dataArray.length > 0) {
        const rectData = normalizeRectangularArray(dataArray, 6);
        sheet.getRange(2, 1, rectData.length, 6).setNumberFormat('@').setValues(rectData);
    }
    SpreadsheetApp.flush(); return { success: true };
  } catch (e) { return { success: false, message: e.message }; } finally { lock.releaseLock(); }
}

function saveSoalMasal(dataArray) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const headers = ["Mapel", "Kelas", "No", "Soal", "A", "B", "C", "D", "E", "Kunci", "Tipe_Soal", "Bobot_Kesulitan", "Data_AKM"];
    const sheet = getSheetSecure(ss, "Bank_Soal", headers);
    sheet.clear();
    sheet.getRange(1, 1, 1, 13).setValues([headers]);

    if (dataArray && dataArray.length > 0) {
        let cleanArray = dataArray;
        if (typeof cleanArray === 'string') {
            try { cleanArray = JSON.parse(cleanArray); } catch(e) {}
        }
        
        let runMapel = 'Umum';
        let runKelas = 'Semua';
        const populatedArray = cleanArray.map((row, idx) => {
            let r = Array.isArray(row) ? [...row] : [];
            while (r.length < 13) r.push('');
            if (r[0] && String(r[0]).trim()) runMapel = String(r[0]).trim();
            else r[0] = runMapel;
            if (r[1] && String(r[1]).trim()) runKelas = String(r[1]).trim();
            else r[1] = runKelas;
            if (!r[2] || String(r[2]).trim() === '') r[2] = String(idx + 1);
            return r;
        });

        const rectData = normalizeRectangularArray(populatedArray, 13);
        const requiredRows = rectData.length + 5;
        const currentMaxRows = sheet.getMaxRows();
        if (currentMaxRows < requiredRows) {
            sheet.insertRowsAfter(currentMaxRows, requiredRows - currentMaxRows);
        }
        sheet.getRange(2, 1, rectData.length, 13).setNumberFormat("@").setValues(rectData);
    }
    SpreadsheetApp.flush(); return { success: true };
  } catch (e) { return { success: false, message: e.message }; } finally { lock.releaseLock(); }
}

function importSoalFromGoogleForm(formUrlOrId, targetMapel, targetKelas) {
  try {
    if (!formUrlOrId || String(formUrlOrId).trim() === '') {
      return { success: false, message: 'URL atau ID Google Form tidak boleh kosong.' };
    }

    let form;
    const cleanInput = String(formUrlOrId).trim();
    const idMatch = cleanInput.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/i) || cleanInput.match(/id=([a-zA-Z0-9_-]+)/i);
    const formId = idMatch ? idMatch[1] : cleanInput;

    try {
      form = FormApp.openById(formId);
    } catch (err1) {
      try {
        form = FormApp.openByUrl(cleanInput);
      } catch (err2) {
        return { 
          success: false, 
          message: 'Gagal membuka Google Form. Pastikan URL/ID benar dan akun ini memiliki izin akses (editor/pemilik) ke form tersebut.' 
        };
      }
    }

    const items = form.getItems();
    if (!items || items.length === 0) {
      return { success: false, message: 'Google Form tidak memiliki item pertanyaan.' };
    }

    const finalMapel = targetMapel && String(targetMapel).trim() ? String(targetMapel).trim() : (form.getTitle() || 'Umum');
    const finalKelas = targetKelas && String(targetKelas).trim() ? String(targetKelas).trim() : 'Semua';

    const soalArray = [];
    let noCounter = 1;

    items.forEach(item => {
      const itemType = item.getType();
      const title = item.getTitle() ? item.getTitle().trim() : '';
      const helpText = item.getHelpText() ? item.getHelpText().trim() : '';
      const fullSoalText = helpText ? (title + '\n' + helpText) : title;

      // 1. Pilihan Ganda (MULTIPLE_CHOICE)
      if (itemType === FormApp.ItemType.MULTIPLE_CHOICE) {
        const mcItem = item.asMultipleChoiceItem();
        const choices = mcItem.getChoices();
        let a = '', b = '', c = '', d = '', e = '';
        let kunci = 'A';

        choices.forEach((ch, cIdx) => {
          const val = ch.getValue() || '';
          if (cIdx === 0) { a = val; if (ch.isCorrectAnswer && ch.isCorrectAnswer()) kunci = 'A'; }
          else if (cIdx === 1) { b = val; if (ch.isCorrectAnswer && ch.isCorrectAnswer()) kunci = 'B'; }
          else if (cIdx === 2) { c = val; if (ch.isCorrectAnswer && ch.isCorrectAnswer()) kunci = 'C'; }
          else if (cIdx === 3) { d = val; if (ch.isCorrectAnswer && ch.isCorrectAnswer()) kunci = 'D'; }
          else if (cIdx === 4) { e = val; if (ch.isCorrectAnswer && ch.isCorrectAnswer()) kunci = 'E'; }
        });

        soalArray.push([
          finalMapel, finalKelas, String(noCounter++), fullSoalText,
          a, b, c, d, e,
          kunci, 'PG', 'SEDANG', ''
        ]);
      }
      // 2. Pilihan Ganda Kompleks (CHECKBOX)
      else if (itemType === FormApp.ItemType.CHECKBOX) {
        const cbItem = item.asCheckboxItem();
        const choices = cbItem.getChoices();
        let a = '', b = '', c = '', d = '', e = '';
        const correctList = [];
        const optLetters = ['A', 'B', 'C', 'D', 'E'];

        choices.forEach((ch, cIdx) => {
          const val = ch.getValue() || '';
          if (cIdx === 0) a = val;
          else if (cIdx === 1) b = val;
          else if (cIdx === 2) c = val;
          else if (cIdx === 3) d = val;
          else if (cIdx === 4) e = val;

          if (ch.isCorrectAnswer && ch.isCorrectAnswer() && cIdx < optLetters.length) {
            correctList.push(optLetters[cIdx]);
          }
        });

        const kunci = correctList.length > 0 ? correctList.join(',') : 'A,B';

        soalArray.push([
          finalMapel, finalKelas, String(noCounter++), fullSoalText,
          a, b, c, d, e,
          kunci, 'PG_KOMPLEKS', 'SEDANG', ''
        ]);
      }
      // 3. Kisi Pilihan Ganda (GRID) -> Benar/Salah ATAU Menjodohkan
      else if (itemType === FormApp.ItemType.GRID) {
        const gridItem = item.asGridItem();
        const rows = gridItem.getRows();
        const cols = gridItem.getColumns();
        const isBenarSalah = cols.some(c => /benar|salah|true|false/i.test(String(c)));

        if (isBenarSalah) {
          const statements = rows.map(r => String(r).trim()).filter(Boolean);
          const defaultKunci = statements.map(() => 'B').join(',');
          soalArray.push([
            finalMapel, finalKelas, String(noCounter++), fullSoalText,
            '', '', '', '', '',
            defaultKunci, 'BENAR_SALAH', 'SEDANG', statements.join('\n')
          ]);
        } else {
          let a = cols[0] || '', b = cols[1] || '', c = cols[2] || '', d = cols[3] || '', e = cols[4] || '';
          const premises = rows.map((r, rIdx) => `${rIdx + 1}. ${String(r).trim()}`).filter(Boolean);
          const defaultKunci = premises.map((_, pIdx) => `${pIdx + 1}-${['A','B','C','D','E'][pIdx % 5]}`).join(',');
          soalArray.push([
            finalMapel, finalKelas, String(noCounter++), fullSoalText,
            a, b, c, d, e,
            defaultKunci, 'MENJODOHKAN', 'SEDANG', premises.join('\n')
          ]);
        }
      }
      // 4. Kisi Kotak Centang (CHECKBOX_GRID) -> Benar/Salah ATAU Menjodohkan
      else if (itemType === FormApp.ItemType.CHECKBOX_GRID) {
        const cbGrid = item.asCheckboxGridItem();
        const rows = cbGrid.getRows();
        const cols = cbGrid.getColumns();
        const isBenarSalah = cols.some(c => /benar|salah|true|false/i.test(String(c)));

        if (isBenarSalah) {
          const statements = rows.map(r => String(r).trim()).filter(Boolean);
          const defaultKunci = statements.map(() => 'B').join(',');
          soalArray.push([
            finalMapel, finalKelas, String(noCounter++), fullSoalText,
            '', '', '', '', '',
            defaultKunci, 'BENAR_SALAH', 'SEDANG', statements.join('\n')
          ]);
        } else {
          let a = cols[0] || '', b = cols[1] || '', c = cols[2] || '', d = cols[3] || '', e = cols[4] || '';
          const premises = rows.map((r, rIdx) => `${rIdx + 1}. ${String(r).trim()}`).filter(Boolean);
          const defaultKunci = premises.map((_, pIdx) => `${pIdx + 1}-${['A','B','C','D','E'][pIdx % 5]}`).join(',');
          soalArray.push([
            finalMapel, finalKelas, String(noCounter++), fullSoalText,
            a, b, c, d, e,
            defaultKunci, 'MENJODOHKAN', 'SEDANG', premises.join('\n')
          ]);
        }
      }
      // 5. Dropdown (LIST) -> Pilihan Ganda
      else if (itemType === FormApp.ItemType.LIST) {
        const listItem = item.asListItem();
        const choices = listItem.getChoices();
        let a = choices[0] ? choices[0].getValue() : '';
        let b = choices[1] ? choices[1].getValue() : '';
        let c = choices[2] ? choices[2].getValue() : '';
        let d = choices[3] ? choices[3].getValue() : '';
        let e = choices[4] ? choices[4].getValue() : '';

        soalArray.push([
          finalMapel, finalKelas, String(noCounter++), fullSoalText,
          a, b, c, d, e,
          'A', 'PG', 'SEDANG', ''
        ]);
      }
      // 6. Jawaban Singkat (TEXT) -> ISIAN
      else if (itemType === FormApp.ItemType.TEXT) {
        soalArray.push([
          finalMapel, finalKelas, String(noCounter++), fullSoalText,
          '', '', '', '', '',
          'KUNCI', 'ISIAN', 'SEDANG', ''
        ]);
      }
      // 7. Paragraf (PARAGRAPH_TEXT) -> ESAI
      else if (itemType === FormApp.ItemType.PARAGRAPH_TEXT) {
        soalArray.push([
          finalMapel, finalKelas, String(noCounter++), fullSoalText,
          '', '', '', '', '',
          'kata kunci', 'ESAI', 'SEDANG', ''
        ]);
      }
    });

    return {
      success: true,
      title: form.getTitle(),
      total: soalArray.length,
      soal: soalArray
    };
  } catch (err) {
    return { success: false, message: 'Gagal mengimpor Google Form: ' + err.message };
  }
}

/**
 * IMPORT SOAL DARI GOOGLE DRIVE
 * Mendukung file Google Docs, Google Sheets, Google Form, .docx, .xlsx, .txt, .csv di Google Drive
 */
function importSoalFromGoogleDrive(driveUrlOrId, targetMapel, targetKelas) {
  try {
    if (!driveUrlOrId) {
      return { success: false, message: 'URL atau ID File Google Drive belum dimasukkan.' };
    }

    // Ekstrak ID File dari URL Google Drive
    var fileId = String(driveUrlOrId).trim();
    var match = fileId.match(/\/d\/([a-zA-Z0-9_-]+)/i) || 
                fileId.match(/id=([a-zA-Z0-9_-]+)/i) || 
                fileId.match(/^([a-zA-Z0-9_-]{20,})$/);
    if (match && match[1]) {
      fileId = match[1];
    }

    // Ambil file dari Google Drive
    var file;
    try {
      file = DriveApp.getFileById(fileId);
    } catch (eDrive) {
      return { success: false, message: 'File Google Drive tidak ditemukan atau Anda tidak memiliki akses: ' + eDrive.message };
    }

    var mimeType = file.getMimeType();
    var fileName = file.getName();
    var cleanMapel = (targetMapel || fileName.replace(/\.[^/.]+$/, '').replace(/^(soal|bank soal|ujian)\s*[-_:]*\s*/i, '') || 'Umum').trim();
    var cleanKelas = (targetKelas || 'Semua').trim();

    var soalArray = [];

    // 1. DOKUMEN GOOGLE DOCS ATAU FILE WORD TERBUKA
    if (mimeType === MimeType.GOOGLE_DOCS || mimeType === 'application/vnd.google-apps.document') {
      var doc = DocumentApp.openById(fileId);
      var body = doc.getBody();
      var tables = body.getTables();

      // Cek apakah ada tabel soal di Google Docs
      if (tables && tables.length > 0) {
        for (var t = 0; t < tables.length; t++) {
          var table = tables[t];
          var numRows = table.getNumRows();
          if (numRows < 2) continue;

          // Cek baris pertama sebagai header
          var firstRowTexts = [];
          var headerRow = table.getRow(0);
          for (var c = 0; c < headerRow.getNumCells(); c++) {
            firstRowTexts.push(headerRow.getCell(c).getText().trim().toLowerCase());
          }

          var hasHeader = firstRowTexts.some(function(txt) {
            return txt.indexOf('soal') !== -1 || txt.indexOf('nomor') !== -1 || txt.indexOf('no') !== -1 || txt.indexOf('kunci') !== -1;
          });

          var startRow = hasHeader ? 1 : 0;
          for (var r = startRow; r < numRows; r++) {
            var row = table.getRow(r);
            var numCells = row.getNumCells();
            if (numCells < 2) continue;

            var cellTexts = [];
            for (var c = 0; c < numCells; c++) {
              cellTexts.push(row.getCell(c).getText().trim());
            }

            // Pola tabel: [No, Soal, A, B, C, D, E, Kunci, Jenis, ...]
            var no = cellTexts[0] || String(soalArray.length + 1);
            var soal = cellTexts[1] || '';
            if (!soal && numCells > 2) {
              soal = cellTexts[2];
            }
            if (!soal) continue;

            var a = cellTexts[2] || '';
            var b = cellTexts[3] || '';
            var c = cellTexts[4] || '';
            var d = cellTexts[5] || '';
            var e = cellTexts[6] || '';
            var kunci = (cellTexts[7] || 'A').toUpperCase().trim();
            var jenis = (cellTexts[8] || 'PG').toUpperCase().trim();
            var tingkat = cellTexts[9] || 'SEDANG';
            var bobot = cellTexts[10] || '';

            if (!a && !b && !c && !d && !e) {
              jenis = jenis === 'ESAI' ? 'ESAI' : 'ISIAN';
            }

            soalArray.push([
              cleanMapel, cleanKelas, String(no), soal,
              a, b, c, d, e,
              kunci, jenis, tingkat, bobot
            ]);
          }
        }
      }

      // Jika tidak ada tabel atau tabel kosong, parse paragraf teks
      if (soalArray.length === 0) {
        var docText = body.getText();
        soalArray = parseRawQuestionText(docText, cleanMapel, cleanKelas);
      }
    }
    // 2. SPREADSHEET GOOGLE SHEETS
    else if (mimeType === MimeType.GOOGLE_SHEETS || mimeType === 'application/vnd.google-apps.spreadsheet') {
      var ss = SpreadsheetApp.openById(fileId);
      var sheet = ss.getSheets()[0];
      var data = sheet.getDataRange().getValues();

      if (data && data.length > 1) {
        var headers = data[0].map(function(h) { return String(h || '').trim().toLowerCase(); });
        var idxMapel = headers.indexOf('mata pelajaran');
        if (idxMapel === -1) idxMapel = headers.indexOf('mapel');

        var idxKelas = headers.indexOf('kelas');
        var idxNo = headers.indexOf('nomor');
        if (idxNo === -1) idxNo = headers.indexOf('no');

        var idxSoal = headers.indexOf('soal');
        if (idxSoal === -1) idxSoal = headers.indexOf('pertanyaan');

        var idxA = headers.indexOf('opsi a');
        if (idxA === -1) idxA = headers.indexOf('a');
        var idxB = headers.indexOf('opsi b');
        if (idxB === -1) idxB = headers.indexOf('b');
        var idxC = headers.indexOf('opsi c');
        if (idxC === -1) idxC = headers.indexOf('c');
        var idxD = headers.indexOf('opsi d');
        if (idxD === -1) idxD = headers.indexOf('d');
        var idxE = headers.indexOf('opsi e');
        if (idxE === -1) idxE = headers.indexOf('e');

        var idxKunci = headers.indexOf('kunci');
        if (idxKunci === -1) idxKunci = headers.indexOf('kunci jawaban');

        var idxJenis = headers.indexOf('jenis');
        if (idxJenis === -1) idxJenis = headers.indexOf('jenis soal');

        var idxTingkat = headers.indexOf('tingkat kesulitan');
        if (idxTingkat === -1) idxTingkat = headers.indexOf('kesulitan');

        var idxBobot = headers.indexOf('bobot');

        var useHeaders = idxSoal !== -1;

        for (var r = 1; r < data.length; r++) {
          var row = data[r];
          if (!row || row.every(function(cell) { return cell === '' || cell === null; })) continue;

          var rMapel = useHeaders && idxMapel !== -1 && row[idxMapel] ? String(row[idxMapel]).trim() : cleanMapel;
          var rKelas = useHeaders && idxKelas !== -1 && row[idxKelas] ? String(row[idxKelas]).trim() : cleanKelas;
          var rNo = useHeaders && idxNo !== -1 && row[idxNo] ? String(row[idxNo]).trim() : String(soalArray.length + 1);
          var rSoal = useHeaders && idxSoal !== -1 ? String(row[idxSoal] || '').trim() : String(row[3] || row[1] || '').trim();

          if (!rSoal) continue;

          var rA = useHeaders && idxA !== -1 ? String(row[idxA] || '').trim() : String(row[4] || row[2] || '').trim();
          var rB = useHeaders && idxB !== -1 ? String(row[idxB] || '').trim() : String(row[5] || row[3] || '').trim();
          var rC = useHeaders && idxC !== -1 ? String(row[idxC] || '').trim() : String(row[6] || row[4] || '').trim();
          var rD = useHeaders && idxD !== -1 ? String(row[idxD] || '').trim() : String(row[7] || row[5] || '').trim();
          var rE = useHeaders && idxE !== -1 ? String(row[idxE] || '').trim() : String(row[8] || row[6] || '').trim();

          var rKunci = useHeaders && idxKunci !== -1 ? String(row[idxKunci] || '').trim() : String(row[9] || 'A').trim();
          var rJenis = useHeaders && idxJenis !== -1 ? String(row[idxJenis] || '').trim() : String(row[10] || 'PG').trim();
          var rTingkat = useHeaders && idxTingkat !== -1 ? String(row[idxTingkat] || '').trim() : String(row[11] || 'SEDANG').trim();
          var rBobot = useHeaders && idxBobot !== -1 ? String(row[idxBobot] || '').trim() : String(row[12] || '').trim();

          soalArray.push([
            rMapel, rKelas, rNo, rSoal,
            rA, rB, rC, rD, rE,
            rKunci, rJenis || 'PG', rTingkat || 'SEDANG', rBobot
          ]);
        }
      }
    }
    // 3. GOOGLE FORM DI DRIVE
    else if (mimeType === MimeType.GOOGLE_FORMS || mimeType === 'application/vnd.google-apps.form') {
      return importSoalFromGoogleForm(fileId, cleanMapel, cleanKelas);
    }
    // 4. FILE WORD (.DOCX) DI DRIVE (Unzip XML)
    else if (mimeType.indexOf('wordprocessingml') !== -1 || fileName.toLowerCase().endsWith('.docx')) {
      try {
        var unzipped = Utilities.unzip(file.getBlob());
        var xmlContent = '';
        for (var i = 0; i < unzipped.length; i++) {
          if (unzipped[i].getName() === 'word/document.xml') {
            xmlContent = unzipped[i].getDataAsString();
            break;
          }
        }
        if (xmlContent) {
          var cleanXmlText = xmlContent
            .replace(/<\/w:p>/g, '\n')
            .replace(/<w:tab\/>/g, '\t')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"');
          soalArray = parseRawQuestionText(cleanXmlText, cleanMapel, cleanKelas);
        }
      } catch (eWord) {
        var rawDocx = file.getBlob().getDataAsString();
        soalArray = parseRawQuestionText(rawDocx, cleanMapel, cleanKelas);
      }
    }
    // 5. FILE TEKS, CSV, ATAU HTML DI DRIVE
    else {
      var rawContent = file.getBlob().getDataAsString();
      if (rawContent) {
        soalArray = parseRawQuestionText(rawContent, cleanMapel, cleanKelas);
      }
    }

    if (soalArray.length === 0) {
      return { 
        success: false, 
        message: 'Tidak ada soal yang berhasil diekstrak dari file "' + fileName + '". Pastikan file berisi format soal yang sesuai.' 
      };
    }

    return {
      success: true,
      fileName: fileName,
      mimeType: mimeType,
      total: soalArray.length,
      soal: soalArray
    };
  } catch (err) {
    return { success: false, message: 'Gagal mengimpor dari Google Drive: ' + err.message };
  }
}

/**
 * Helper parsing teks mentah pertanyaan menjadi array format Data_Soal
 */
function parseRawQuestionText(rawText, targetMapel, targetKelas) {
  var soalArray = [];
  if (!rawText) return soalArray;

  var lines = rawText.split(/\r?\n/);
  var currentSoal = null;
  var noCounter = 1;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    // Deteksi awal soal nomor: misal "1.", "1)", "Soal 1:"
    var noMatch = line.match(/^(?:Soal\s*)?(\d+)[\.\)]\s*(.*)/i);
    if (noMatch) {
      if (currentSoal && currentSoal.soal) {
        soalArray.push(buildSoalRow(currentSoal, targetMapel, targetKelas));
      }
      currentSoal = {
        no: noMatch[1] || String(noCounter++),
        soal: noMatch[2] || '',
        a: '', b: '', c: '', d: '', e: '',
        kunci: 'A',
        jenis: 'PG',
        tingkat: 'SEDANG',
        bobot: ''
      };
      continue;
    }

    if (!currentSoal) {
      currentSoal = {
        no: String(noCounter++),
        soal: line,
        a: '', b: '', c: '', d: '', e: '',
        kunci: 'A',
        jenis: 'PG',
        tingkat: 'SEDANG',
        bobot: ''
      };
      continue;
    }

    // Deteksi Opsi A, B, C, D, E
    var optMatch = line.match(/^([A-E])[\.\)]\s*(.*)/i);
    if (optMatch) {
      var letter = optMatch[1].toUpperCase();
      var optText = optMatch[2] || '';
      if (letter === 'A') currentSoal.a = optText;
      else if (letter === 'B') currentSoal.b = optText;
      else if (letter === 'C') currentSoal.c = optText;
      else if (letter === 'D') currentSoal.d = optText;
      else if (letter === 'E') currentSoal.e = optText;
      continue;
    }

    // Deteksi Kunci Jawaban
    var kunciMatch = line.match(/^(?:Kunci(?:\s*Jawaban)?|Jawaban|Ans(?:wer)?)\s*[:=]\s*([A-Ea-e0-9, ]+)/i);
    if (kunciMatch) {
      currentSoal.kunci = kunciMatch[1].toUpperCase().trim();
      continue;
    }

    // Deteksi Jenis Soal
    var jenisMatch = line.match(/^(?:Jenis(?:\s*Soal)?|Tipe)\s*[:=]\s*(PG|PGK|KOMPLEKS|BENAR-SALAH|BS|MENJODOHKAN|ISIAN|ESAI)/i);
    if (jenisMatch) {
      var jVal = jenisMatch[1].toUpperCase();
      if (jVal === 'KOMPLEKS') jVal = 'PGK';
      if (jVal === 'BS') jVal = 'BENAR-SALAH';
      currentSoal.jenis = jVal;
      continue;
    }

    // Jika baris lanjutan soal
    if (!currentSoal.a) {
      currentSoal.soal += ' ' + line;
    }
  }

  if (currentSoal && currentSoal.soal) {
    soalArray.push(buildSoalRow(currentSoal, targetMapel, targetKelas));
  }

  return soalArray;
}

function buildSoalRow(s, mapel, kelas) {
  var jenis = s.jenis || 'PG';
  if (!s.a && !s.b && !s.c && !s.d && !s.e) {
    if (jenis === 'PG') jenis = 'ISIAN';
  }
  return [
    mapel,
    kelas,
    String(s.no || '1'),
    s.soal || '',
    s.a || '',
    s.b || '',
    s.c || '',
    s.d || '',
    s.e || '',
    (s.kunci || 'A').toUpperCase().trim(),
    jenis,
    s.tingkat || 'SEDANG',
    s.bobot || ''
  ];
}

function saveProktorMasal(dataArray) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const sheet = getSheetSecure(ss, 'Data_Proktor', ['Username', 'Password', 'Nama']);
    sheet.clear();
    sheet.getRange(1, 1, 1, 3).setValues([['Username', 'Password', 'Nama']]);
    
    if (dataArray && dataArray.length > 0) {
        const rectData = normalizeRectangularArray(dataArray, 3);
        sheet.getRange(2, 1, rectData.length, 3).setNumberFormat('@').setValues(rectData);
    }
    SpreadsheetApp.flush(); return { success: true };
  } catch (e) { return { success: false, message: e.message }; } finally { lock.releaseLock(); }
}

function saveJadwalMasal(dataArray) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const sheet = getSheetSecure(ss, 'Jadwal_Ujian', ['Tanggal', 'Mata Pelajaran', 'Kelas', 'Ruang', 'Sesi', 'Jam Mulai', 'Jam Selesai', 'Token', 'Status', 'Proktor', 'Pengawas', 'Banyak Soal', 'Jenis Ujian']);
    sheet.clear();
    sheet.getRange(1, 1, 1, 13).setValues([['Tanggal', 'Mata Pelajaran', 'Kelas', 'Ruang', 'Sesi', 'Jam Mulai', 'Jam Selesai', 'Token', 'Status', 'Proktor', 'Pengawas', 'Banyak Soal', 'Jenis Ujian']]);
    
    if (dataArray && dataArray.length > 0) {
        const rectData = normalizeRectangularArray(dataArray, 13);
        sheet.getRange(2, 1, rectData.length, 13).setNumberFormat('@').setValues(rectData);
    }
    SpreadsheetApp.flush(); return { success: true };
  } catch (e) { return { success: false, message: e.message }; } finally { lock.releaseLock(); }
}

function saveSettingUjian(settings) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const sheet = getSheetSecure(ss, 'Setting_Ujian', ['Key', 'Value']);
    sheet.clear();
    let arr = [];
    for (let key in settings) {
        let val = settings[key] || '';
        if (typeof val === 'string' && val.length > 45000) {
            let chunks = [key];
            for (let i = 0; i < val.length; i += 45000) chunks.push(val.substring(i, i + 45000));
            arr.push(chunks);
        } else {
            arr.push([key, val]);
        }
    }
    let maxCols = 1;
    arr.forEach(r => { if(r.length > maxCols) maxCols = r.length; });
    arr.forEach(r => { while(r.length < maxCols) r.push(''); });

    if (arr.length > 0) sheet.getRange(1, 1, arr.length, maxCols).setValues(arr); 
    SpreadsheetApp.flush(); return { success: true };
  } catch (e) { return { success: false, message: e.message }; } finally { lock.releaseLock(); }
}

function clearHasilUjian() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const sheetHasil = getSheetSecure(ss, 'Hasil_Ujian', ['Timestamp', 'NIS', 'Nama', 'Token', 'Skor', 'Status']);
    sheetHasil.clear();
    sheetHasil.getRange(1, 1, 1, 6).setValues([['Timestamp', 'NIS', 'Nama', 'Token', 'Skor', 'Status']]);
    
    const sheetAnalisa = getSheetSecure(ss, 'Analisa_Jawaban', ['NIS', 'Nama', 'Token', 'Jawaban', 'Detail_Analisa']);
    sheetAnalisa.clear();
    sheetAnalisa.getRange(1, 1, 1, 5).setValues([['NIS', 'Nama', 'Token', 'Jawaban', 'Detail_Analisa']]);

    const sheetTemp = getSheetSecure(ss, 'Sesi_Sementara', ['NIS', 'Jawaban', 'Waktu']);
    sheetTemp.clear();

    const sheetSiswa = getSheetSecure(ss, 'Data_Siswa', ['NIS', 'Nama', 'Kelas', 'Sesi', 'Password', 'Status']);
    const dataSiswa = sheetSiswa.getDataRange().getDisplayValues();
    for (let i = 1; i < dataSiswa.length; i++) {
      if (dataSiswa[i][0]) sheetSiswa.getRange(i + 1, 6).setValue('Offline');
    }
    
    getSheetSecure(ss, "Pengikatan_Device", ["NIS", "DeviceId", "InfoDevice"]).clear();
    getSheetSecure(ss, "Log_Foto", ["Timestamp", "NIS", "Nama", "FotoBase64", "TokenSesi"]).clear();

    const sheetRuang = getSheetSecure(ss, 'Ruang_Siswa', ['NIS', 'Ruang', 'UpdatedAt']);
    sheetRuang.clear();
    sheetRuang.getRange(1, 1, 1, 3).setValues([['NIS', 'Ruang', 'UpdatedAt']]);

    SpreadsheetApp.flush(); return { success: true };
  } catch (e) { return { success: false, message: e.message }; } finally { lock.releaseLock(); }
}

function logStudentActivityInternal(ss, nis, nama, aktivitas, detail, ip, browser) {
  try {
    const sheetLog = getSheetSecure(ss, "Log_Aktivitas", ['Timestamp', 'NIS', 'Nama', 'Aktivitas', 'Detail', 'IP', 'Browser']);
    const timestamp = new Date().toLocaleString('id-ID');
    const cleanNis = String(nis || '').trim().replace(/^'+/, '');
    const nextRow = Math.max(sheetLog.getLastRow() + 1, 1);
    sheetLog.getRange(nextRow, 2).setNumberFormat('@');
    sheetLog.getRange(nextRow, 1, 1, 7).setValues([[timestamp, cleanNis, nama, aktivitas, detail, ip, browser]]);
  } catch (e) {}
}

function laporKecurangan(nis, nama, alasan) {
  try {
    const ss = getSpreadsheet();
    const detail = alasan && String(alasan).trim() ? String(alasan).trim() : 'Siswa terdeteksi membuka Tab lain / Layar Ujian Terminimize';
    logStudentActivityInternal(ss, nis, nama, 'Pelanggaran', detail, 'Lockdown Mode', "");
    return { success: true };
  } catch(e) { return { success: false }; }
}

// FITUR BARU: Deteksi dan Pelaporan Suara Bising (Audio Anti-Cheat)
function laporSuaraMencurigakan(nis, nama) {
  try {
    const ss = getSpreadsheet();
    logStudentActivityInternal(ss, nis, nama, 'Pelanggaran Suara', 'Terdeteksi percakapan/suara mencurigakan di atas ambang batas (Voice Monitoring)', 'Sistem AI Audio', "");
    return { success: true };
  } catch(e) { return { success: false }; }
}

function normalizeNisKey_(val) {
  return String(val || '').trim().replace(/^'+/, '').toLowerCase();
}

function stripLeadingZeroNisKey_(val) {
  return String(val || '').trim().replace(/^'+/, '').replace(/^0+(?=\d)/, '').toLowerCase();
}

function isSameNis_(a, b) {
  const ka = normalizeNisKey_(a);
  const kb = normalizeNisKey_(b);
  if (!ka || !kb) return false;
  return ka === kb || stripLeadingZeroNisKey_(ka) === stripLeadingZeroNisKey_(kb);
}

function appendTextKeyRow_(sheet, rowValues) {
  const nextRow = Math.max(sheet.getLastRow() + 1, 1);
  const cleanRow = rowValues.map(v => (v === null || v === undefined) ? '' : v);
  sheet.getRange(nextRow, 1).setNumberFormat('@');
  sheet.getRange(nextRow, 1, 1, cleanRow.length).setValues([cleanRow]);
  return nextRow;
}

function normalizeRuangCanonical_(val) {
  const raw = String(val || '').trim();
  if (!raw) return '';
  const cleaned = raw.toLowerCase().replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').replace(/\b0+(\d+)/g, '$1');
  const m = cleaned.match(/^(?:ruang|ruangan|r)?\s*(\d{1,2})$/i);
  if (m) return 'Ruang ' + parseInt(m[1], 10);
  return raw;
}

function upsertRuangSiswaInternal(ss, nis, ruangSiswa) {
  try {
    const cleanNis = String(nis || '').trim().replace(/^'+/, '');
    const cleanRuang = normalizeRuangCanonical_(ruangSiswa);
    if (!cleanNis || !cleanRuang) return;
    const sheetRuang = getSheetSecure(ss, 'Ruang_Siswa', ['NIS', 'Ruang', 'UpdatedAt']);
    const rows = sheetRuang.getDataRange().getDisplayValues();
    let rowIdx = -1;
    for (let i = 1; i < rows.length; i++) {
      if (isSameNis_(rows[i][0], cleanNis)) {
        rowIdx = i + 1;
        break;
      }
    }
    const ts = new Date().toLocaleString('id-ID');
    if (rowIdx > -1) {
      sheetRuang.getRange(rowIdx, 1).setNumberFormat('@').setValue(cleanNis);
      sheetRuang.getRange(rowIdx, 2).setValue(cleanRuang);
      sheetRuang.getRange(rowIdx, 3).setValue(ts);
    } else {
      appendTextKeyRow_(sheetRuang, [cleanNis, cleanRuang, ts]);
    }
  } catch (e) {}
}

function saveRuangSiswa(nis, ruangSiswa) {
  try {
    const cleanNis = String(nis || '').trim().replace(/^'+/, '');
    const cleanRuang = normalizeRuangCanonical_(ruangSiswa);
    if (!cleanNis || !cleanRuang) return { success: false };
    const ss = getSpreadsheet();
    upsertRuangSiswaInternal(ss, cleanNis, cleanRuang);
    SpreadsheetApp.flush();
    return { success: true, ruang: cleanRuang };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function saveJawabanSementara(nis, answersString, timeLeft, ruangSiswa, totalSoal) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(3000); 
    const ss = getSpreadsheet();
    const cleanNis = String(nis || '').trim().replace(/^'+/, '');
    
    const sheetSiswa = getSheetSecure(ss, "Data_Siswa");
    const dataSiswa = sheetSiswa.getDataRange().getDisplayValues();
    let isSelesai = false;
    for (let i = 1; i < dataSiswa.length; i++) {
      if (isSameNis_(dataSiswa[i][0], cleanNis)) {
        if (dataSiswa[i][5] === 'Selesai') isSelesai = true;
        break;
      }
    }
    if (ruangSiswa && String(ruangSiswa).trim() !== '') {
      upsertRuangSiswaInternal(ss, cleanNis, ruangSiswa);
    }
    if (isSelesai) {
        try {
            const sheetTemp = getSheetSecure(ss, 'Sesi_Sementara', ['NIS', 'Jawaban', 'Waktu', 'TotalSoal']);
            const tempVals = sheetTemp.getDataRange().getDisplayValues();
            for(let j=1; j<tempVals.length; j++) {
                if(isSameNis_(tempVals[j][0], cleanNis)) {
                    sheetTemp.deleteRow(j+1); break;
                }
            }
        } catch(e) {}
        return { success: true, forceStop: true };
    }

    const sheetTemp = getSheetSecure(ss, 'Sesi_Sementara', ['NIS', 'Jawaban', 'Waktu', 'TotalSoal']);
    const data = sheetTemp.getDataRange().getDisplayValues();
    let rowFound = -1;
    for(let i=1; i<data.length; i++) {
        if(isSameNis_(data[i][0], cleanNis)) { rowFound = i+1; break; }
    }
    const cleanTotal = totalSoal !== undefined && totalSoal !== null ? Number(totalSoal) || 0 : '';
    if(rowFound > -1) {
        sheetTemp.getRange(rowFound, 1).setNumberFormat('@').setValue(cleanNis);
        sheetTemp.getRange(rowFound, 2).setValue(answersString);
        sheetTemp.getRange(rowFound, 3).setValue(timeLeft);
        if (cleanTotal !== '') sheetTemp.getRange(rowFound, 4).setValue(cleanTotal);
    } else {
        appendTextKeyRow_(sheetTemp, [cleanNis, answersString, timeLeft, cleanTotal]);
    }
    SpreadsheetApp.flush();
    return { success: true, forceStop: false };
  } catch(e) { return { success: false, forceStop: false }; } finally { lock.releaseLock(); }
}

function uploadWebcamLog(nis, nama, fotoBase64, token) {
  try {
    const ss = getSpreadsheet();
    const sheetFoto = getSheetSecure(ss, "Log_Foto", ["Timestamp", "NIS", "Nama", "FotoBase64", "TokenSesi"]);
    const timestamp = new Date().toLocaleString('id-ID');
    sheetFoto.appendRow([timestamp, nis, nama, fotoBase64, token]);
    return { success: true };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function normalizeRombel(str) {
  if (!str) return '';
  let s = String(str).toLowerCase().trim();
  s = s.replace(/^(?:kelas|tingkat|rombel)\s*/i, '').replace(/[\s\-_]/g, '');
  return s;
}

function matchKelasLevel(kelasSiswa, kelasTarget) {
  const rawTarget = String(kelasTarget || '').trim();
  // Dukung banyak kelas dipisah koma, titik koma, garis miring, atau pipe (misal: "XII IPA 1, XII IPA 2")
  if (/[,;/|]/.test(rawTarget)) {
    const parts = rawTarget.split(/[,;/|]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.some(p => matchKelasLevel(kelasSiswa, p));
    }
  }

  const normSiswa = normalizeRombel(kelasSiswa);
  const normTarget = normalizeRombel(rawTarget);

  if (!normTarget || normTarget === 'semua' || normTarget === 'umum' || normTarget === 'all') {
    return true; // Terbuka untuk seluruh kelas
  }
  if (!normSiswa) return false;
  if (normSiswa === normTarget) return true; // Sama persis (misal 3a === 3a, 3b === 3b)

  const parseParts = (s) => {
    let t = s;
    if (/^xii/i.test(t)) t = t.replace(/^xii/i, '12');
    else if (/^xi/i.test(t)) t = t.replace(/^xi/i, '11');
    else if (/^x/i.test(t)) t = t.replace(/^x/i, '10');
    else if (/^ix/i.test(t)) t = t.replace(/^ix/i, '9');
    else if (/^viii/i.test(t)) t = t.replace(/^viii/i, '8');
    else if (/^vii/i.test(t)) t = t.replace(/^vii/i, '7');
    else if (/^vi/i.test(t)) t = t.replace(/^vi/i, '6');
    else if (/^v/i.test(t)) t = t.replace(/^v/i, '5');
    else if (/^iv/i.test(t)) t = t.replace(/^iv/i, '4');
    else if (/^iii/i.test(t)) t = t.replace(/^iii/i, '3');
    else if (/^ii/i.test(t)) t = t.replace(/^ii/i, '2');
    else if (/^i/i.test(t)) t = t.replace(/^i/i, '1');

    const m = t.match(/^(\d+)(.*)$/);
    if (m) {
      return { tingkat: m[1], rombel: m[2] };
    }
    return { tingkat: '', rombel: t };
  };

  const pSiswa = parseParts(normSiswa);
  const pTarget = parseParts(normTarget);

  // Jika tingkat berbeda (misal tingkat 3 vs tingkat 4), PASTI SALAH
  if (pSiswa.tingkat && pTarget.tingkat && pSiswa.tingkat !== pTarget.tingkat) {
    return false;
  }

  // Jika target memiliki rombel/jurusan (misal "12ipa" atau "12ipa1"):
  if (pTarget.rombel) {
    if (pSiswa.rombel === pTarget.rombel) return true;
    // Dukung target jurusan tanpa nomor (misal target "XII IPA" cocok untuk "XII IPA 1", "XII IPA 2")
    if (pTarget.rombel.length >= 2) {
      const esc = pTarget.rombel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp('^' + esc + '\\d+$', 'i').test(pSiswa.rombel)) return true;
    }
    return false;
  }

  // Jika target HANYA menyebut tingkatan tanpa rombel (misal target "3" atau "X"):
  if (!pTarget.rombel && pTarget.tingkat && pSiswa.tingkat === pTarget.tingkat) {
    return true;
  }

  return false;
}

function loginSiswa(nis, password, token, deviceId, deviceDesc) {
  try {
    const ss = getSpreadsheet();
    const sheet = getSheetSecure(ss, "Data_Siswa", ['NIS', 'Nama', 'Kelas', 'Sesi', 'Password', 'Status']);
    const data = sheet.getDataRange().getDisplayValues();
    
    let userFound = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(nis).trim() && String(data[i][4]).trim() === String(password).trim()) {
        userFound = { row: i + 1, nis: data[i][0], nama: data[i][1], kelas: data[i][2], sesi: data[i][3], statusLogin: data[i][5] || 'Offline' };
        break;
      }
    }

    if (!userFound) return { success: false, message: "NIS atau Password salah!" };

    // Validasi Riwayat
    const sheetHasil = getSheetSecure(ss, 'Hasil_Ujian', ['Timestamp', 'NIS', 'Nama', 'Token', 'Skor', 'Status']);
    const dataHasil = sheetHasil.getDataRange().getDisplayValues();
    
    // Tarik Rapor (Riwayat) Siswa untuk Dasbor (filter index > 0 agar baris header tidak masuk)
    const riwayatSiswa = dataHasil.filter((r, idx) => idx > 0 && String(r[1]).trim() === String(nis).trim() && r[0]).map(r => ({
        tanggal: r[0], token: r[3], skor: r[4], status: r[5]
    }));
    userFound.riwayat = riwayatSiswa;

    if (token) {
        for(let k=1; k<dataHasil.length; k++){
            if(String(dataHasil[k][1]).trim() === String(nis).trim() && String(dataHasil[k][3]).trim().toUpperCase() === String(token).trim().toUpperCase()){
                return { success: false, message: "Anda sudah menyelesaikan ujian untuk Sesi / Mata Pelajaran ini." };
            }
        }
    }

    if (deviceId) {
        const sheetDevice = getSheetSecure(ss, "Pengikatan_Device", ["NIS", "DeviceId", "InfoDevice"]);
        const dataDevice = sheetDevice.getDataRange().getDisplayValues();
        let boundDevice = null;
        for (let x = 1; x < dataDevice.length; x++) {
            if (isSameNis_(dataDevice[x][0], userFound.nis)) {
                boundDevice = dataDevice[x][1];
                break;
            }
        }
        if (boundDevice) {
            if (boundDevice !== deviceId) return { success: false, message: "Kunci Perangkat Aktif! Akun ini terikat pada perangkat lain. Minta Proktor untuk reset akun Anda." };
        } else appendTextKeyRow_(sheetDevice, [userFound.nis, deviceId, deviceDesc || 'Unknown Browser']);
    }

    if (userFound.statusLogin === 'Sedang Ujian') return { success: false, message: "Akun sedang aktif di perangkat lain. Lapor ke proktor untuk mereset akun." };

    let tempState = null;
    try {
        const sheetTemp = getSheetSecure(ss, 'Sesi_Sementara', ['NIS', 'Jawaban', 'Waktu']);
        const tempVals = sheetTemp.getDataRange().getDisplayValues();
        for(let j=1; j<tempVals.length; j++) {
            if(isSameNis_(tempVals[j][0], userFound.nis)) {
                tempState = { answers: tempVals[j][1], timeLeft: parseInt(tempVals[j][2]) }; break;
            }
        }
    } catch(e) {}
    userFound.tempState = tempState;

        // Cari Jadwal Ujian Aktif yang cocok khusus untuk Kelas Rombel dan Sesi Siswa
    let activeMapel = '';
    let activeRuang = 'Ruang 1';
    let activeJenisUjian = 'CBT';
    try {
      const sheetJadwal = getSheetSecure(ss, 'Jadwal_Ujian', ['Tanggal', 'Mata Pelajaran', 'Kelas', 'Ruang', 'Sesi', 'Jam Mulai', 'Jam Selesai', 'Token', 'Status', 'Proktor', 'Pengawas', 'Banyak Soal', 'Jenis Ujian']);
      const dataJadwal = sheetJadwal.getDataRange().getDisplayValues();
      for (let j = 1; j < dataJadwal.length; j++) {
        const jRow = dataJadwal[j];
        const jMapel = String(jRow[1] || '').trim();
        const jKelas = String(jRow[2] || '').trim();
        const jSesi = String(jRow[4] || '').trim();
        const jStatus = String(jRow[8] || 'Aktif').trim();

        if (jStatus.toLowerCase() === 'aktif' || !jStatus) {
          const sesiMatch = !jSesi || jSesi.toLowerCase() === 'semua' || String(jSesi).trim() === String(userFound.sesi).trim();
          const kelasMatch = matchKelasLevel(userFound.kelas, jKelas);

          if (sesiMatch && kelasMatch && jMapel) {
            activeMapel = jMapel;
            activeRuang = jRow[3] || 'Ruang 1';
            activeJenisUjian = jRow[12] || 'CBT';
            break;
          }
        }
      }
    } catch(e) {}

    userFound.mapel = activeMapel || 'Umum';
    userFound.ruang = activeRuang;
    userFound.jenis_ujian = activeJenisUjian;

    try {
      const sheetRuang = getSheetSecure(ss, 'Ruang_Siswa', ['NIS', 'Ruang', 'UpdatedAt']);
      const rowsRuang = sheetRuang.getDataRange().getDisplayValues();
      for (let r = 1; r < rowsRuang.length; r++) {
        if (isSameNis_(rowsRuang[r][0], userFound.nis)) {
          userFound.selectedRuang = normalizeRuangCanonical_(rowsRuang[r][1]);
          break;
        }
      }
    } catch (eR) {}

    // Cek apakah ada Link Google Form aktif yang cocok untuk Kelas dan Mapel siswa
    const matchedGForm = findMatchingGoogleFormLink(ss, userFound.kelas, activeMapel);
    if (matchedGForm) {
      userFound.gformLink = matchedGForm;
      if (!activeMapel || activeMapel === 'Umum') {
        userFound.mapel = matchedGForm.mapel || userFound.mapel;
      }
      userFound.jenis_ujian = 'Google Form CBT';
    }

    sheet.getRange(userFound.row, 6).setValue('Sedang Ujian');
    logStudentActivityInternal(ss, userFound.nis, userFound.nama, 'Login', 'Siswa berhasil login sesi baru', 'Sistem', "");
    SpreadsheetApp.flush();
    return { success: true, data: userFound };
  } catch (error) { return { success: false, message: "Kesalahan server: " + error.message }; }
}

/**
 * MANAJEMEN LINK GOOGLE FORM (UNTUK TAMPILAN UJIAN GOOGLE FORM DI CBT SISWA)
 */
function extractGoogleFormIdAndUrl(input) {
  const clean = String(input || '').trim();
  const isShortUrl = /forms\.gle\//i.test(clean);
  const pubMatch = clean.match(/\/forms\/(?:u\/\d+\/)?d\/e\/([a-zA-Z0-9_-]{15,})/i);
  const editMatch = clean.match(/\/forms\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{15,})/i);
  const idParamMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]{15,})/i);
  let formId = clean;
  let isPublishedId = false;
  if (pubMatch) {
    formId = pubMatch[1];
    isPublishedId = true;
  } else if (editMatch) {
    formId = editMatch[1];
  } else if (idParamMatch) {
    formId = idParamMatch[1];
  } else if (/^1FAIpQL[a-zA-Z0-9_-]+$/.test(clean)) {
    isPublishedId = true;
  }
  return { clean: clean, formId: formId, isPublishedId: isPublishedId, isShortUrl: isShortUrl };
}

function extractFbPublicLoadData(html) {
  if (!html) return null;
  const markerMatch = html.match(/(?:var\s+)?FB_PUBLIC_LOAD_DATA_\s*=\s*/);
  if (!markerMatch) return null;
  const startSearch = markerMatch.index + markerMatch[0].length;
  const bracketStart = html.indexOf('[', startSearch);
  if (bracketStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = bracketStart; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '[') {
      depth++;
    } else if (ch === ']') {
      depth--;
      if (depth === 0) {
        const jsonStr = html.slice(bracketStart, i + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          return null;
        }
      }
    }
  }
  return null;
}

function saveGoogleFormLinks(dataArray) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const headers = ['Mapel', 'Kelas', 'FormUrl', 'FormId', 'Status', 'JudulForm', 'Timestamp'];
    const sheet = getSheetSecure(ss, 'Link_GoogleForm', headers);
    sheet.clear();
    sheet.getRange(1, 1, 1, 7).setValues([headers]);

    if (dataArray && dataArray.length > 0) {
      const rectData = normalizeRectangularArray(dataArray, 7);
      sheet.getRange(2, 1, rectData.length, 7).setNumberFormat('@').setValues(rectData);
    }
    SpreadsheetApp.flush();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}

function listGoogleFormsFromDrive(searchQuery) {
  try {
    const q = String(searchQuery || '').toLowerCase().trim();
    let filesIter;
    try {
      filesIter = DriveApp.searchFiles("mimeType = 'application/vnd.google-apps.form' and trashed = false");
    } catch (eSearch) {
      filesIter = DriveApp.getFilesByType(MimeType.GOOGLE_FORMS);
    }

    const forms = [];
    let checked = 0;
    while (filesIter.hasNext() && checked < 200) {
      const file = filesIter.next();
      checked++;
      const name = String(file.getName() || 'Tanpa Judul');
      if (q && name.toLowerCase().indexOf(q) === -1) continue;

      let updatedMs = 0;
      let updatedStr = '';
      try {
        const dt = file.getLastUpdated();
        if (dt) {
          updatedMs = dt.getTime();
          updatedStr = Utilities.formatDate(dt, Session.getScriptTimeZone() || 'Asia/Jakarta', 'dd/MM/yyyy HH:mm');
        }
      } catch (eDt) {}

      let ownerStr = '';
      try {
        const ow = file.getOwner();
        if (ow) ownerStr = ow.getName() || ow.getEmail() || '';
      } catch (eOw) {}

      forms.push({
        id: file.getId(),
        name: name,
        url: file.getUrl() || ('https://docs.google.com/forms/d/' + file.getId() + '/edit'),
        lastUpdated: updatedStr,
        updatedMs: updatedMs,
        owner: ownerStr
      });
    }

    forms.sort((a, b) => (b.updatedMs || 0) - (a.updatedMs || 0));
    return { success: true, forms: forms.slice(0, 60) };
  } catch (err) {
    return { success: false, message: 'Gagal membaca daftar Google Form dari Google Drive akun ini: ' + err.message };
  }
}

function inspectGoogleFormLink(formUrlOrId) {
  try {
    const info = loadGoogleFormExam(formUrlOrId, '');
    if (!info || !info.success) {
      return { success: false, message: (info && info.message) || 'Tidak dapat membaca Google Form tersebut.' };
    }
    const questionCount = (info.items || []).filter(it => !['SECTION_HEADER', 'IMAGE', 'VIDEO'].includes(it.tipe)).length;
    return {
      success: true,
      formId: info.formId,
      title: info.formTitle,
      description: info.formDescription,
      itemCount: questionCount,
      submitMode: info.submitMode,
      publishedUrl: info.formUrl
    };
  } catch (err) {
    return { success: false, message: 'Gagal memeriksa Google Form: ' + err.message };
  }
}

function findMatchingGoogleFormLink(ss, kelasSiswa, mapelAktif) {
  try {
    const sheet = getSheetSecure(ss, 'Link_GoogleForm', ['Mapel', 'Kelas', 'FormUrl', 'FormId', 'Status', 'JudulForm', 'Timestamp']);
    const data = sheet.getDataRange().getDisplayValues();
    if (!data || data.length <= 1) return null;

    const targetMapel = String(mapelAktif || '').toLowerCase().trim();
    const hasSpecificMapel = targetMapel && targetMapel !== 'umum' && targetMapel !== 'semua';

    const activeRows = [];
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      const mapel = String(r[0] || '').trim();
      const kelas = String(r[1] || 'Semua').trim();
      const formUrl = String(r[2] || '').trim();
      const formId = String(r[3] || '').trim();
      const status = String(r[4] || 'Aktif').trim().toLowerCase();
      const judulForm = String(r[5] || '').trim();

      if ((status === 'aktif' || !status) && (formUrl || formId)) {
        if (matchKelasLevel(kelasSiswa, kelas)) {
          const rMapelLower = mapel.toLowerCase();
          const mapelMatch = hasSpecificMapel && (rMapelLower === targetMapel || rMapelLower.includes(targetMapel) || targetMapel.includes(rMapelLower));
          const normK = normalizeRombel(kelas);
          const isGeneralClass = !normK || normK === 'semua' || normK === 'umum' || normK === 'all';
          activeRows.push({
            mapel: mapel || 'Umum',
            kelas: kelas,
            formUrl: formUrl || formId,
            formId: formId,
            judulForm: judulForm,
            priority: (mapelMatch ? 10 : 0) + (!isGeneralClass ? 5 : 1)
          });
        }
      }
    }

    if (activeRows.length === 0) return null;
    activeRows.sort((a, b) => b.priority - a.priority);
    return activeRows[0];
  } catch (e) {
    return null;
  }
}

function loadGoogleFormExam(formUrlOrId, targetMapel) {
  try {
    if (!formUrlOrId || String(formUrlOrId).trim() === '') {
      return { success: false, message: 'URL atau ID Google Form kosong.' };
    }
    const parsed = extractGoogleFormIdAndUrl(formUrlOrId);
    const cleanInput = parsed.clean;

    // METODE A: Gunakan FormApp Native (mendukung Edit URL / ID Form dari Drive, kunci kuis, dan submit langsung via FormApp)
    let formAppErr = '';
    if (!parsed.isPublishedId && !parsed.isShortUrl) {
      let form = null;
      try { form = FormApp.openById(parsed.formId); } catch (e1) {
        formAppErr = e1 && e1.message ? String(e1.message) : '';
        try { form = FormApp.openByUrl(cleanInput); } catch (e2) {
          form = null;
          if (!formAppErr && e2 && e2.message) formAppErr = String(e2.message);
        }
      }

      if (form) {
        const items = form.getItems();
        const formTitle = form.getTitle() || targetMapel || 'Ujian Google Form';
        const formDescription = form.getDescription() || '';
        const isQuiz = form.isQuiz();
        let publishedUrl = '';
        try { publishedUrl = form.getPublishedUrl(); } catch (ePub) { publishedUrl = cleanInput; }

        const formattedItems = [];
        const stripGFormNum = (str) => {
          if (str === undefined || str === null) return '';
          let s = String(str).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ').trim();
          let prev = '';
          while (s !== prev) {
            prev = s;
            s = s
              .replace(/^\s*(?:(?:No\.?|Nomor|Nomer|Soal|Pertanyaan)\s*(?:No\.?|Nomor|#)?\s*\d{1,3}\s*[.:)\-–—]?\s+)/i, '')
              .replace(/^\s*[\(\[]\s*\d{1,3}\s*[\)\]]\s*[.:)\-–—]?\s*/, '')
              .replace(/^\s*\d{1,3}(?:\.\d{1,2})?\s*[.):\-–—]\s+(?=\S)/, '')
              .replace(/^\s*\d{1,3}[.)](?=[^\d\s.,])/, '')
              .replace(/^\s*\d{1,3}\s+(?=(?:Nama|Kelas|NIS|NISN|No\.?|Nomor|Nomer|Absen|Ruang|Sesi|Token|Mapel|Mata\s+Pelajaran|Tanggal|Hari|Sekolah|Asal|Identitas|Biodata|Pilih|Isilah|Bacalah|Perhatikan|Tentukan|Berapakah|Mengapa|Apa|Siapa|Dimana|Kapan|Bagaimana|Jelaskan)\b)/i, '')
              .trim();
          }
          return s || String(str).trim();
        };
        const sections = [{ index: 0, title: formTitle, description: formDescription }];
        let currentSectionIdx = 0;
        let totalImageBytes = 0;

        items.forEach(item => {
          const itemType = item.getType();
          const itemId = String(item.getId());
          const rawTitle = item.getTitle() ? item.getTitle().trim() : '';
          const title = stripGFormNum(rawTitle) || rawTitle;
          const helpText = item.getHelpText() ? item.getHelpText().trim() : '';

          if (itemType === FormApp.ItemType.PAGE_BREAK) {
            currentSectionIdx++;
            sections.push({ index: currentSectionIdx, title: title || ('Bagian ' + (currentSectionIdx + 1)), description: helpText });
            return;
          }

          if (itemType === FormApp.ItemType.SECTION_HEADER) {
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              tipe: 'SECTION_HEADER',
              sectionIndex: currentSectionIdx,
              opsi: []
            });
            return;
          }

          if (itemType === FormApp.ItemType.IMAGE) {
            let imgDataUrl = '';
            try {
              const imgBlob = item.asImageItem().getImage();
              if (imgBlob) {
                const bytes = imgBlob.getBytes();
                if (bytes && bytes.length < 250000 && (totalImageBytes + bytes.length) < 1200000) {
                  totalImageBytes += bytes.length;
                  imgDataUrl = 'data:' + (imgBlob.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(bytes);
                }
              }
            } catch (eImg) {}
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              imageDataUrl: imgDataUrl,
              tipe: 'IMAGE',
              sectionIndex: currentSectionIdx,
              opsi: []
            });
            return;
          }

          if (itemType === FormApp.ItemType.MULTIPLE_CHOICE) {
            const mc = item.asMultipleChoiceItem();
            const choices = mc.getChoices();
            const opsi = choices.map(c => c.getValue() !== undefined && c.getValue() !== null ? String(c.getValue()) : '');
            let kunci = '';
            choices.forEach((c, idx) => {
              try { if (c.isCorrectAnswer && c.isCorrectAnswer()) kunci = String.fromCharCode(65 + idx); } catch (e) {}
            });
            let isReq = false;
            try { isReq = mc.isRequired(); } catch (e) {}
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              opsi: opsi,
              hasOther: mc.hasOtherOption ? mc.hasOtherOption() : false,
              kunci: kunci,
              tipe: 'PG',
              isRequired: isReq,
              sectionIndex: currentSectionIdx,
              kesulitan: 'SEDANG'
            });
          } else if (itemType === FormApp.ItemType.CHECKBOX) {
            const cb = item.asCheckboxItem();
            const choices = cb.getChoices();
            const opsi = choices.map(c => c.getValue() !== undefined && c.getValue() !== null ? String(c.getValue()) : '');
            const correctList = [];
            choices.forEach((c, idx) => {
              try { if (c.isCorrectAnswer && c.isCorrectAnswer()) correctList.push(String.fromCharCode(65 + idx)); } catch (e) {}
            });
            let isReq = false;
            try { isReq = cb.isRequired(); } catch (e) {}
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              opsi: opsi,
              hasOther: cb.hasOtherOption ? cb.hasOtherOption() : false,
              kunci: correctList.join(','),
              tipe: 'PG_KOMPLEKS',
              isRequired: isReq,
              sectionIndex: currentSectionIdx,
              kesulitan: 'SEDANG'
            });
          } else if (itemType === FormApp.ItemType.LIST) {
            const li = item.asListItem();
            const choices = li.getChoices();
            const opsi = choices.map(c => c.getValue() !== undefined && c.getValue() !== null ? String(c.getValue()) : '');
            let kunci = '';
            choices.forEach((c, idx) => {
              try { if (c.isCorrectAnswer && c.isCorrectAnswer()) kunci = String.fromCharCode(65 + idx); } catch (e) {}
            });
            let isReq = false;
            try { isReq = li.isRequired(); } catch (e) {}
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              opsi: opsi,
              kunci: kunci,
              tipe: 'DROPDOWN',
              isRequired: isReq,
              sectionIndex: currentSectionIdx,
              kesulitan: 'SEDANG'
            });
          } else if (itemType === FormApp.ItemType.GRID) {
            const gr = item.asGridItem();
            const rows = gr.getRows() || [];
            const cols = gr.getColumns() || [];
            const isBS = cols.length === 2 && cols.some(c => /benar|true/i.test(String(c))) && cols.some(c => /salah|false/i.test(String(c)));
            let isReq = false;
            try { isReq = gr.isRequired(); } catch (e) {}
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              opsi: rows,
              gridRows: rows,
              gridCols: cols,
              kunci: '',
              tipe: isBS ? 'BENAR_SALAH' : 'GRID',
              isRequired: isReq,
              sectionIndex: currentSectionIdx,
              kesulitan: 'SEDANG'
            });
          } else if (itemType === FormApp.ItemType.CHECKBOX_GRID) {
            const cgr = item.asCheckboxGridItem();
            const rows = cgr.getRows() || [];
            const cols = cgr.getColumns() || [];
            let isReq = false;
            try { isReq = cgr.isRequired(); } catch (e) {}
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              opsi: rows,
              gridRows: rows,
              gridCols: cols,
              kunci: '',
              tipe: 'CHECKBOX_GRID',
              isRequired: isReq,
              sectionIndex: currentSectionIdx,
              kesulitan: 'SEDANG'
            });
          } else if (itemType === FormApp.ItemType.SCALE) {
            const sc = item.asScaleItem();
            let isReq = false;
            try { isReq = sc.isRequired(); } catch (e) {}
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              opsi: [],
              scaleMin: sc.getLowerBound(),
              scaleMax: sc.getUpperBound(),
              scaleLeftLabel: sc.getLeftLabel() || '',
              scaleRightLabel: sc.getRightLabel() || '',
              kunci: '',
              tipe: 'SCALE',
              isRequired: isReq,
              sectionIndex: currentSectionIdx,
              kesulitan: 'SEDANG'
            });
          } else if (itemType === FormApp.ItemType.TEXT) {
            const tx = item.asTextItem();
            let isReq = false;
            try { isReq = tx.isRequired(); } catch (e) {}
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              opsi: [],
              kunci: '',
              tipe: 'ISIAN',
              isRequired: isReq,
              sectionIndex: currentSectionIdx,
              kesulitan: 'SEDANG'
            });
          } else if (itemType === FormApp.ItemType.PARAGRAPH_TEXT) {
            const pt = item.asParagraphTextItem();
            let isReq = false;
            try { isReq = pt.isRequired(); } catch (e) {}
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              opsi: [],
              kunci: '',
              tipe: 'ESAI',
              isRequired: isReq,
              sectionIndex: currentSectionIdx,
              kesulitan: 'SEDANG'
            });
          } else if (itemType === FormApp.ItemType.DATE) {
            const dt = item.asDateItem();
            let isReq = false;
            try { isReq = dt.isRequired(); } catch (e) {}
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              opsi: [],
              kunci: '',
              tipe: 'DATE',
              isRequired: isReq,
              sectionIndex: currentSectionIdx,
              kesulitan: 'SEDANG'
            });
          } else if (itemType === FormApp.ItemType.TIME) {
            const tm = item.asTimeItem();
            let isReq = false;
            try { isReq = tm.isRequired(); } catch (e) {}
            formattedItems.push({
              id: formattedItems.length,
              itemId: itemId,
              no: '',
              text: title,
              helpText: helpText,
              opsi: [],
              kunci: '',
              tipe: 'TIME',
              isRequired: isReq,
              sectionIndex: currentSectionIdx,
              kesulitan: 'SEDANG'
            });
          }
        });

        if (formattedItems.length > 0) {
          return {
            success: true,
            source: 'GOOGLE_FORM',
            submitMode: 'FORMAPP',
            formId: form.getId(),
            formUrl: publishedUrl,
            formTitle: formTitle,
            formDescription: formDescription,
            isQuiz: isQuiz,
            sections: sections,
            items: formattedItems
          };
        }
      }
    }

    // METODE B: Public Viewform HTML Scraper (untuk link /forms/d/e/.../viewform, forms.gle/..., atau /edit tanpa akses editor)
    const candidateUrls = [];
    if (!/^https?:\/\//i.test(cleanInput)) {
      if (parsed.isPublishedId) {
        candidateUrls.push('https://docs.google.com/forms/d/e/' + parsed.formId + '/viewform');
      } else {
        candidateUrls.push('https://docs.google.com/forms/d/' + parsed.formId + '/viewform');
        candidateUrls.push('https://docs.google.com/forms/d/e/' + parsed.formId + '/viewform');
      }
    } else if (/\/edit/i.test(cleanInput)) {
      candidateUrls.push(cleanInput.replace(/\/edit.*$/i, '/viewform'));
    } else if (/\/formResponse/i.test(cleanInput)) {
      candidateUrls.push(cleanInput.replace(/\/formResponse.*$/i, '/viewform'));
    } else {
      candidateUrls.push(cleanInput);
    }

    let viewUrl = candidateUrls[0];
    let html = '';
    let fbData = null;
    let urlFetchErr = '';

    for (let uIdx = 0; uIdx < candidateUrls.length; uIdx++) {
      const testUrl = candidateUrls[uIdx];
      try {
        const resp = UrlFetchApp.fetch(testUrl, {
          followRedirects: true,
          muteHttpExceptions: true,
          headers: { 'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8' }
        });
        html = resp.getContentText() || '';
        fbData = extractFbPublicLoadData(html);
        if (fbData) {
          viewUrl = testUrl;
          break;
        }
      } catch (eFetch) {
        urlFetchErr = eFetch && eFetch.message ? String(eFetch.message) : '';
      }
    }

    if (!fbData) {
      const combinedErr = (formAppErr + ' ' + urlFetchErr).trim();
      if (/permission|izin|oauthScopes|forms|external_request/i.test(combinedErr)) {
        return {
          success: false,
          message: 'Izin Apps Script belum lengkap (' + combinedErr + '). Pastikan file appsscript.json menyertakan scope "https://www.googleapis.com/auth/forms" dan "https://www.googleapis.com/auth/script.external_request", lalu lakukan Deploy Ulang dan otorisasi ulang.'
        };
      }
      if (/accounts\.google\.com|ServiceLogin|You need permission|Memerlukan izin|formulir ini tidak lagi menerima/i.test(html)) {
        return {
          success: false,
          message: 'Google Form terkunci akses login / organisasi. Gunakan tombol "Pilih dari Google Drive Akun Ini" di Admin agar Form dibuka langsung via akun pemilik Drive, atau nonaktifkan pembatasan login di Setelan Form.'
        };
      }
      return { success: false, message: 'Gagal membaca Google Form. Pilih langsung formulir dari "Google Drive Akun Ini" di menu Admin Link Google Form.' };
    }

    const formMetaBlock = fbData[1] || [];
    const formTitle = formMetaBlock[8] || fbData[3] || targetMapel || 'Ujian Google Form';
    const formDescription = formMetaBlock[0] || '';
    const rawItems = Array.isArray(formMetaBlock[1]) ? formMetaBlock[1] : [];
    const actionMatchB = html.match(/action="(https:\/\/docs\.google\.com\/forms\/[^"]*?\/formResponse)"/i);
    const responseUrl = actionMatchB
      ? actionMatchB[1]
      : viewUrl.split('?')[0].replace(/\/(?:viewform|edit)?(?:\/)?$/i, '/formResponse');

    const stripGFormNumB = (str) => {
      if (str === undefined || str === null) return '';
      let s = String(str).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ').trim();
      let prev = '';
      while (s !== prev) {
        prev = s;
        s = s
          .replace(/^\s*(?:(?:No\.?|Nomor|Nomer|Soal|Pertanyaan)\s*(?:No\.?|Nomor|#)?\s*\d{1,3}\s*[.:)\-–—]?\s+)/i, '')
          .replace(/^\s*[\(\[]\s*\d{1,3}\s*[\)\]]\s*[.:)\-–—]?\s*/, '')
          .replace(/^\s*\d{1,3}(?:\.\d{1,2})?\s*[.):\-–—]\s+(?=\S)/, '')
          .replace(/^\s*\d{1,3}[.)](?=[^\d\s.,])/, '')
          .replace(/^\s*\d{1,3}\s+(?=(?:Nama|Kelas|NIS|NISN|No\.?|Nomor|Nomer|Absen|Ruang|Sesi|Token|Mapel|Mata\s+Pelajaran|Tanggal|Hari|Sekolah|Asal|Identitas|Biodata|Pilih|Isilah|Bacalah|Perhatikan|Tentukan|Berapakah|Mengapa|Apa|Siapa|Dimana|Kapan|Bagaimana|Jelaskan)\b)/i, '')
          .trim();
      }
      return s || String(str).trim();
    };
    const formattedItems = [];
    const sections = [{ index: 0, title: formTitle, description: formDescription }];
    let currentSectionIdx = 0;

    rawItems.forEach(it => {
      if (!Array.isArray(it)) return;
      const itemId = String(it[0] || '');
      const rawTitle = String(it[1] || '').trim();
      const title = stripGFormNumB(rawTitle) || rawTitle;
      const helpText = String(it[2] || '').trim();
      const typeCode = it[3];
      const subData = it[4] || [];

      if (typeCode === 8) {
        currentSectionIdx++;
        sections.push({ index: currentSectionIdx, title: title || ('Bagian ' + (currentSectionIdx + 1)), description: helpText });
        return;
      }
      if (typeCode === 6) {
        formattedItems.push({ id: formattedItems.length, itemId: itemId, no: '', text: title, helpText: helpText, tipe: 'SECTION_HEADER', sectionIndex: currentSectionIdx, opsi: [] });
        return;
      }
      if (typeCode === 11 || typeCode === 12) {
        formattedItems.push({ id: formattedItems.length, itemId: itemId, no: '', text: title, helpText: helpText, tipe: typeCode === 11 ? 'IMAGE' : 'VIDEO', sectionIndex: currentSectionIdx, opsi: [] });
        return;
      }

      if (typeCode === 7 && Array.isArray(subData) && subData.length > 0) {
        const isCheckboxGrid = subData[0][11] && subData[0][11][0] === 1;
        const rows = [];
        const rowEntryIds = [];
        let cols = [];
        subData.forEach((rowDef, rIdx) => {
          rowEntryIds.push(String(rowDef[0] || ''));
          rows.push((rowDef[3] && rowDef[3][0]) ? String(rowDef[3][0]) : ('Baris ' + (rIdx + 1)));
          if (rIdx === 0 && Array.isArray(rowDef[1])) {
            cols = rowDef[1].map(c => (c[0] !== undefined && c[0] !== null) ? String(c[0]) : '');
          }
        });
        const isBS = !isCheckboxGrid && cols.length === 2 && cols.some(c => /benar|true/i.test(c)) && cols.some(c => /salah|false/i.test(c));
        const isReq = Boolean(subData[0][2]);
        formattedItems.push({
          id: formattedItems.length,
          itemId: itemId,
          entryIds: rowEntryIds,
          no: '',
          text: title,
          helpText: helpText,
          opsi: rows,
          gridRows: rows,
          gridCols: cols,
          kunci: '',
          tipe: isCheckboxGrid ? 'CHECKBOX_GRID' : (isBS ? 'BENAR_SALAH' : 'GRID'),
          isRequired: isReq,
          sectionIndex: currentSectionIdx,
          kesulitan: 'SEDANG'
        });
        return;
      }

      const mainEntry = Array.isArray(subData[0]) ? subData[0] : [];
      const entryId = mainEntry[0] ? String(mainEntry[0]) : '';
      const rawChoices = Array.isArray(mainEntry[1]) ? mainEntry[1] : [];
      const opsi = rawChoices.map(c => (c[0] !== undefined && c[0] !== null) ? String(c[0]) : '').filter(s => s !== '');
      const isReq = Boolean(mainEntry[2]);

      let tipe = 'ISIAN';
      if (typeCode === 0) tipe = 'ISIAN';
      else if (typeCode === 1) tipe = 'ESAI';
      else if (typeCode === 2) tipe = 'PG';
      else if (typeCode === 3) tipe = 'DROPDOWN';
      else if (typeCode === 4) tipe = 'PG_KOMPLEKS';
      else if (typeCode === 5 || typeCode === 18) tipe = 'SCALE';
      else if (typeCode === 9) tipe = 'DATE';
      else if (typeCode === 10) tipe = 'TIME';

      const itemObj = {
        id: formattedItems.length,
        itemId: itemId,
        entryId: entryId,
        no: '',
        text: title,
        helpText: helpText,
        opsi: opsi,
        kunci: '',
        tipe: tipe,
        isRequired: isReq,
        sectionIndex: currentSectionIdx,
        kesulitan: 'SEDANG'
      };
      if (typeCode === 5 || typeCode === 18) {
        itemObj.scaleMin = 1;
        itemObj.scaleMax = opsi.length || 5;
        itemObj.scaleLeftLabel = (mainEntry[3] && mainEntry[3][0]) ? String(mainEntry[3][0]) : '';
        itemObj.scaleRightLabel = (mainEntry[3] && mainEntry[3][1]) ? String(mainEntry[3][1]) : '';
      }
      formattedItems.push(itemObj);
    });

    if (formattedItems.length === 0) {
      return { success: false, message: 'Google Form terbaca tetapi tidak berisi butir pertanyaan yang didukung.' };
    }

    return {
      success: true,
      source: 'GOOGLE_FORM',
      submitMode: 'HTTP_POST',
      formId: parsed.formId,
      formUrl: viewUrl,
      formResponseUrl: responseUrl,
      formTitle: formTitle,
      formDescription: formDescription,
      isQuiz: false,
      sections: sections,
      items: formattedItems
    };
  } catch (err) {
    return { success: false, message: 'Gagal memuat Google Form: ' + err.message };
  }
}

function getSoalUjian(kelasSiswa, mapelAktif, gformOverrideUrl) {
  try {
    const ss = getSpreadsheet();

    // 1. Cek apakah ada Link Google Form aktif yang ditetapkan Admin untuk Kelas/Mapel ini
    let gformUrl = gformOverrideUrl ? String(gformOverrideUrl).trim() : '';
    let matchedLink = null;
    if (!gformUrl) {
      matchedLink = findMatchingGoogleFormLink(ss, kelasSiswa, mapelAktif);
      if (matchedLink) {
        gformUrl = (matchedLink.formId && !/^1FAIpQL/.test(matchedLink.formId))
          ? matchedLink.formId
          : (matchedLink.formUrl || matchedLink.formId);
      }
    }

    let gformFailureMessage = '';
    if (gformUrl) {
      const formExam = loadGoogleFormExam(gformUrl, matchedLink ? matchedLink.mapel : mapelAktif);
      if (formExam && formExam.success && formExam.items && formExam.items.length > 0) {
        return {
          success: true,
          source: 'GOOGLE_FORM',
          mapel: (matchedLink && matchedLink.mapel) || mapelAktif || formExam.formTitle,
          gformMeta: {
            submitMode: formExam.submitMode,
            formId: formExam.formId,
            formUrl: formExam.formUrl,
            formResponseUrl: formExam.formResponseUrl || '',
            formTitle: formExam.formTitle,
            formDescription: formExam.formDescription,
            isQuiz: formExam.isQuiz,
            sections: formExam.sections
          },
          items: formExam.items,
          data: []
        };
      }
      return {
        success: false,
        source: 'GOOGLE_FORM',
        message: (formExam && formExam.message) || 'Soal Google Form gagal dimuat. Periksa kembali Link Google Form di menu Admin.'
      };
    }

    // 2. Jika tidak ada link Google Form aktif, muat dari Bank_Soal seperti biasa
    const sheetSoal = getSheetSecure(ss, "Bank_Soal", ["Mapel", "Kelas", "No", "Soal", "A", "B", "C", "D", "E", "Kunci", "Tipe_Soal", "Bobot_Kesulitan", "Data_AKM"]);
    const data = sheetSoal.getDataRange().getDisplayValues();
    if (data.length <= 1) {
      return { success: true, source: 'BANK_SOAL', data: [] };
    }

    const isNewFormat = data[0] && data[0][0] && data[0][0].toString().toLowerCase().includes("mapel");
    const cleanData = data.filter((row, i) => i > 0 && row.some(c => String(c || "").trim() !== ""));

    let targetMapel = String(mapelAktif || "").toLowerCase().trim();
    const targetKelas = String(kelasSiswa || "").toLowerCase().trim();

    if (!targetMapel || targetMapel === 'umum' || targetMapel === 'semua') {
      try {
        const sheetJadwal = getSheetSecure(ss, 'Jadwal_Ujian', ['Tanggal', 'Mata Pelajaran', 'Kelas', 'Ruang', 'Sesi', 'Jam Mulai', 'Jam Selesai', 'Token', 'Status', 'Proktor', 'Pengawas', 'Banyak Soal', 'Jenis Ujian']);
        const dataJ = sheetJadwal.getDataRange().getDisplayValues();
        for (let j = 1; j < dataJ.length; j++) {
          const jRow = dataJ[j];
          const jStatus = String(jRow[8] || '').toLowerCase().trim();
          if (jStatus === 'aktif' || !jStatus) {
            if (matchKelasLevel(targetKelas, jRow[2])) {
              targetMapel = String(jRow[1] || '').toLowerCase().trim();
              break;
            }
          }
        }
      } catch(e) {}
    }

    if (!targetMapel || targetMapel === 'umum' || targetMapel === 'semua') {
      const matchInBank = cleanData.find(r => matchKelasLevel(targetKelas, r[1]) && r[0]);
      if (matchInBank) {
        targetMapel = String(matchInBank[0] || '').toLowerCase().trim();
      }
    }

    let formatted = [];

    if (isNewFormat) {
      let mapelFiltered = [];
      if (targetMapel && targetMapel !== 'semua' && targetMapel !== 'umum') {
        mapelFiltered = cleanData.filter(r => {
          const m = String(r[0] || '').toLowerCase().trim();
          return m === targetMapel || m.includes(targetMapel) || targetMapel.includes(m);
        });
      }

      if (mapelFiltered.length === 0 && cleanData.length > 0) {
        const firstMapel = String(cleanData[0][0] || '').toLowerCase().trim();
        mapelFiltered = cleanData.filter(r => String(r[0] || '').toLowerCase().trim() === firstMapel);
        targetMapel = firstMapel;
      }

      let classFiltered = [];
      if (targetKelas && targetKelas !== 'semua' && targetKelas !== 'umum') {
        classFiltered = mapelFiltered.filter(r => matchKelasLevel(targetKelas, r[1]));
      }

      let finalSoal = [];
      if (classFiltered.length > 0) {
        finalSoal = classFiltered;
      } else {
        const generalClass = mapelFiltered.filter(r => {
          const k = String(r[1] || '').toLowerCase().trim();
          return k === 'semua' || k === 'umum' || !k;
        });
        finalSoal = generalClass.length > 0 ? generalClass : mapelFiltered;
      }

      formatted = finalSoal.map(row => [
        row[2] || "", row[3] || "", row[4] || "", row[5] || "", row[6] || "", row[7] || "", row[8] || "", row[9] || "A",
        row[10] || "PG", row[11] || "SEDANG", row[12] || ""
      ]);
    } else {
      formatted = cleanData.map(row => [
        row[0] || "", row[1] || "", row[2] || "", row[3] || "", row[4] || "", row[5] || "", row[6] || "", row[7] || "A",
        row[8] || "PG", row[9] || "SEDANG", row[10] || ""
      ]);
    }

    return { success: true, source: 'BANK_SOAL', data: formatted, mapel: targetMapel };
  } catch (e) { return { success: false, message: e.message }; }
}

function submitToGoogleFormInternal(gformPayload, studentInfo) {
  const result = { submitted: false, officialScore: null, note: '' };
  try {
    if (!gformPayload) return result;
    const responsesMap = gformPayload.responses || {};

    if (gformPayload.submitMode === 'FORMAPP' && gformPayload.formId) {
      const form = FormApp.openById(gformPayload.formId);
      const formResponse = form.createResponse();
      const items = form.getItems();

      items.forEach(item => {
        try {
          const itemId = String(item.getId());
          const itemType = item.getType();
          const val = responsesMap[itemId];
          const titleLower = (item.getTitle() || '').toLowerCase();

          if (itemType === FormApp.ItemType.MULTIPLE_CHOICE) {
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              formResponse.withItemResponse(item.asMultipleChoiceItem().createResponse(String(val)));
            }
          } else if (itemType === FormApp.ItemType.CHECKBOX) {
            let arr = Array.isArray(val) ? val : (val ? String(val).split('|||').filter(Boolean) : []);
            if (arr.length > 0) {
              formResponse.withItemResponse(item.asCheckboxItem().createResponse(arr));
            }
          } else if (itemType === FormApp.ItemType.LIST) {
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              formResponse.withItemResponse(item.asListItem().createResponse(String(val)));
            }
          } else if (itemType === FormApp.ItemType.GRID) {
            if (Array.isArray(val) && val.some(v => v)) {
              const gridArr = val.map(v => (v ? String(v) : null));
              formResponse.withItemResponse(item.asGridItem().createResponse(gridArr));
            }
          } else if (itemType === FormApp.ItemType.CHECKBOX_GRID) {
            if (Array.isArray(val) && val.some(v => Array.isArray(v) && v.length > 0)) {
              const cbGridArr = val.map(v => (Array.isArray(v) && v.length > 0 ? v : null));
              formResponse.withItemResponse(item.asCheckboxGridItem().createResponse(cbGridArr));
            }
          } else if (itemType === FormApp.ItemType.TEXT) {
            let textVal = (val !== undefined && val !== null) ? String(val).trim() : '';
            if (!textVal && studentInfo) {
              if (titleLower.includes('nama')) textVal = studentInfo.nama || '';
              else if (titleLower.includes('nis') || titleLower.includes('nomor peserta')) textVal = studentInfo.nis || '';
              else if (titleLower.includes('kelas')) textVal = studentInfo.kelas || '';
            }
            if (textVal) {
              formResponse.withItemResponse(item.asTextItem().createResponse(textVal));
            }
          } else if (itemType === FormApp.ItemType.PARAGRAPH_TEXT) {
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              formResponse.withItemResponse(item.asParagraphTextItem().createResponse(String(val)));
            }
          } else if (itemType === FormApp.ItemType.SCALE) {
            const num = parseInt(val, 10);
            if (!isNaN(num)) {
              formResponse.withItemResponse(item.asScaleItem().createResponse(num));
            }
          } else if (itemType === FormApp.ItemType.DATE && val) {
            const parts = String(val).split('-');
            if (parts.length === 3) {
              formResponse.withItemResponse(item.asDateItem().createResponse(new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10))));
            }
          } else if (itemType === FormApp.ItemType.TIME && val) {
            const parts = String(val).split(':');
            if (parts.length >= 2) {
              formResponse.withItemResponse(item.asTimeItem().createResponse(parseInt(parts[0],10), parseInt(parts[1],10)));
            }
          }
        } catch (eItem) {}
      });

      const submittedResp = formResponse.submit();
      result.submitted = true;
      result.note = 'GForm Terkirim';

      try {
        if (form.isQuiz() && submittedResp && submittedResp.getGradableItemResponses) {
          const gradables = submittedResp.getGradableItemResponses();
          let earned = 0;
          let maxPts = 0;
          gradables.forEach(gr => {
            const s = gr.getScore();
            if (typeof s === 'number' && !isNaN(s)) earned += s;
            try {
              const it = gr.getItem();
              const t = it.getType();
              if (t === FormApp.ItemType.MULTIPLE_CHOICE) maxPts += (it.asMultipleChoiceItem().getPoints() || 0);
              else if (t === FormApp.ItemType.CHECKBOX) maxPts += (it.asCheckboxItem().getPoints() || 0);
              else if (t === FormApp.ItemType.LIST) maxPts += (it.asListItem().getPoints() || 0);
              else if (t === FormApp.ItemType.TEXT) maxPts += (it.asTextItem().getPoints() || 0);
            } catch (ePt) {}
          });
          if (maxPts > 0) {
            result.officialScore = Math.round((earned / maxPts) * 100);
          }
        }
      } catch (eQuiz) {}
    } else if (gformPayload.submitMode === 'HTTP_POST' && gformPayload.formResponseUrl) {
      const pairs = [];
      const rawEntries = gformPayload.httpEntries || {};
      Object.keys(rawEntries).forEach(entryKey => {
        const v = rawEntries[entryKey];
        if (Array.isArray(v)) {
          v.forEach(sub => {
            if (sub !== undefined && sub !== null && String(sub) !== '') {
              pairs.push(encodeURIComponent(entryKey) + '=' + encodeURIComponent(String(sub)));
            }
          });
        } else if (v !== undefined && v !== null && String(v) !== '') {
          pairs.push(encodeURIComponent(entryKey) + '=' + encodeURIComponent(String(v)));
        }
      });
      const totalSections = parseInt(gformPayload.sectionCount || 1, 10);
      if (totalSections > 1) {
        const secNums = [];
        for (let s = 0; s < totalSections; s++) secNums.push(String(s));
        pairs.push('fvv=1');
        pairs.push('pageHistory=' + encodeURIComponent(secNums.join(',')));
      }
      if (pairs.length > 0) {
        const httpRes = UrlFetchApp.fetch(gformPayload.formResponseUrl, {
          method: 'post',
          contentType: 'application/x-www-form-urlencoded',
          payload: pairs.join('&'),
          followRedirects: true,
          muteHttpExceptions: true
        });
        const code = httpRes.getResponseCode();
        if (code >= 200 && code < 400) {
          result.submitted = true;
          result.note = 'GForm HTTP Terkirim';
        } else {
          result.note = 'GForm HTTP Kode ' + code;
        }
      }
    }
  } catch (err) {
    result.note = 'GForm Gagal: ' + err.message;
  }
  return result;
}

function submitUjian(nis, nama, token, score, status, answersString, detailAnalisaStr, hashSig, gformPayloadJson, ruangSiswa) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    const ss = getSpreadsheet();

    if (ruangSiswa && String(ruangSiswa).trim() !== '') {
      upsertRuangSiswaInternal(ss, nis, ruangSiswa);
    }

    // Ambil kelas siswa dari Data_Siswa untuk metadata Google Form bila diperlukan
    let kelasSiswa = '';
    const cleanNis = String(nis || '').trim().replace(/^'+/, '');
    const sheetSiswa = getSheetSecure(ss, "Data_Siswa", ['NIS', 'Nama', 'Kelas', 'Sesi', 'Password', 'Status']);
    const dataSiswa = sheetSiswa.getDataRange().getDisplayValues();
    for (let i = 1; i < dataSiswa.length; i++) {
      if (isSameNis_(dataSiswa[i][0], cleanNis)) {
        kelasSiswa = String(dataSiswa[i][2] || '');
        break;
      }
    }

    // 1. Jika ujian berasal dari Link Google Form -> kirim juga jawaban ke Google Form!
    let finalScore = score;
    let gformTag = '';
    if (gformPayloadJson) {
      try {
        const parsedGForm = typeof gformPayloadJson === 'string' ? JSON.parse(gformPayloadJson) : gformPayloadJson;
        const gfRes = submitToGoogleFormInternal(parsedGForm, { nis: nis, nama: nama, kelas: kelasSiswa });
        if (gfRes.officialScore !== null && gfRes.officialScore !== undefined) {
          finalScore = gfRes.officialScore;
        }
        if (gfRes.submitted) {
          gformTag = ' [GForm+Sheet]';
        } else if (gfRes.note) {
          gformTag = ' [' + gfRes.note + ']';
        }
      } catch (eGf) {}
    }

    // 2. Simpan hasil & analisa jawaban ke Spreadsheet
    const finalStatus = (hashSig ? `${status || 'Selesai'} [SHA256:${String(hashSig).substring(0,8)}]` : (status || 'Selesai')) + gformTag;
    appendTextKeyRow_(getSheetSecure(ss, 'Hasil_Ujian', ['Timestamp', 'NIS', 'Nama', 'Token', 'Skor', 'Status']), [new Date().toLocaleString('id-ID'), cleanNis, nama, token, finalScore, finalStatus]);
    // Note: keep NIS in col 1 or col 2 as text safely for Analisa_Jawaban
    const sheetAnalisa = getSheetSecure(ss, 'Analisa_Jawaban', ['NIS', 'Nama', 'Token', 'Jawaban', 'Detail_Analisa']);
    appendTextKeyRow_(sheetAnalisa, [cleanNis, nama, token, answersString, hashSig ? `${detailAnalisaStr}|HASH:${hashSig}` : detailAnalisaStr]);

    try {
      const sheetSetting = getSheetSecure(ss, 'Setting_Ujian', ['Key', 'Value']);
      const rawSetting = sheetSetting.getDataRange().getValues();
      let notifEmail = 'Tidak'; let emailWali = '';
      for (let i = 0; i < rawSetting.length; i++) {
        if (rawSetting[i][0] === 'notif_email') notifEmail = rawSetting[i][1];
        if (rawSetting[i][0] === 'email_wali') emailWali = rawSetting[i][1];
      }
      if (notifEmail === 'Ya' && emailWali) {
        kirimEmailLaporanHasil(nis, nama, finalScore, status, emailWali);
      }
    } catch(err) {}
    
    for (let i = 1; i < dataSiswa.length; i++) {
      if (isSameNis_(dataSiswa[i][0], cleanNis)) {
        sheetSiswa.getRange(i + 1, 6).setValue('Selesai');
        break;
      }
    }
    
    try {
        const sheetTemp = getSheetSecure(ss, 'Sesi_Sementara', ['NIS', 'Jawaban', 'Waktu']);
        const tempVals = sheetTemp.getDataRange().getDisplayValues();
        for(let j=1; j<tempVals.length; j++) {
            if(isSameNis_(tempVals[j][0], cleanNis)) {
                sheetTemp.deleteRow(j+1); break;
            }
        }
    } catch(e) {}

    logStudentActivityInternal(ss, nis, nama, 'Selesai', 'Ujian Selesai (Skor: ' + finalScore + ')' + gformTag, 'Sistem', "");
    SpreadsheetApp.flush(); 
    return { success: true, score: finalScore, gformSubmitted: gformTag.includes('GForm+Sheet') };
  } catch (e) { 
    return { success: false, message: "Server Sedang Padat. Sistem mengulang." }; 
  } finally { lock.releaseLock(); }
}

function loginProktor(username, password) {
  try {
    const ss = getSpreadsheet();
    const sheet = getSheetSecure(ss, "Data_Proktor", ['Username', 'Password', 'Nama']);
    const data = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).toUpperCase().trim() === String(username).toUpperCase().trim() && String(data[i][1]).trim() === String(password).trim()) {
        return { success: true, nama: data[i][2] || username };
      }
    }
    return { success: false, message: "Username atau Password salah!" };
  } catch (error) { return { success: false, message: error.toString() }; }
}

function getProktorDashboardData() {
  try {
    const ss = getSpreadsheet();
    const sheetSiswa = getSheetSecure(ss, "Data_Siswa", ['NIS', 'Nama', 'Kelas', 'Sesi', 'Password', 'Status']);
    const dataSiswa = sheetSiswa.getDataRange().getDisplayValues().filter((row, idx) => idx > 0 && row[0]);
    
    const sheetLog = getSheetSecure(ss, "Log_Aktivitas", ['Timestamp', 'NIS', 'Nama', 'Aktivitas', 'Detail', 'IP', 'Browser']);
    const dataLog = sheetLog.getDataRange().getDisplayValues().filter(row => row[0]);

    const sheetSetting = getSheetSecure(ss, 'Setting_Ujian', ['Key', 'Value']);
    const rawSetting = sheetSetting.getDataRange().getValues(); 
    let settings = {};
    for(let i=0; i<rawSetting.length; i++) { 
        if(rawSetting[i][0]) {
            let val = '';
            for(let j=1; j<rawSetting[i].length; j++) { if(rawSetting[i][j]) val += rawSetting[i][j]; }
            settings[rawSetting[i][0]] = val;
        }
    }
    const defaults = {
        token: 'ABC12', durasi: '60', status_ujian: 'Aktif', ujian_ketat: 'Ya', audio_monitoring: 'Tidak',
        kiosk_mode: 'Tidak', exambro_only: 'Tidak', kalkulator: 'Ya', coretan: 'Ya', adaptif_cat: 'Tidak', ai_face_liveness: 'Ya',
        kementerian_header: 'KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI', logo_kementerian: '', notif_email: 'Tidak', email_wali: '', audio_limit: '2', ai_gaze: 'Ya'
    };
    settings = { ...defaults, ...settings };

    const sheetJadwal = getSheetSecure(ss, 'Jadwal_Ujian', ['Tanggal', 'Mata Pelajaran', 'Kelas', 'Ruang', 'Sesi', 'Jam Mulai', 'Jam Selesai', 'Token', 'Status', 'Proktor', 'Pengawas', 'Banyak Soal', 'Jenis Ujian']);
    const dataJadwal = sheetJadwal.getDataRange().getDisplayValues().filter(row => row[0]);

    const sheetFoto = getSheetSecure(ss, "Log_Foto", ["Timestamp", "NIS", "Nama", "FotoBase64", "TokenSesi"]);
    const rawFoto = sheetFoto.getDataRange().getDisplayValues();
    const dataFoto = rawFoto.filter((r, idx) => idx > 0 && r[0]);

    const canonicalNisByExact = {};
    const canonicalNisByNoZero = {};
    for (let i = 0; i < dataSiswa.length; i++) {
      const cNis = String(dataSiswa[i][0] || '').trim();
      if (!cNis) continue;
      canonicalNisByExact[normalizeNisKey_(cNis)] = cNis;
      canonicalNisByNoZero[stripLeadingZeroNisKey_(cNis)] = cNis;
    }
    const resolveCanonicalNis = (raw) => {
      const ex = normalizeNisKey_(raw);
      if (canonicalNisByExact[ex]) return canonicalNisByExact[ex];
      const nz = stripLeadingZeroNisKey_(raw);
      return canonicalNisByNoZero[nz] || String(raw || '').trim();
    };

    const ruangMap = {};
    try {
      const sheetRuang = getSheetSecure(ss, 'Ruang_Siswa', ['NIS', 'Ruang', 'UpdatedAt']);
      const rawRuang = sheetRuang.getDataRange().getDisplayValues();
      for (let i = 1; i < rawRuang.length; i++) {
        const rNisRaw = String(rawRuang[i][0] || '').trim();
        const rName = normalizeRuangCanonical_(rawRuang[i][1]);
        if (rNisRaw && rName) {
          const cNis = resolveCanonicalNis(rNisRaw);
          ruangMap[cNis] = rName;
          ruangMap[rNisRaw] = rName;
        }
      }
    } catch (eR) {}

    const progressMap = {};
    try {
      const sheetTemp = getSheetSecure(ss, 'Sesi_Sementara', ['NIS', 'Jawaban', 'Waktu', 'TotalSoal']);
      const rawTemp = sheetTemp.getDataRange().getDisplayValues();
      for (let i = 1; i < rawTemp.length; i++) {
        const pNisRaw = String(rawTemp[i][0] || '').trim();
        if (!pNisRaw) continue;
        const pNisCanonical = resolveCanonicalNis(pNisRaw);
        let answeredCount = 0;
        try {
          const ansObj = JSON.parse(rawTemp[i][1] || '{}');
          if (ansObj && typeof ansObj === 'object') {
            answeredCount = Object.keys(ansObj).filter(k => {
              const v = ansObj[k];
              if (v === null || v === undefined) return false;
              if (typeof v === 'string') return v.trim() !== '' && v !== '{}';
              if (Array.isArray(v)) return v.length > 0;
              if (typeof v === 'object') return Object.keys(v).length > 0;
              return true;
            }).length;

            // Fallback otomatis jika ruang diisi langsung di dalam Google Form (jawaban tersimpan di Sesi_Sementara)
            if (!ruangMap[pNisCanonical]) {
              const ansValues = Object.values(ansObj);
              for (let av = 0; av < ansValues.length; av++) {
                const vStr = typeof ansValues[av] === 'string' ? ansValues[av].trim() : '';
                if (/^(?:ruang|ruangan)\s*[-_.]?\s*0*(?:\d{1,2})$/i.test(vStr)) {
                  const inferredRuang = normalizeRuangCanonical_(vStr);
                  if (inferredRuang) {
                    ruangMap[pNisCanonical] = inferredRuang;
                    ruangMap[pNisRaw] = inferredRuang;
                    break;
                  }
                }
              }
            }
          }
        } catch (eP) {}
        const progObj = {
          answeredCount: answeredCount,
          timeLeft: parseInt(rawTemp[i][2], 10) || 0,
          totalSoal: parseInt(rawTemp[i][3], 10) || 0
        };
        progressMap[pNisCanonical] = progObj;
        progressMap[pNisRaw] = progObj;
      }
    } catch (eT) {}

    return { success: true, data: { siswa: dataSiswa, log: dataLog, settings: settings, jadwal: dataJadwal, foto: dataFoto, ruangMap: ruangMap, progressMap: progressMap } };
  } catch (e) { return { success: false, message: e.message }; }
}

function unlockSiswa(nis) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    
    const sheetSiswa = getSheetSecure(ss, "Data_Siswa", ['NIS', 'Nama', 'Kelas', 'Sesi', 'Password', 'Status']);
    const dataSiswa = sheetSiswa.getDataRange().getDisplayValues();
    let namaSiswa = "Siswa";
    for (let i = 1; i < dataSiswa.length; i++) {
      if (isSameNis_(dataSiswa[i][0], nis)) {
        sheetSiswa.getRange(i + 1, 6).setValue('Offline');
        namaSiswa = dataSiswa[i][1];
        break;
      }
    }

    const sheetDevice = getSheetSecure(ss, "Pengikatan_Device", ["NIS", "DeviceId", "InfoDevice"]);
    const dataDevice = sheetDevice.getDataRange().getDisplayValues();
    for (let d = 1; d < dataDevice.length; d++) {
        if (isSameNis_(dataDevice[d][0], nis)) {
            sheetDevice.deleteRow(d + 1);
            break;
        }
    }

    logStudentActivityInternal(ss, nis, namaSiswa, 'Reset', 'Proktor mereset sesi login & pengikatan perangkat', 'Sistem', "");
    SpreadsheetApp.flush();
    return { success: true, message: `Sesi login & Kunci perangkat NIS ${nis} berhasil di-reset.` };
  } catch (e) { 
    return { success: false, message: "Server padat karena load siswa. Sistem mengulang." }; 
  } finally { lock.releaseLock(); }
}

function forceSelesaiUjian(nis) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const sheetSiswa = getSheetSecure(ss, "Data_Siswa", ['NIS', 'Nama', 'Kelas', 'Sesi', 'Password', 'Status']);
    const dataSiswa = sheetSiswa.getDataRange().getDisplayValues();
    let studentName = "Siswa";
    
    for (let i = 1; i < dataSiswa.length; i++) {
      if (isSameNis_(dataSiswa[i][0], nis)) {
        studentName = dataSiswa[i][1];
        sheetSiswa.getRange(i + 1, 6).setValue('Selesai');
        break;
      }
    }
    
    let savedAns = "{}";
    try {
        const sheetTemp = getSheetSecure(ss, 'Sesi_Sementara', ['NIS', 'Jawaban', 'Waktu']);
        const tempVals = sheetTemp.getDataRange().getDisplayValues();
        for(let j=1; j<tempVals.length; j++) {
            if(isSameNis_(tempVals[j][0], nis)) {
                savedAns = tempVals[j][1];
                sheetTemp.deleteRow(j+1);
                break;
            }
        }
    } catch(e){}

    const sheetSetting = getSheetSecure(ss, 'Setting_Ujian', ['Key', 'Value']);
    const dataSetting = sheetSetting.getDataRange().getValues();
    let activeToken = "-";
    for(let k=0; k<dataSetting.length; k++){
        if(dataSetting[k][0] === 'token') { activeToken = dataSetting[k][1]; break; }
    }

    logStudentActivityInternal(ss, nis, studentName, 'Force Selesai', 'Dihentikan paksa oleh Proktor', 'Sistem', "");
    
    const timestamp = new Date().toLocaleString('id-ID');
    getSheetSecure(ss, 'Hasil_Ujian', ['Timestamp', 'NIS', 'Nama', 'Token', 'Skor', 'Status']).appendRow([timestamp, nis, studentName, activeToken, "Force Submit", "Selesai (Oleh Proktor)"]);
    getSheetSecure(ss, 'Analisa_Jawaban', ['NIS', 'Nama', 'Token', 'Jawaban', 'Detail_Analisa']).appendRow([nis, studentName, activeToken, savedAns, "Dihentikan Paksa"]);

    SpreadsheetApp.flush();
    return { success: true, message: `Ujian siswa NIS ${nis} berhasil dimatikan paksa dan jawaban diselamatkan.` };
  } catch (e) { 
    return { success: false, message: "Server padat karena load siswa. Sistem mengulang." }; 
  } finally { lock.releaseLock(); }
}

function updateTokenUjian(newToken) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    
    const sheetSetting = getSheetSecure(ss, 'Setting_Ujian', ['Key', 'Value']);
    const dataSetting = sheetSetting.getDataRange().getValues();
    let tokenRow = -1;
    for(let i=0; i<dataSetting.length; i++){ if(dataSetting[i][0] === 'token') { tokenRow = i+1; break; } }
    if(tokenRow > -1) sheetSetting.getRange(tokenRow, 2).setValue(newToken);
    else sheetSetting.appendRow(['token', newToken]);
    
    const sheetJadwal = getSheetSecure(ss, 'Jadwal_Ujian', ['Tanggal', 'Mata Pelajaran', 'Kelas', 'Ruang', 'Sesi', 'Jam Mulai', 'Jam Selesai', 'Token', 'Status', 'Proktor', 'Pengawas', 'Banyak Soal', 'Jenis Ujian']);
    const dataJadwal = sheetJadwal.getDataRange().getValues();
    for(let i=1; i<dataJadwal.length; i++){
        sheetJadwal.getRange(i+1, 8).setValue(newToken); 
    }

    SpreadsheetApp.flush();
    return { success: true, message: "Token berhasil diperbarui dan disinkronkan: " + newToken };
  } catch (e) { 
    return { success: false, message: "Server padat karena load siswa. Sistem mengulang." }; 
  } finally { lock.releaseLock(); }
}
function kirimEmailLaporanHasil(nis, nama, skor, status, emailTujuan) {
  try {
    if (!emailTujuan) return { success: false, message: "Email tujuan tidak terisi." };
    const ss = getSpreadsheet();
    const sheetSetting = getSheetSecure(ss, 'Setting_Ujian', ['Key', 'Value']);
    const rawSetting = sheetSetting.getDataRange().getValues();
    let namaSekolah = "SATUAN PENDIDIKAN";
    for (let i = 0; i < rawSetting.length; i++) {
        if (rawSetting[i][0] === 'nama_sekolah') namaSekolah = rawSetting[i][1];
    }

    const subject = `[CBT REPORT] Hasil Ujian Siswa: ${nama} (${nis}) - ${namaSekolah}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #4f46e5; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">LAPORAN HASIL ASESMEN / UJIAN CBT</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">${namaSekolah}</p>
        </div>
        <div style="padding: 25px; background: #ffffff; color: #1e293b;">
          <p>Yth. Wali Kelas / Orang Tua Siswa,</p>
          <p>Berikut adalah laporan resmi hasil pengerjaan Asesmen Berbasis Komputer (CBT) siswa bersangkutan:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;">No. Peserta / NIS</td><td style="padding: 8px 0; font-weight: bold;">${nis}</td></tr>
            <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;">Nama Peserta</td><td style="padding: 8px 0; font-weight: bold;">${nama}</td></tr>
            <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;">Skor Perolehan</td><td style="padding: 8px 0; font-weight: bold; color: #4f46e5; font-size: 18px;">${skor}</td></tr>
            <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;">Status Pengawasan</td><td style="padding: 8px 0; font-weight: bold; color: #10b981;">${status || 'Aman / Terverifikasi'}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Waktu Penyelesaian</td><td style="padding: 8px 0; font-weight: bold;">${new Date().toLocaleString('id-ID')} WIB</td></tr>
          </table>
          <p style="font-size: 12px; color: #64748b; margin-top: 25px;">Pesan ini dikirim secara otomatis oleh Sistem CBT Enterprise Google Apps Script.</p>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: emailTujuan,
      subject: subject,
      htmlBody: htmlBody
    });
    return { success: true, message: `Email laporan berhasil dikirim ke ${emailTujuan}` };
  } catch (e) {
    return { success: false, message: "Gagal mengirim email: " + e.message };
  }
}

function arsipDanResetSemester(namaArsip) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const activeName = ss.getName();
    const archiveName = `ARSIP_CBT_${namaArsip || new Date().getFullYear()}_${Date.now()}`;
    
    // Create copy as archive file in Google Drive
    const archiveFile = DriveApp.getFileById(ss.getId()).makeCopy(archiveName);
    const archiveUrl = archiveFile.getUrl();

    // Reset active sheets while preserving headers
    const sheetsToClear = [
      { name: 'Hasil_Ujian', headers: ['Timestamp', 'NIS', 'Nama', 'Token', 'Skor', 'Status'] },
      { name: 'Analisa_Jawaban', headers: ['NIS', 'Nama', 'Token', 'Jawaban', 'Detail_Analisa'] },
      { name: 'Log_Aktivitas', headers: ['Timestamp', 'NIS', 'Nama', 'Aktivitas', 'Detail', 'IP', 'Browser'] },
      { name: 'Log_Foto', headers: ['Timestamp', 'NIS', 'Nama', 'FotoBase64', 'TokenSesi'] },
      { name: 'Sesi_Sementara', headers: ['NIS', 'Jawaban', 'Waktu'] },
      { name: 'Ruang_Siswa', headers: ['NIS', 'Ruang', 'UpdatedAt'] }
    ];

    sheetsToClear.forEach(item => {
      const sh = getSheetSecure(ss, item.name, item.headers);
      sh.clear();
      sh.getRange(1, 1, 1, item.headers.length).setValues([item.headers]);
    });

    SpreadsheetApp.flush();
    return { success: true, url: archiveUrl, message: `Berhasil mencadangkan database ke ${archiveName} dan membersihkan tabel semester aktif.` };
  } catch (e) {
    return { success: false, message: "Gagal arsip database: " + e.message };
  } finally { lock.releaseLock(); }
}

function submitJawabanHybridLJK(nis, nama, token, score, status, ansString, detailAnalisaStr) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const timestamp = new Date().toLocaleString('id-ID');
    getSheetSecure(ss, 'Hasil_Ujian', ['Timestamp', 'NIS', 'Nama', 'Token', 'Skor', 'Status']).appendRow([timestamp, nis, nama, token || 'HYBRID-OMR', score, status || 'Hybrid LJK']);
    getSheetSecure(ss, 'Analisa_Jawaban', ['NIS', 'Nama', 'Token', 'Jawaban', 'Detail_Analisa']).appendRow([nis, nama, token || 'HYBRID-OMR', ansString || '{}', detailAnalisaStr || 'OMR Kertas']);
    SpreadsheetApp.flush();
    return { success: true, message: `Data LJK Hybrid NIS ${nis} berhasil disimpan ke database.` };
  } catch (e) {
    return { success: false, message: "Gagal simpan LJK Hybrid: " + e.message };
  } finally { lock.releaseLock(); }
}

function saveFotoSiswaAdmin(nis, nama, fotoBase64) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = getSpreadsheet();
    const sheetFoto = getSheetSecure(ss, "Log_Foto", ["Timestamp", "NIS", "Nama", "FotoBase64", "TokenSesi"]);
    const data = sheetFoto.getDataRange().getValues();
    const cleanNis = String(nis || '').trim();
    let rowFound = -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === cleanNis) {
        rowFound = i + 1;
        break;
      }
    }

    const timestamp = new Date().toLocaleString('id-ID');
    if (rowFound > 0) {
      sheetFoto.getRange(rowFound, 1).setValue(timestamp);
      sheetFoto.getRange(rowFound, 3).setValue(nama || 'Siswa');
      sheetFoto.getRange(rowFound, 4).setValue(fotoBase64);
    } else {
      sheetFoto.appendRow([timestamp, cleanNis, nama || 'Siswa', fotoBase64, 'ADMIN_REG']);
    }

    SpreadsheetApp.flush();
    return { success: true, message: `Pasfoto NIS ${cleanNis} berhasil disimpan ke database foto.` };
  } catch (e) {
    return { success: false, message: "Gagal menyimpan foto: " + e.message };
  } finally {
    lock.releaseLock();
  }
}

function autoAlokasiRuangSesi(kapasitasRuang, maxSesi) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const sheetSiswa = getSheetSecure(ss, "Data_Siswa", ['NIS', 'Nama', 'Kelas', 'Sesi', 'Password', 'Status']);
    const data = sheetSiswa.getDataRange().getValues();
    if (data.length <= 1) return { success: false, message: "Data Siswa masih kosong." };

    const kap = parseInt(kapasitasRuang) || 30;
    const sesiMax = parseInt(maxSesi) || 2;

    let siswaRows = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) siswaRows.push({ idx: i + 1, data: data[i] });
    }

    let ruangNum = 1;
    let sesiNum = 1;
    let inRoomCount = 0;

    for (let k = 0; k < siswaRows.length; k++) {
      const s = siswaRows[k];
      // update sesi
      sheetSiswa.getRange(s.idx, 4).setValue(String(sesiNum));
      inRoomCount++;

      if (inRoomCount >= kap) {
        inRoomCount = 0;
        ruangNum++;
        if (ruangNum > 50) ruangNum = 1; // safety
      }
      
      // Rotasi sesi per batch ruang
      if (k > 0 && (k + 1) % (kap * 2) === 0) {
        sesiNum = (sesiNum % sesiMax) + 1;
      }
    }

    SpreadsheetApp.flush();
    return { success: true, message: `Berhasil mengalokasikan ${siswaRows.length} siswa ke dalam ${ruangNum} ruang dan ${sesiMax} sesi otomatis.` };
  } catch (e) {
    return { success: false, message: "Gagal alokasi otomatis: " + e.message };
  } finally {
    lock.releaseLock();
  }
}

// =========================================================================
// API GATEWAY (doPost & doGet?api=1) UNTUK HOSTING DI GITHUB PAGES
// =========================================================================
function pingGasBridge() {
  try {
    const ss = getSpreadsheet();
    return {
      success: true,
      bridgeVersion: '2.1',
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      ownerEmail: SPREADSHEET_OWNER_EMAIL
    };
  } catch (err) {
    return {
      success: false,
      bridgeVersion: '2.1',
      spreadsheetId: SPREADSHEET_ID,
      ownerEmail: SPREADSHEET_OWNER_EMAIL,
      message: err && err.message ? err.message : String(err)
    };
  }
}

const GAS_RPC_HANDLERS_ = {
  pingGasBridge: pingGasBridge,
  getAppSettings: getAppSettings,
  getAdminDashboardData: getAdminDashboardData,
  saveSiswaMasal: saveSiswaMasal,
  saveSoalMasal: saveSoalMasal,
  importSoalFromGoogleForm: importSoalFromGoogleForm,
  importSoalFromGoogleDrive: importSoalFromGoogleDrive,
  saveProktorMasal: saveProktorMasal,
  saveJadwalMasal: saveJadwalMasal,
  saveSettingUjian: saveSettingUjian,
  clearHasilUjian: clearHasilUjian,
  laporKecurangan: laporKecurangan,
  laporSuaraMencurigakan: laporSuaraMencurigakan,
  saveRuangSiswa: saveRuangSiswa,
  saveJawabanSementara: saveJawabanSementara,
  uploadWebcamLog: uploadWebcamLog,
  loginSiswa: loginSiswa,
  saveGoogleFormLinks: saveGoogleFormLinks,
  listGoogleFormsFromDrive: listGoogleFormsFromDrive,
  inspectGoogleFormLink: inspectGoogleFormLink,
  loadGoogleFormExam: loadGoogleFormExam,
  getSoalUjian: getSoalUjian,
  submitUjian: submitUjian,
  loginProktor: loginProktor,
  getProktorDashboardData: getProktorDashboardData,
  unlockSiswa: unlockSiswa,
  forceSelesaiUjian: forceSelesaiUjian,
  updateTokenUjian: updateTokenUjian,
  kirimEmailLaporanHasil: kirimEmailLaporanHasil,
  arsipDanResetSemester: arsipDanResetSemester,
  submitJawabanHybridLJK: submitJawabanHybridLJK,
  saveFotoSiswaAdmin: saveFotoSiswaAdmin,
  autoAlokasiRuangSesi: autoAlokasiRuangSesi
};

function handleGasBridgeRpc_(fn, args) {
  try {
    const fnName = String(fn || '').trim();
    if (!Object.prototype.hasOwnProperty.call(GAS_RPC_HANDLERS_, fnName)) {
      return { ok: false, error: 'Fungsi tidak diizinkan: ' + fnName };
    }
    const safeArgs = Array.isArray(args) ? args : [];
    const result = GAS_RPC_HANDLERS_[fnName].apply(null, safeArgs);
    return { ok: true, result: result };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

function handleGasBridgeGet_(e) {
  let payload;
  try {
    const fn = e && e.parameter ? e.parameter.fn : '';
    const args = e && e.parameter && e.parameter.args ? JSON.parse(e.parameter.args) : [];
    payload = handleGasBridgeRpc_(fn, args);
  } catch (err) {
    payload = { ok: false, error: err && err.message ? err.message : String(err) };
  }
  const out = JSON.stringify(payload);
  const cb = (e && e.parameter && e.parameter.callback) ? String(e.parameter.callback).replace(/[^a-zA-Z0-9_$.]/g, '') : '';
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + out + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.payload) {
      body = JSON.parse(e.parameter.payload);
    }
    const payload = handleGasBridgeRpc_(body.fn, body.args);
    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: err && err.message ? err.message : String(err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
