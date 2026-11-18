/**
 * Bridge google.script.run -> Google Apps Script Web App (/exec)
 * Memungkinkan Index.html / Admin.html / Proktor.html versi Apps Script
 * berjalan langsung dari GitHub Pages (https://username.github.io/repo/)
 * sambil tetap memakai Backend Code.gs + Google Spreadsheet sebagai database.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window.google && window.google.script && window.google.script.run) {
    return; // Sudah berjalan di dalam Google Apps Script secara native
  }

  var DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbzAQ1YpzQ-QkbPM2DS7tX_ik2mlM9IPt3qTPg6MorKSXnSESslldX0k8ECjdqwD_p0PMw/exec';
  var SPREADSHEET_ID = window.CBT_SPREADSHEET_ID || '15hhPU3rRpCgodxhmqgDdc0STJigGnu1vRZH25clvh3w';
  var OWNER_EMAIL = window.CBT_SPREADSHEET_OWNER || 'avifzein@gmail.com';
  var OVERRIDE_KEY = 'cbt_gas_exec_url_override';
  var LEGACY_KEY = 'cbt_gas_exec_url';

  function isValidExecUrl(u) {
    return /^https:\/\/script\.google\.com\/(?:a\/[^/]+\/)?macros\/s\/[a-zA-Z0-9_-]+\/exec(?:[?#].*)?$/i.test(String(u || '').trim());
  }

  function normalizeExecUrl(u) {
    return String(u || '').trim().replace(/\s+/g, '');
  }

  function getExecUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      var qUrl = normalizeExecUrl(params.get('gasUrl') || params.get('scriptUrl') || '');
      if (isValidExecUrl(qUrl)) {
        localStorage.setItem(OVERRIDE_KEY, qUrl);
        return qUrl;
      }
    } catch (e) {}

    try {
      var overrideUrl = normalizeExecUrl(localStorage.getItem(OVERRIDE_KEY) || '');
      if (isValidExecUrl(overrideUrl)) return overrideUrl;
    } catch (e) {}

    if (window.CBT_GAS_EXEC_URL && isValidExecUrl(window.CBT_GAS_EXEC_URL)) {
      return normalizeExecUrl(window.CBT_GAS_EXEC_URL);
    }

    try {
      var legacySaved = normalizeExecUrl(localStorage.getItem(LEGACY_KEY) || '');
      if (isValidExecUrl(legacySaved)) return legacySaved;
    } catch (e) {}

    return DEFAULT_URL;
  }

  var bannerEl = null;

  function buildDiagnosticMessage(execUrl, reason) {
    var shortUrl = execUrl ? execUrl.replace(/^https:\/\/script\.google\.com\/macros\/s\//, '.../').replace(/\/exec.*$/, '/exec') : '(kosong)';
    return (
      '<div style="font-size:12px;color:#e2e8f0;line-height:1.55;">' +
      '<div style="margin-bottom:6px;"><b>Penyebab:</b> ' + (reason || 'Server Google Apps Script tidak merespon JSON/API.') + '</div>' +
      '<div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:11px;color:#cbd5e1;">' +
      '<b>Checklist Wajib Sinkronisasi GitHub &rarr; Spreadsheet:</b><br/>' +
      '1. Buka Spreadsheet <code>' + SPREADSHEET_ID + '</code> dengan akun <b>' + OWNER_EMAIL + '</b> &rarr; <b>Ekstensi &rarr; Apps Script</b>.<br/>' +
      '2. Pastikan isi <code>Code.gs</code> sudah versi terbaru (ada <code>doPost</code> &amp; <code>doGet?api=1</code>).<br/>' +
      '3. Klik <b>Deploy &rarr; Deployment baru</b> (atau <i>Kelola Deployment &rarr; Edit &rarr; Versi Baru</i>):<br/>' +
      '&nbsp;&nbsp;&bull; <b>Jalankan sebagai:</b> Saya (<code>' + OWNER_EMAIL + '</code>)<br/>' +
      '&nbsp;&nbsp;&bull; <b>Yang memiliki akses:</b> <b>Siapa saja (Anyone)</b><br/>' +
      '4. Salin <b>URL Aplikasi Web (<code>.../exec</code>)</b> hasil deploy tersebut lalu tempel di bawah ini (atau simpan permanen di file <code>gas-config.js</code> GitHub).' +
      '</div>' +
      '<div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">URL /exec aktif saat ini: <code style="color:#fbbf24;">' + shortUrl + '</code></div>' +
      '</div>'
    );
  }

  function showBridgeNotice(reason) {
    if (typeof document === 'undefined') return;
    var mount = function () {
      if (!document.body) return;
      var currentUrl = getExecUrl();
      if (bannerEl && document.body.contains(bannerEl)) {
        var msgNode = bannerEl.querySelector('#cbt-gas-diag-msg');
        if (msgNode) msgNode.innerHTML = buildDiagnosticMessage(currentUrl, reason);
        return;
      }

      var div = document.createElement('div');
      div.id = 'cbt-gas-bridge-notice';
      div.style.cssText = 'position:fixed;bottom:12px;right:12px;left:12px;margin:0 auto;z-index:99999;max-width:460px;background:#0f172a;color:#f8fafc;border:2px solid #f59e0b;border-radius:16px;padding:14px 16px;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 20px 45px rgba(0,0,0,0.45);max-height:85vh;overflow-y:auto;';
      div.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">' +
          '<div style="font-weight:800;color:#fbbf24;font-size:13px;">&#9888;&#65039; Koneksi GitHub &harr; Spreadsheet Belum Sinkron</div>' +
          '<button type="button" id="cbt-gas-close-notice" style="background:#334155;color:#fff;border:none;border-radius:8px;padding:4px 9px;font-size:11px;font-weight:700;cursor:pointer;">Tutup</button>' +
        '</div>' +
        '<div id="cbt-gas-diag-msg">' + buildDiagnosticMessage(currentUrl, reason) + '</div>' +
        '<div style="margin-top:8px;">' +
          '<label style="display:block;font-size:11px;font-weight:700;color:#38bdf8;margin-bottom:4px;">Tempel URL Web App Apps Script (.../exec):</label>' +
          '<input id="cbt-gas-url-input" type="url" value="' + currentUrl.replace(/"/g, '&quot;') + '" placeholder="https://script.google.com/macros/s/.../exec" style="width:100%;box-sizing:border-box;background:#020617;color:#f8fafc;border:1px solid #475569;border-radius:10px;padding:8px 10px;font-size:11px;font-family:monospace;outline:none;" />' +
        '</div>' +
        '<div id="cbt-gas-test-status" style="margin-top:6px;font-size:11px;display:none;"></div>' +
        '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;">' +
          '<button type="button" id="cbt-gas-reset-url" style="background:#1e293b;color:#cbd5e1;border:1px solid #475569;border-radius:10px;padding:7px 11px;font-size:11px;font-weight:700;cursor:pointer;">Reset Default</button>' +
          '<button type="button" id="cbt-gas-save-test" style="background:#f59e0b;color:#0f172a;border:none;border-radius:10px;padding:7px 14px;font-size:11px;font-weight:800;cursor:pointer;">Simpan &amp; Tes Koneksi</button>' +
        '</div>';

      document.body.appendChild(div);
      bannerEl = div;

      var closeBtn = document.getElementById('cbt-gas-close-notice');
      if (closeBtn) {
        closeBtn.onclick = function () {
          div.remove();
          bannerEl = null;
        };
      }

      var resetBtn = document.getElementById('cbt-gas-reset-url');
      if (resetBtn) {
        resetBtn.onclick = function () {
          try {
            localStorage.removeItem(OVERRIDE_KEY);
            localStorage.removeItem(LEGACY_KEY);
          } catch (e) {}
          window.location.reload();
        };
      }

      var saveTestBtn = document.getElementById('cbt-gas-save-test');
      var inputEl = document.getElementById('cbt-gas-url-input');
      var statusEl = document.getElementById('cbt-gas-test-status');
      if (saveTestBtn && inputEl && statusEl) {
        saveTestBtn.onclick = async function () {
          var nextUrl = normalizeExecUrl(inputEl.value);
          statusEl.style.display = 'block';
          if (!isValidExecUrl(nextUrl)) {
            statusEl.style.color = '#fda4af';
            statusEl.textContent = 'Format URL tidak valid! Harus link Web App berakhiran /exec (bukan link spreadsheet atau /edit).';
            return;
          }
          saveTestBtn.disabled = true;
          saveTestBtn.textContent = 'Mengetes...';
          statusEl.style.color = '#7dd3fc';
          statusEl.textContent = 'Menghubungi Apps Script (POST & JSONP)...';

          var probeResult = await probeEndpoint(nextUrl);
          if (probeResult.ok) {
            try {
              localStorage.setItem(OVERRIDE_KEY, nextUrl);
              localStorage.setItem(LEGACY_KEY, nextUrl);
            } catch (e) {}
            window.CBT_GAS_EXEC_URL = nextUrl;
            statusEl.style.color = '#6ee7b7';
            statusEl.innerHTML = '<b>BERHASIL TERHUBUNG!</b> (' + (probeResult.detail || 'Siap sinkronisasi') + '). Memuat ulang halaman...';
            setTimeout(function () { window.location.reload(); }, 900);
          } else {
            saveTestBtn.disabled = false;
            saveTestBtn.textContent = 'Simpan & Tes Koneksi';
            statusEl.style.color = '#fda4af';
            statusEl.textContent = probeResult.message;
          }
        };
      }
    };

    if (document.body) mount();
    else window.addEventListener('DOMContentLoaded', mount);
  }

  function invokeJsonp(execUrl, fnName, args) {
    return new Promise(function (resolve, reject) {
      var cbName = '__cbtGasCb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
      var script = document.createElement('script');
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('Timeout menghubungi Apps Script (JSONP). Pastikan Code.gs terbaru sudah di-Deploy.'));
      }, 18000);

      function cleanup() {
        clearTimeout(timer);
        try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function (data) {
        if (done) return;
        done = true;
        cleanup();
        resolve(data);
      };

      script.onerror = function () {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('Apps Script mengembalikan HTML/error bukan JSONP (kemungkinan Code.gs belum versi baru atau akses belum "Siapa saja").'));
      };

      var sep = execUrl.indexOf('?') === -1 ? '?' : '&';
      var src = execUrl + sep + 'api=1&fn=' + encodeURIComponent(fnName) +
        '&args=' + encodeURIComponent(JSON.stringify(args || [])) +
        '&callback=' + encodeURIComponent(cbName);
      script.src = src;
      document.head.appendChild(script);
    });
  }

  async function invokePost(execUrl, fnName, args) {
    var response = await fetch(execUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: fnName, args: args || [] })
    });

    var rawText = await response.text();
    if (!rawText || rawText.trim().charAt(0) === '<') {
      if (/doPost|Script function not found/i.test(rawText)) {
        throw new Error('MISSING_DOPOST: Code.gs pada URL /exec ini masih versi lama (belum ada fungsi doPost).');
      }
      if (/ServiceLogin|accounts\.google\.com|Access denied/i.test(rawText)) {
        throw new Error('AUTH_REQUIRED: Web App belum disetel ke "Yang memiliki akses: Siapa saja (Anyone)".');
      }
      throw new Error('INVALID_HTML_RESPONSE: Respon Apps Script berupa HTML, bukan JSON.');
    }

    var payload = JSON.parse(rawText);
    if (!payload || payload.ok === false) {
      throw new Error((payload && payload.error) ? payload.error : 'Gagal menjalankan fungsi ' + fnName);
    }
    return payload.result;
  }

  async function probeEndpoint(execUrl) {
    if (!isValidExecUrl(execUrl)) {
      return { ok: false, message: 'URL Web App Apps Script (/exec) tidak valid.' };
    }
    try {
      var resPost = await invokePost(execUrl, 'pingGasBridge', []);
      if (resPost && resPost.success === false) {
        return {
          ok: false,
          message: 'doPost aktif, tetapi gagal membuka Spreadsheet: ' + (resPost.message || 'Periksa akun deployer ' + OWNER_EMAIL)
        };
      }
      return {
        ok: true,
        detail: resPost && resPost.spreadsheetName ? ('Spreadsheet: ' + resPost.spreadsheetName) : 'POST & Spreadsheet aktif'
      };
    } catch (postErr) {
      var msg = postErr && postErr.message ? postErr.message : '';
      // Fallback jika Code.gs versi v1 sudah punya doPost tapi belum punya pingGasBridge
      if (/Fungsi tidak diizinkan:\s*pingGasBridge/i.test(msg)) {
        try {
          var appCfg = await invokePost(execUrl, 'getAppSettings', []);
          if (appCfg && appCfg.success) {
            return { ok: true, detail: 'Terhubung ke Apps Script (v1)' };
          }
        } catch (e2) {}
      }

      // Coba probe JSONP agar bisa membedakan "CORS karena doPost hilang / akses tertutup" vs jaringan mati
      try {
        var jsonpRes = await invokeJsonp(execUrl, 'getAppSettings', []);
        if (jsonpRes && jsonpRes.ok && jsonpRes.result && jsonpRes.result.success) {
          return {
            ok: false,
            message: 'GET ?api=1 aktif, tetapi POST (simpan data) gagal/terblokir CORS. Pastikan Deploy Web App dengan akses "Siapa saja (Anyone)".'
          };
        }
      } catch (jsonpErr) {
        return {
          ok: false,
          message: 'URL /exec ini tidak merespon API Apps Script (doPost & ?api=1 gagal). Pastikan Anda sudah copy Code.gs terbaru ke Apps Script akun ' + OWNER_EMAIL + ', Deploy > Versi Baru (Siapa saja), lalu tempel URL /exec barunya.'
        };
      }

      return { ok: false, message: msg || 'Gagal terhubung ke Apps Script.' };
    }
  }

  var startupDiagnosticDone = false;
  function notifyDiagnosticOnce(execUrl, err) {
    if (startupDiagnosticDone) return;
    startupDiagnosticDone = true;
    var errMsg = err && err.message ? err.message : '';
    var friendlyReason = '';
    if (/MISSING_DOPOST/i.test(errMsg)) {
      friendlyReason = '<code>Code.gs</code> pada URL Web App ini masih versi lama (fungsi <code>doPost</code> belum ada).';
    } else if (/AUTH_REQUIRED/i.test(errMsg)) {
      friendlyReason = 'Web App Apps Script meminta login Google. Setel <b>Yang memiliki akses: Siapa saja (Anyone)</b>.';
    } else {
      friendlyReason = 'Permintaan ke Apps Script ditolak/gagal (<code>' + (errMsg || 'Failed to fetch / CORS') + '</code>). Kemungkinan <code>Code.gs</code> terbaru belum di-Deploy sebagai <b>Versi Baru</b> atau URL <code>/exec</code> di <code>gas-config.js</code> masih menunjuk ke deployment lama.';
    }
    showBridgeNotice(friendlyReason);
  }

  async function invokeRpc(fnName, args, successHandler, failureHandler) {
    var execUrl = getExecUrl();
    if (!execUrl) {
      var noUrlErr = new Error('URL Apps Script (/exec) belum diisi di gas-config.js');
      showBridgeNotice('URL Web App Apps Script (<code>/exec</code>) masih kosong.');
      if (typeof failureHandler === 'function') failureHandler(noUrlErr);
      return;
    }

    try {
      var result = await invokePost(execUrl, fnName, args);
      if (typeof successHandler === 'function') {
        successHandler(result);
      }
    } catch (postErr) {
      // Fallback ke JSONP GET untuk payload ringkas bila POST diblokir proxy/ekstensi
      var serializedArgs = '';
      try { serializedArgs = JSON.stringify(args || []); } catch (e) {}
      if (serializedArgs.length > 0 && serializedArgs.length < 1600) {
        try {
          var jsonpRes = await invokeJsonp(execUrl, fnName, args);
          if (jsonpRes && jsonpRes.ok !== false) {
            if (typeof successHandler === 'function') successHandler(jsonpRes.result);
            return;
          }
        } catch (jsonpErr) {}
      }

      notifyDiagnosticOnce(execUrl, postErr);
      if (typeof failureHandler === 'function') {
        failureHandler(postErr);
      }
    }
  }

  function createRunner(successHandler, failureHandler) {
    return new Proxy({}, {
      get: function (_target, prop) {
        if (prop === 'withSuccessHandler') {
          return function (fn) { return createRunner(fn, failureHandler); };
        }
        if (prop === 'withFailureHandler') {
          return function (fn) { return createRunner(successHandler, fn); };
        }
        if (prop === 'withUserObject') {
          return function () { return createRunner(successHandler, failureHandler); };
        }
        if (typeof prop !== 'string') return undefined;
        return function () {
          var args = Array.prototype.slice.call(arguments);
          invokeRpc(prop, args, successHandler, failureHandler);
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = createRunner(null, null);
  window.__CBT_GAS_BRIDGE__ = {
    getExecUrl: getExecUrl,
    probeEndpoint: probeEndpoint,
    openSetupDialog: function () { showBridgeNotice('Silakan cek atau perbarui URL Web App Apps Script (<code>/exec</code>).'); }
  };

  // Cek kesehatan koneksi saat halaman GitHub Pages pertama dibuka
  setTimeout(function () {
    var url = getExecUrl();
    if (!url || startupDiagnosticDone) return;
    probeEndpoint(url).then(function (res) {
      if (!res.ok) {
        startupDiagnosticDone = true;
        showBridgeNotice(res.message);
      }
    }).catch(function () {});
  }, 1500);
})();
