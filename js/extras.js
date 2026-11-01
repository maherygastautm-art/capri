// Street Cred, notes, photo, graffiti néon, voix et micro, synchro chiffrée PC <-> iPhone, visites d'amis
var C = window.C || (window.C = {});

(function () {
  var data = C.data, el = C.el;
  function rr(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // ---------- Street Cred ----------
  var STEPS = [0, 50, 120, 220, 350, 520, 740, 1000, 1300, 1700];
  var SKINS = [
    { id: 'classique', name: 'Classique', level: 1, colors: null },
    { id: 'netwatch', name: 'Netwatch', level: 2, colors: { Red: '#1E90FF', RedBack: '#0B4F99', Pink: '#9FD8FF', Green: '#F2F6FF', GreenBack: '#AFC3D9', GreenMid: '#D6E4F5', Purple: '#0A1E5A' } },
    { id: 'arasaka', name: 'Arasaka', level: 5, colors: { Red: '#E8102E', RedBack: '#8E0A1C', Pink: '#FFFFFF', Green: '#F1F1F1', GreenBack: '#B9B9B9', GreenMid: '#D9D9D9', Purple: '#3A0008' } },
    { id: 'voodoo', name: 'Voodoo Boys', level: 7, colors: { Red: '#8A2BE2', RedBack: '#4B1680', Pink: '#C79BFF', Green: '#39FF14', GreenBack: '#1E8F0A', GreenMid: '#2FD40F', Purple: '#0F3D0A' } },
    { id: 'dore', name: 'Néon doré', level: 9, colors: { Red: '#FFB000', RedBack: '#B37800', Pink: '#FFE27A', Green: '#FF4FD8', GreenBack: '#A0207F', GreenMid: '#D435B0', Purple: '#5A2A00' } }
  ];
  var DANCES = [['dance', 'Classique', 1], ['dance2', 'Voguing', 3], ['dance3', 'Breakdance', 6], ['dance4', 'Glitch', 10]];

  var cred = C.cred = {
    SKINS: SKINS,
    levelOf: function (xp) { var l = 1; for (var i = 0; i < STEPS.length; i++) if (xp >= STEPS[i]) l = i + 1; return l; },
    level: function () { return cred.levelOf(data.cred || 0); },
    nextAt: function () { var l = cred.level(); return l >= STEPS.length ? -1 : STEPS[l]; },
    title: function () { var l = cred.level(); return l >= 10 ? 'Légende de Night City' : l >= 8 ? 'Edgerunner' : l >= 6 ? 'Netrunner' : l >= 4 ? 'Mercenaire' : l >= 2 ? 'Choom de rue' : 'Inconnu'; },
    unlockAt: function (level) {
      var p = [];
      SKINS.forEach(function (s) { if (s.level === level && level > 1) p.push('couleur « ' + s.name + ' »'); });
      DANCES.forEach(function (d) { if (d[2] === level && level > 1) p.push('danse « ' + d[1] + ' »'); });
      if (level === 4) p.push('nouvelles répliques');
      if (level === 8) p.push('répliques de légende');
      if (level === 10) p.push('titre « Légende de Night City »');
      return p.join(', ');
    },
    add: function (xp) {
      if (!xp) return;
      var before = cred.level();
      data.cred = (data.cred || 0) + xp;
      C.save();
      var after = cred.level();
      if (after > before) {
        var u = cred.unlockAt(after);
        C.achPopup('Street Cred niveau ' + after, u ? 'Débloqué : ' + u : cred.title());
        C.say(C.line('cred.up', 'Street Cred niveau {0} ! {1}', after, u ? 'Débloqué : ' + u + '.' : ''));
        if (after >= 10) C.unlock('legend');
      }
    },
    daily: function () {
      var today = new Date().toISOString().slice(0, 10);
      if (data.lastDaily === today) return;
      data.lastDaily = today; C.save();
      cred.add(15);
    },
    skin: function () {
      var s = SKINS.filter(function (k) { return k.id === data.skin && k.level <= cred.level(); })[0];
      return s || SKINS[0];
    },
    palette: function (s) { s = s || cred.skin(); return s.colors; },
    findSkin: function (n) { return SKINS.filter(function (s) { return n.indexOf(s.id) >= 0 || n.indexOf(C.norm(s.name)) >= 0; })[0] || null; },
    randomDance: function () { var ok = DANCES.filter(function (d) { return d[2] <= cred.level(); }); return pick(ok)[0]; },
    findDance: function (n) {
      var d = DANCES.filter(function (x) { return n.indexOf(C.norm(x[1])) >= 0; })[0];
      if (!d) return null;
      return d[2] <= cred.level() ? d[0] : { locked: d[1], level: d[2] };
    },
    summary: function () {
      var l = cred.level(), out = ['Street Cred : niveau ' + l + ' — ' + cred.title() + ' (' + (data.cred || 0) + ' XP' + (cred.nextAt() > 0 ? ', prochain niveau à ' + cred.nextAt() : ', niveau max') + ')'];
      for (var i = 2; i <= STEPS.length; i++) { var u = cred.unlockAt(i); if (u) out.push((l >= i ? '✔ ' : '▢ ') + 'niveau ' + i + ' : ' + u); }
      return out;
    }
  };

  // ---------- voix : choix et effets ----------
  var FX = [['normale', 'Normale'], ['robotique', 'Robotique'], ['gresillante', 'Grésillante'], ['glitch', 'Glitch']];
  var noiseCtx = null;
  function crackle(seconds) {
    try {
      noiseCtx = noiseCtx || new (window.AudioContext || window.webkitAudioContext)();
      var n = Math.floor(noiseCtx.sampleRate * seconds), buf = noiseCtx.createBuffer(1, n, noiseCtx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() - 0.5) * 0.08 + (Math.random() < 0.0008 ? (Math.random() - 0.5) * 0.9 : 0);
      var src = noiseCtx.createBufferSource(), g = noiseCtx.createGain();
      g.gain.value = 0.5; src.buffer = buf; src.connect(g); g.connect(noiseCtx.destination); src.start();
    } catch (e) { }
  }
  C.voice = {
    FX: FX,
    voices: function () { return window.speechSynthesis ? speechSynthesis.getVoices().filter(function (v) { return /^fr/i.test(v.lang); }) : []; },
    current: function () {
      var vs = C.voice.voices();
      return vs.filter(function (v) { return v.name === data.voiceName; })[0] || vs.filter(function (v) { return /amelie|audrey|marie|thomas|female/i.test(v.name); })[0] || vs[0] || null;
    },
    speak: function (t) {
      if (!window.speechSynthesis) return;
      try {
        speechSynthesis.cancel();
        var text = t.replace(/[«»*]/g, ''), voice = C.voice.current(), fx = data.voiceFx || 'normale';
        var parts = fx === 'glitch' ? text.split(/\s+/) : [text];
        parts.forEach(function (w, i) {
          if (fx === 'glitch' && Math.random() < 0.18 && w.length > 3) w = w.slice(0, 2) + '-' + w.slice(0, 2) + '-' + w;
          var u = new SpeechSynthesisUtterance(w);
          u.lang = 'fr-FR';
          if (voice) u.voice = voice;
          u.rate = fx === 'robotique' ? 0.9 : fx === 'glitch' ? rr(0.9, 1.6) : 1.05;
          u.pitch = fx === 'robotique' ? 0.3 : fx === 'glitch' ? rr(0.4, 1.9) : 1.15;
          if (i === 0) u.onstart = function () { C.speaking = true; if (fx === 'gresillante') crackle(Math.min(12, 0.4 + text.length * 0.065)); };
          if (i === parts.length - 1) u.onend = u.onerror = function () { C.speaking = false; };
          speechSynthesis.speak(u);
        });
      } catch (e) { }
    }
  };

  // ---------- micro (Safari) ----------
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  C.mic = {
    supported: !!Rec,
    listen: function (onText, onFail) {
      if (!Rec) { onFail('Ce navigateur ne permet pas le micro. Sur iPhone, utilise Safari (iOS 14.5 ou plus).'); return; }
      try {
        var r = new Rec();
        r.lang = 'fr-FR'; r.interimResults = false; r.maxAlternatives = 1; r.continuous = false;
        r.onresult = function (e) { var t = e.results[0][0].transcript; if (t) onText(t.trim()); };
        r.onerror = function (e) { onFail(e.error === 'not-allowed' ? "Tu as refusé l'accès au micro. Autorise-le dans Réglages > Safari > Micro." : 'Je t\'ai pas entendu. Réessaie.'); };
        r.start();
        return r;
      } catch (e) { onFail('Le micro refuse de s\'ouvrir.'); }
    }
  };

  // ---------- graffiti néon ----------
  C.graffiti = function (text) {
    text = text.toUpperCase().slice(0, 30);
    var c = el('canvas', 'fx-canvas'), dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    c.style.zIndex = 57;
    c.width = W * dpr; c.height = H * dpr;
    document.body.appendChild(c);
    var x = c.getContext('2d');
    x.scale(dpr, dpr);
    var size = Math.max(34, Math.min(110, W * 0.86 / Math.max(3, text.length * 0.58)));
    x.font = 'italic 700 ' + size + 'px Rajdhani, sans-serif';
    var tw = x.measureText(text).width, tx = (W - tw) / 2 + rr(-0.06, 0.06) * W, ty = H * rr(0.2, 0.36), rot = rr(-0.09, -0.02);
    var drips = [];
    for (var i = 0; i < 8; i++) drips.push({ x: tx + rr(0.05, 0.95) * tw, max: rr(12, 40), c: Math.random() < 0.5 ? '#FF2A8C' : '#3CE6FF' });
    var spray = [], REV = 1.3, HOLD = 5.5, FADE = 1;
    C.loop(function (t) {
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, W, H);
      if (t > REV + HOLD + FADE) { c.remove(); return true; }
      var u = Math.min(1, t / REV), fade = t > REV + HOLD ? 1 - (t - REV - HOLD) / FADE : 1;
      x.globalAlpha = fade * (Math.random() < 0.04 ? 0.5 : 1);
      x.save();
      x.translate(tx, ty); x.rotate(rot);
      x.beginPath(); x.rect(-20, -size, tw * u + 20, size * 2.6); x.clip();
      x.font = 'italic 700 ' + size + 'px Rajdhani, sans-serif';
      x.fillStyle = '#7B2CF0'; x.fillText(text, 6, 6);
      var g = x.createLinearGradient(0, -size, tw, 0);
      g.addColorStop(0, '#FF2A8C'); g.addColorStop(0.45, '#FF5A5A'); g.addColorStop(1, '#3CE6FF');
      x.shadowColor = '#FF3CA0'; x.shadowBlur = 24; x.fillStyle = g; x.fillText(text, 0, 0);
      x.shadowBlur = 0; x.globalAlpha *= 0.35; x.fillStyle = '#fff'; x.fillText(text, -1, -1);
      x.globalAlpha = fade;
      drips.forEach(function (d) {
        var start = (d.x - tx) / tw * REV;
        if (t > start) { var h = Math.min(d.max, (t - start) * 18); x.fillStyle = d.c; x.fillRect(d.x - tx, -size * 0.22, 3.5, h); }
      });
      x.restore();
      if (u < 1) for (var k = 0; k < 6; k++) spray.push({ x: tx + tw * u + rr(-15, 15), y: ty - size * 0.6 + rr(0, size * 0.8), t: t, c: Math.random() < 0.5 ? '#FF69B4' : '#5EF6FF' });
      spray = spray.filter(function (s) {
        var a = t - s.t;
        if (a > 0.6) return false;
        x.globalAlpha = 0.8 * (1 - a / 0.6); x.fillStyle = s.c; x.beginPath(); x.arc(s.x, s.y, 2, 0, Math.PI * 2); x.fill();
        return true;
      });
      x.globalAlpha = 1;
    });
  };

  // ---------- mode photo ----------
  function renderPhoto(anim, at) {
    var PW = 720, PH = 900, c = document.createElement('canvas');
    c.width = PW; c.height = PH;
    var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, PH);
    g.addColorStop(0, '#07070D'); g.addColorStop(0.65, '#240A1E'); g.addColorStop(1, '#460C28');
    x.fillStyle = g; x.fillRect(0, 0, PW, PH);
    var seed = 3;
    function R() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var bx = -10; bx < PW;) {
      var w = 30 + R() * 70, h = 200 + R() * 330;
      x.fillStyle = '#0E0B16'; x.fillRect(bx, PH - 120 - h, w, h);
      for (var wy = PH - 110 - h; wy < PH - 130; wy += 14) for (var wx = bx + 6; wx < bx + w - 6; wx += 10) if (R() < 0.08) { x.fillStyle = R() < 0.7 ? 'rgba(205,92,92,.5)' : 'rgba(0,255,255,.5)'; x.fillRect(wx, wy, 3, 5); }
      bx += w + 3;
    }
    x.fillStyle = '#0A0810'; x.fillRect(0, PH - 120, PW, 120);
    x.shadowColor = 'red'; x.shadowBlur = 16; x.fillStyle = '#FF5E57'; x.fillRect(0, PH - 121, PW, 3); x.shadowBlur = 0;
    var p = C.pose(anim, at), S = 3.4, F = C.FIG, pal = cred.palette();
    [['#3CF06E', -8, 0.45], ['#FF1E46', 8, 0.45], [null, 0, 1]].forEach(function (l) {
      x.save();
      x.translate(PW / 2 + l[1], PH - 122);
      x.scale(S, S);
      x.translate(-F.W / 2, -F.GROUND);
      C.drawFigure(x, p, l[0], l[0] ? null : pal, l[2]);
      x.restore();
    });
    x.strokeStyle = '#FF5E57'; x.lineWidth = 3;
    x.beginPath(); [[14, 14], [PW - 44, 14], [PW - 14, 44], [PW - 14, PH - 14], [44, PH - 14], [14, PH - 44]].forEach(function (q, i) { if (i) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); });
    x.closePath(); x.stroke();
    x.fillStyle = '#FF5E57'; x.fillRect(14, 10, 160, 8);
    x.font = '700 54px Rajdhani, sans-serif'; x.fillText('CAPRI.EXE', 36, 82);
    x.font = '16px "Share Tech Mono", monospace'; x.fillStyle = '#8A3633'; x.fillText('PHOTO // NIGHT CITY', 40, 108);
    var d = new Date();
    x.fillStyle = '#5EF6FF'; x.font = '18px "Share Tech Mono", monospace';
    x.fillText(('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear() + '  ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2), PW - 230, 58);
    x.fillStyle = '#FCEE0A'; x.font = '700 18px Rajdhani, sans-serif';
    x.fillText('STREET CRED ' + cred.level() + ' — ' + cred.title().toUpperCase(), 40, PH - 50);
    if (data.userName) { x.fillStyle = '#EAD9D6'; x.font = '16px Rajdhani, sans-serif'; var nm = 'AVEC ' + data.userName.toUpperCase(); x.fillText(nm, PW - 40 - x.measureText(nm).width, PH - 50); }
    return c;
  }
  C.photo = function () {
    var poses = ['wave', 'dance', 'think', 'sit'];
    if (cred.level() >= 3) poses.push('dance2');
    if (cred.level() >= 6) poses.push('dance3');
    var anim = pick(poses), at = Math.random() * 2, n = 3;
    C.stage.say(C.line('photo.ready', 'Photo ! Je prends la pose... {0}', '3'));
    var t = setInterval(function () {
      n--;
      if (n > 0) { C.stage.say(n + '...'); return; }
      clearInterval(t);
      var flash = el('div', 'fx-full'); flash.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:96;pointer-events:none;transition:opacity .35s';
      document.body.appendChild(flash);
      requestAnimationFrame(function () { flash.style.opacity = 0; });
      setTimeout(function () { flash.remove(); }, 400);
      var c = renderPhoto(anim, at), url = c.toDataURL('image/png');
      var w = el('div', 'photo-view', '<div class="pv"><div class="gk">CAPRI.EXE // PHOTO</div><img alt="Photo de Capri"><div class="pvh">Appuie longuement sur l\'image pour l\'enregistrer dans Photos.</div><div class="gbtns"><button class="btn share" type="button">PARTAGER</button><button class="btn close" type="button">FERMER</button></div></div>');
      w.querySelector('img').src = url;
      w.querySelector('.close').addEventListener('click', function () { w.remove(); });
      var sh = w.querySelector('.share');
      sh.addEventListener('click', function () {
        c.toBlob(function (b) {
          var file = new File([b], 'capri-' + Date.now() + '.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'Capri' }).catch(function () { });
          else { var a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); }
        });
      });
      document.body.appendChild(w);
      C.stage.say(C.line('photo.saved', 'Clic ! Ta photo est prête.'));
      C.unlock('photo');
      cred.add(5);
    }, 800);
  };

  // ---------- chiffrement de la synchro (identique à la version PC) ----------
  var RELAY = 'https://ntfy.sh/', ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', enc = new TextEncoder(), dec = new TextDecoder();
  function sha(s) { return crypto.subtle.digest('SHA-256', enc.encode(s)).then(function (b) { return new Uint8Array(b); }); }
  function hex(b) { return Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function gz(u8, mode) { return new Response(new Blob([u8]).stream().pipeThrough(mode ? new CompressionStream('gzip') : new DecompressionStream('gzip'))).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function keys(code) {
    return Promise.all([sha('capri-enc|' + code), sha('capri-mac|' + code)]).then(function (k) {
      return Promise.all([crypto.subtle.importKey('raw', k[0], { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']),
        crypto.subtle.importKey('raw', k[1], { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])]);
    });
  }
  function topic(code) { return sha('capri-topic|' + code).then(function (b) { return 'capri-' + hex(b).slice(0, 32); }); }
  function seal(code, json) {
    var iv = crypto.getRandomValues(new Uint8Array(16));
    return Promise.all([keys(code), gz(enc.encode(json), true)]).then(function (r) {
      return crypto.subtle.encrypt({ name: 'AES-CBC', iv: iv }, r[0][0], r[1]).then(function (ct) {
        var body = new Uint8Array(16 + ct.byteLength); body.set(iv); body.set(new Uint8Array(ct), 16);
        return crypto.subtle.sign('HMAC', r[0][1], body).then(function (mac) {
          var all = new Uint8Array(body.length + 32); all.set(body); all.set(new Uint8Array(mac), body.length);
          return b64(all);
        });
      });
    });
  }
  function open(code, s) {
    var all = unb64(s);
    if (all.length < 64) return Promise.resolve(null);
    var body = all.slice(0, all.length - 32), mac = all.slice(all.length - 32);
    return keys(code).then(function (k) {
      return crypto.subtle.verify('HMAC', k[1], mac, body).then(function (ok) {
        if (!ok) return null;
        return crypto.subtle.decrypt({ name: 'AES-CBC', iv: body.slice(0, 16) }, k[0], body.slice(16)).then(function (pl) { return gz(new Uint8Array(pl), false); }).then(function (u) { return dec.decode(u); });
      });
    }).catch(function () { return null; });
  }
  C.syncCrypto = { seal: seal, open: open };

  function genCode(groups) { var s = []; for (var g = 0; g < groups; g++) { var q = ''; for (var i = 0; i < 4; i++) q += ALPHA[Math.floor(Math.random() * ALPHA.length)]; s.push(q); } return s.join('-'); }
  function clean(code) { return code.toUpperCase().replace(/[^A-Z0-9\-]/g, '').replace(/^-+|-+$/g, ''); }

  var FIELDS = ['trust', 'messages', 'breachWins', 'rivalWins', 'cred', 'unlocked', 'userName', 'lastName', 'age', 'country', 'favGame', 'project', 'birthday', 'firstMet',
    'likes', 'dislikes', 'city', 'lat', 'lon', 'contacts', 'notes', 'skin'];
  function snapshot() { var o = {}; FIELDS.forEach(function (k) { o[k] = data[k]; }); return o; }
  function apply(d) {
    data.trust = d.trust || 0;
    ['messages', 'breachWins', 'rivalWins', 'cred'].forEach(function (k) { data[k] = Math.max(data[k] || 0, d[k] || 0); });
    Object.keys(d.unlocked || {}).forEach(function (k) { if (!data.unlocked[k]) data.unlocked[k] = d.unlocked[k]; });
    ['userName', 'lastName', 'age', 'country', 'favGame', 'project', 'birthday', 'city'].forEach(function (k) { data[k] = d[k] || ''; });
    if (d.firstMet) data.firstMet = d.firstMet;
    data.likes = d.likes || []; data.dislikes = d.dislikes || []; data.lat = d.lat || 0; data.lon = d.lon || 0;
    data.contacts = d.contacts || {}; data.notes = d.notes || [];
    if (d.skin) data.skin = d.skin;
    if (data.userName) data.profileDone = true;
    C.save();
  }
  function hashOf(s) { return sha(s).then(function (b) { return hex(b).slice(0, 16); }); }

  var syncBusy = false;
  var sync = C.sync = {
    pushIfChanged: function (force) {
      if (syncBusy || !data.syncOn || !data.syncCode) return Promise.resolve();
      var code = data.syncCode, json = JSON.stringify(snapshot());
      return hashOf(json).then(function (h) {
        if (!force && h === data.syncHash) return;
        var now = Date.now();
        return seal(code, JSON.stringify({ v: 1, updated: now, from: 'iphone', data: snapshot() })).then(function (box) {
          var body = 'S1:' + box;
          if (body.length > 4000) { C.say('Trop de données à synchroniser (notes ou contacts). Fais un peu de ménage.'); return; }
          data.syncHash = h; data.syncStamp = now; C.save();
          return topic(code).then(function (t) { return fetch(RELAY + t, { method: 'POST', body: body }); });
        });
      }).catch(function () { });
    },
    pull: function (thenPush) {
      if (syncBusy || !data.syncCode) return Promise.resolve(false);
      syncBusy = true;
      var code = data.syncCode;
      return topic(code).then(function (t) { return fetch(RELAY + t + '/json?poll=1&since=all', { cache: 'no-store' }); }).then(function (r) { return r.text(); }).then(function (txt) {
        var msgs = txt.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { try { return JSON.parse(l); } catch (e) { return null; } })
          .filter(function (m) { return m && m.message && m.message.indexOf('S1:') === 0; });
        return Promise.all(msgs.map(function (m) { return open(code, m.message.slice(3)); }));
      }).then(function (list) {
        var best = null;
        list.forEach(function (j) { if (!j) return; try { var p = JSON.parse(j); if (!best || p.updated > best.updated) best = p; } catch (e) { } });
        syncBusy = false;
        var applied = false;
        if (best && best.updated > (data.syncStamp || 0)) {
          apply(best.data);
          data.syncStamp = best.updated;
          applied = true;
          C.unlock('sync');
          return hashOf(JSON.stringify(snapshot())).then(function (h) { data.syncHash = h; C.save(); if (thenPush) sync.pushIfChanged(false); return applied; });
        }
        if (thenPush) sync.pushIfChanged(!best);
        return applied;
      }).catch(function () { syncBusy = false; return false; });
    },
    start: function (code) {
      if (!code) {
        if (!data.syncCode) data.syncCode = 'CPR-' + genCode(3);
        data.syncOn = true; data.syncHash = ''; C.save();
        sync.pushIfChanged(true);
        return Promise.resolve({ code: data.syncCode, applied: false });
      }
      data.syncCode = clean(code); data.syncOn = true; data.syncStamp = 0; data.syncHash = ''; C.save();
      return sync.pull(true).then(function (ok) { return { code: data.syncCode, applied: ok }; });
    },
    stop: function () { data.syncOn = false; C.save(); }
  };

  // ---------- visites d'amis ----------
  function friendTopic(code) { return sha('capri-ami|' + code).then(function (b) { return 'capri-ami-' + hex(b).slice(0, 24); }); }
  var visitQueue = [];
  var friends = C.friends = {
    myCode: function () { if (!data.friendCode) { data.friendCode = 'AMI-' + genCode(2); C.save(); } return data.friendCode; },
    send: function (code, msg) {
      var body = 'V1:' + JSON.stringify({ from: data.userName || 'Un choom', skin: cred.skin().id, msg: msg || '', back: friends.myCode() });
      return friendTopic(clean(code)).then(function (t) { return fetch(RELAY + t, { method: 'POST', body: body }); }).then(function (r) { return r.ok; }).catch(function () { return false; });
    },
    topicOf: friendTopic,
    clean: clean,
    post: function (code, body) {
      return friendTopic(clean(code)).then(function (t) { return fetch(RELAY + t, { method: 'POST', body: body }); }).then(function (r) { return r.ok; }).catch(function () { return false; });
    },
    // boîte de réception du code ami : visites (V1) et messages d'amis (F1)
    poll: function () {
      if (document.hidden) return;
      var since = data.lastVisit ? data.lastVisit + 1 : Math.floor(Date.now() / 1000) - 3600;
      friendTopic(friends.myCode()).then(function (t) { return fetch(RELAY + t + '/json?poll=1&since=' + since, { cache: 'no-store' }); }).then(function (r) { return r.text(); }).then(function (txt) {
        var last = data.lastVisit || 0, social = [];
        txt.split('\n').forEach(function (l) {
          if (!l.trim()) return;
          try {
            var m = JSON.parse(l), visit = m.message && m.message.indexOf('V1:') === 0;
            if (!m.message || (!visit && m.message.indexOf('F1:') !== 0) || m.time <= (data.lastVisit || 0)) return;
            last = Math.max(last, m.time);
            var body = JSON.parse(m.message.slice(3));
            if (!visit) social.push(body);
            else if (data.cfg.visits !== false) visitQueue.push(body);
          } catch (e) { }
        });
        if (last !== (data.lastVisit || 0)) { data.lastVisit = last; C.save(); }
        social.forEach(function (b) { if (C.buddies) C.buddies.handle(b); });
        showVisit();
      }).catch(function () { });
    }
  };

  // la Capri de l'ami débarque à côté de la nôtre, salue, dit son message, danse et repart
  function showVisit() {
    if (C.visitor || !visitQueue.length || C.stage.busy()) return;
    var v = visitQueue.shift(), s = C.stage, st = s.st, W = s.W(), S = s.S();
    var skin = SKINS.filter(function (k) { return k.id === v.skin; })[0];
    var pal = (!skin || skin.id === cred.skin().id) ? { Red: '#3CF06E', Green: '#FF1E46', GreenBack: '#B0122F', GreenMid: '#FF4F8B', Pink: '#2FD25E' } : skin.colors;
    var side = st.x < W / 2 ? 1 : -1, x = Math.max(40, Math.min(W - 40, st.x + side * Math.min(150, W * 0.38))), t = 0, step = 0;
    var b = el('div', 'bubble notif', '<div class="bh"></div><div class="bt"></div>');
    b.querySelector('.bh').textContent = (v.from || 'Un choom').toUpperCase() + ' // VISITE';
    b.querySelector('.bt').textContent = v.msg || 'Salut ! Je passais dans le coin.';
    b.classList.add('hidden');
    document.body.appendChild(b);
    C.visitor = {
      draw: function (dt) {
        t += dt;
        if (step === 0 && t > 0.7) { step++; b.classList.remove('hidden'); }
        if (step === 1 && t > 2.2) { step++; s.wave(); C.say(C.line('visit.hello', "Hé, c'est {0} ! Salut, choom !", v.from || 'un choom')); C.unlock('visit'); cred.add(10); }
        if (step === 2 && t > 5.5) { step++; b.classList.add('hidden'); }
        if (t > 8.2) { b.remove(); C.visitor = null; setTimeout(showVisit, 1500); return; }
        var anim = t < 5.5 ? 'wave' : 'dance', p = C.pose(anim, t), y = s.floor();
        var a = t < 0.6 ? (Math.random() < 0.5 ? 0.25 : 0.9) : t > 7.4 ? (8.2 - t) / 0.8 * (Math.random() < 0.4 ? 0.3 : 1) : 1;
        if (t < 0.6 || t > 7.4 || Math.random() < 0.03) { s.drawFig(p, x - 5, y, -side, '#3CF06E', null, 0.6 * a); s.drawFig(p, x + 5, y, -side, '#FF1E46', null, 0.6 * a); }
        s.drawFig(p, x, y, -side, null, pal, a);
        if (!b.classList.contains('hidden')) s.placeBubble(b, x, y - 222 * S);
      }
    };
  }
  C.showVisit = showVisit;

  // ---------- commandes ----------
  C.tryNew = function (n, raw, reply, ask, P) {
    var m, t = raw.trim();

    m = t.match(/^(?:note|nouvelle note|prends note|retiens)\s*[:\-]?\s+([\s\S]+)$/i);
    if (m && !/^notes?$/.test(n)) {
      data.notes = data.notes || [];
      data.notes.push(new Date().toISOString().slice(0, 10) + '|' + m[1].trim());
      data.notes = data.notes.slice(-50); C.save();
      C.unlock('note'); cred.add(3);
      reply(C.line('note.saved', 'Fragment de mémoire n°{0} enregistré.', data.notes.length));
      return true;
    }
    if (/^(mes notes|notes|mes fragments|fragments de memoire|liste des notes)$/.test(n)) {
      if (!data.notes || !data.notes.length) { reply('Aucun fragment de mémoire. Dis « note : acheter du lait ».'); return true; }
      data.notes.forEach(function (x, i) { var p = x.split('|'); C.sys('fragment ' + (i + 1) + ' [' + p[0] + '] ' + p.slice(1).join('|')); });
      reply(C.line('note.list', '{0} fragment(s) de mémoire. « supprime la note 2 » pour en effacer un.', data.notes.length));
      return true;
    }
    m = n.match(/^(supprime|efface|retire) (la )?note (\d+)$/);
    if (m) {
      var i = +m[3] - 1;
      if (!data.notes || i < 0 || i >= data.notes.length) { reply('Pas de fragment n°' + (i + 1) + '.'); return true; }
      data.notes.splice(i, 1); C.save();
      reply('Fragment ' + (i + 1) + ' effacé.');
      return true;
    }
    if (/^(efface|supprime|vide) (toutes )?(mes|les) notes$/.test(n)) { ask('J\'efface tous tes fragments de mémoire ? (oui / non)', function () { data.notes = []; C.save(); reply('Tous les fragments sont effacés.'); }); return true; }

    if (/^(street cred|ma cred|mon niveau|niveau|cred|ma street cred)$/.test(n)) {
      cred.summary().forEach(function (l) { C.sys(l); });
      reply(C.line('cred.show', 'Street Cred niveau {0}. {1}.', cred.level(), cred.title()));
      return true;
    }
    if (/^(couleurs|skins|mes couleurs|mes skins|tenues)$/.test(n)) {
      SKINS.forEach(function (k) { C.sys((k.level <= cred.level() ? '✔ ' : '▢ ') + k.name + (k.level > 1 ? ' (niveau ' + k.level + ')' : '') + (k.id === cred.skin().id ? '  ← actuelle' : '')); });
      reply('Dis « couleur netwatch » (ou arasaka, voodoo, doré, classique) pour changer.');
      return true;
    }
    m = n.match(/^(couleur|skin|tenue|change de couleur|mets la couleur|mets le skin) (.+)$/);
    if (m) {
      var k = cred.findSkin(m[2]);
      if (!k) { reply('Connais pas cette couleur. Dis « couleurs » pour la liste.'); return true; }
      if (k.level > cred.level()) { reply('La couleur « ' + k.name + ' » se débloque au niveau ' + k.level + ' de Street Cred.'); return true; }
      data.skin = k.id; C.save();
      C.stage.dance();
      reply(C.line('skin.set', 'Nouvelle couleur : {0}. Je suis comment ?', k.name));
      return true;
    }
    m = n.match(/^(?:danse|fais (?:la|une) danse) (.+)$/);
    if (m) {
      var d = cred.findDance(m[1]);
      if (d) {
        if (d.locked) { reply('La danse « ' + d.locked + ' » se débloque au niveau ' + d.level + ' de Street Cred.'); return true; }
        C.stage.dance(d);
        reply(P('dance', 'Regarde ça !'));
        return true;
      }
    }

    if (/^(photo|prends une photo|selfie|mode photo|prends moi en photo|fais une photo)$/.test(n)) { C.ui.closePanel(); C.photo(); return true; }
    m = t.match(/^(?:tag|tague|graffiti|graff)\s*[:\-]?\s+(.+)$/i);
    if (m) {
      C.ui.closePanel();
      C.graffiti(m[1].trim());
      C.stage.say(C.line('tag.done', 'Tag posé. Night City approuve.'));
      C.unlock('tag'); cred.add(3);
      return true;
    }

    m = n.match(/^(?:voix|mets la voix|prends la voix|change de voix en) (normale|robotique|robot|gresillante|radio|glitch|buggee)$/);
    if (m) {
      var fx = m[1] === 'robot' ? 'robotique' : m[1] === 'radio' ? 'gresillante' : m[1] === 'buggee' ? 'glitch' : m[1];
      data.voiceFx = fx; C.save();
      var line = C.line('voice.set', 'Voix {0} activée. Ça te plaît ?', fx);
      reply(line);
      if (!data.cfg.voice) C.voice.speak(line);
      return true;
    }
    if (/^(change de voix|autre voix|voix suivante)$/.test(n)) {
      var vs = C.voice.voices();
      if (vs.length < 2) { reply('Il n\'y a qu\'une voix française sur ce téléphone. Essaie « voix robotique » ou « voix glitch ».'); return true; }
      var cur = C.voice.current(), idx = vs.indexOf(cur);
      data.voiceName = vs[(idx + 1) % vs.length].name; C.save();
      var l2 = 'Voix : ' + data.voiceName + '.';
      reply(l2);
      if (!data.cfg.voice) C.voice.speak(l2);
      return true;
    }

    m = t.match(/^(?:synchro|synchronise|synchronisation|sync)(?:\s+(?:avec\s+)?(CPR[\-\s]?[A-Za-z0-9\-\s]{8,}))?$/i);
    if (m) {
      if (m[1]) {
        reply('Connexion au relais avec ce code...');
        sync.start(m[1]).then(function (r) {
          reply(r.applied ? C.line('sync.got', 'Lien établi. J\'ai récupéré ma mémoire de l\'autre appareil.')
            : 'Synchro activée. Rien à récupérer pour l\'instant : ouvre Capri sur l\'autre appareil, puis redis « synchro maintenant ».');
        });
      } else {
        sync.start(null).then(function (r) { C.sys('code de synchro : ' + r.code); reply(C.line('sync.code', 'Synchro activée. Sur l\'autre appareil, dis-moi « synchro {0} ». Garde ce code secret.', r.code)); });
      }
      return true;
    }
    if (/^(synchro maintenant|synchronise maintenant|resynchronise)$/.test(n)) {
      if (!data.syncOn) { reply('La synchro n\'est pas activée. Dis « synchro ».'); return true; }
      sync.pushIfChanged(false).then(function () { return sync.pull(false); }).then(function (ok) { reply(ok ? 'Mémoire mise à jour depuis l\'autre appareil.' : 'Synchro faite. Rien de plus récent sur l\'autre appareil.'); });
      return true;
    }
    if (/^(arrete|desactive|coupe|stop) (la )?synchro$/.test(n)) { sync.stop(); reply('Synchro désactivée sur ce téléphone.'); return true; }

    if (/^(mon code ami|code ami|mon code d ami|code d ami)$/.test(n)) {
      var fc = friends.myCode();
      C.sys('ton code ami : ' + fc);
      reply(C.line('visit.code', 'Ton code ami : {0}. Tes amis tapent « visite {0} » pour que leur Capri passe te voir.', fc));
      return true;
    }
    m = t.match(/^(?:visite|rends visite a|rends visite à|va voir|passe voir)\s+(AMI[\-\s]?[A-Za-z0-9]{4}[\-\s]?[A-Za-z0-9]{4})\s*([\s\S]*)$/i);
    if (m) {
      if (clean(m[1]) === clean(friends.myCode())) { reply('C\'est ton propre code, choom. Donne-le à quelqu\'un d\'autre.'); return true; }
      friends.send(m[1], m[2].trim()).then(function (ok) {
        if (ok) { reply(C.line('visit.sent', 'Je file chez ton ami. Je lui passe le bonjour.')); cred.add(10); }
        else reply('Le relais ne répond pas. T\'es connecté au Net ?');
      });
      return true;
    }
    if (C.trySocial && C.trySocial(n, t, reply, ask)) return true;
    if (/^(ecoute moi|micro|active le micro|ecoute)$/.test(n)) { C.startMic(); return true; }
    return false;
  };

  // ---------- réglages en plus ----------
  C.extraSettings = function (box, row, toggle) {
    function cycle(label, get, next) {
      var r = el('div', 'row', '<div class="lb"></div><div class="rt"></div>');
      r.querySelector('.lb').textContent = label;
      var rt = r.querySelector('.rt');
      rt.style.color = 'var(--cyan)';
      function show() { rt.textContent = get().toUpperCase() + '  ›'; }
      show();
      r.addEventListener('click', function () { next(); C.save(); show(); });
      box.appendChild(r);
    }
    box.appendChild(el('div', 'section', 'Voix'));
    cycle('Effet de voix', function () { return (FX.filter(function (f) { return f[0] === (data.voiceFx || 'normale'); })[0] || FX[0])[1]; }, function () {
      var i = FX.findIndex(function (f) { return f[0] === (data.voiceFx || 'normale'); });
      data.voiceFx = FX[(i + 1) % FX.length][0];
      C.voice.speak('Test de la voix ' + data.voiceFx + '.');
    });
    cycle('Voix', function () { var v = C.voice.current(); return v ? v.name : 'par défaut'; }, function () {
      var vs = C.voice.voices();
      if (!vs.length) return;
      data.voiceName = vs[(vs.indexOf(C.voice.current()) + 1) % vs.length].name;
      C.voice.speak('Salut, je suis Capri.');
    });
    box.appendChild(el('div', 'section', 'Street Cred'));
    cycle('Couleur', function () { return cred.skin().name; }, function () {
      var open = SKINS.filter(function (k) { return k.level <= cred.level(); }), i = open.indexOf(cred.skin());
      data.skin = open[(i + 1) % open.length].id;
    });
    row('Niveau', 'NIVEAU ' + cred.level() + ' — ' + cred.title().toUpperCase() + ' (' + (data.cred || 0) + ' XP)');
    box.appendChild(el('div', 'section', 'Synchro'));
    toggle('Synchro PC ↔ iPhone', function () { return !!data.syncOn; }, function (v) {
      if (v) sync.start(null).then(function (r) { C.sys('code de synchro : ' + r.code + ' — sur le PC, tape « synchro ' + r.code + ' ».'); });
      else sync.stop();
    });
    row('Code de synchro', data.syncOn && data.syncCode ? data.syncCode : '—');
    if (C.socialSettings) C.socialSettings(box, row, toggle);
  };

  // synchro et visites en arrière-plan
  C.startBackground = function () {
    cred.daily();
    if (data.syncOn && data.syncCode) sync.pull(true);
    var ticks = 0;
    setInterval(function () {
      if (document.hidden) return;
      if (data.syncOn && data.syncCode) { sync.pushIfChanged(false); if (++ticks % 3 === 0) sync.pull(false); }
      friends.poll();
    }, 60000);
    setTimeout(friends.poll, 5000);
    setTimeout(function () { if (C.buddies) C.buddies.broadcast(false); }, 8000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && data.syncOn) sync.pull(true); });
  };
})();
