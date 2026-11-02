// Photo de profil : un avatar Capri (dessins originaux) ou une photo de la galerie passée au filtre « holo » rouge et blanc
// (recadrage carré, lignes de balayage, grain, tranche glitch, coins de cadre). Gardée en 128 px, envoyée aux amis en 96 px.
var C = window.C || (window.C = {});

(function () {
  var data = C.data, el = C.el, S = 256;

  // ---------- filtre « holo » ----------
  // surtout du rouge : le blanc est réservé aux reflets les plus clairs
  var RAMP = [[0, [14, 2, 6]], [0.3, [96, 12, 22]], [0.58, [200, 40, 48]], [0.8, [255, 104, 96]], [0.93, [255, 196, 188]], [1, [255, 240, 236]]];
  function ramp(t) {
    for (var i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) {
      var a = RAMP[i - 1], b = RAMP[i], u = (t - a[0]) / (b[0] - a[0]);
      return [0, 1, 2].map(function (k) { return a[1][k] + (b[1][k] - a[1][k]) * u; });
    }
    return RAMP[RAMP.length - 1][1];
  }
  function holo(src, opt) {
    opt = opt || {};
    var bri = (opt.bri || 0) / 100, con = (opt.con == null ? 35 : opt.con) / 100, gl = opt.glitch == null ? 1 : opt.glitch, seed0 = opt.seed || 7;
    var c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d');
    var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, s = Math.min(w, h);
    g.drawImage(src, (w - s) / 2, (h - s) / 2, s, s, 0, 0, S, S);
    var d = g.getImageData(0, 0, S, S), p = d.data, L = new Float32Array(S * S), hist = new Uint32Array(256), i, v;
    for (i = 0; i < S * S; i++) { var l = 0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2]; L[i] = l; hist[l | 0]++; }
    // niveaux automatiques : on étire entre 2 % et 98 % des luminosités
    var lo = 0, hi = 255, acc = 0;
    for (v = 0; v < 256; v++) { acc += hist[v]; if (acc > S * S * 0.02) { lo = v; break; } }
    acc = 0; for (v = 255; v >= 0; v--) { acc += hist[v]; if (acc > S * S * 0.02) { hi = v; break; } }
    // la luminosité médiane tombe sur le rouge moyen : une photo claire reste rouge
    var half = 0, med = 128;
    for (v = 0; v < 256; v++) { half += hist[v]; if (half >= S * S / 2) { med = v; break; } }
    var mid = Math.min(0.95, Math.max(0.05, (med - lo) / Math.max(1, hi - lo)));
    var gamma = Math.min(3, Math.max(0.6, Math.log(0.5) / Math.log(mid)));
    // image surtout claire (logo sur fond uni, ciel…) : le fond devient rouge vif au lieu de rose pâle
    var top = !opt.photo ? 0.96 : mid > 0.8 ? 0.72 : 0.86;
    var seed = seed0, rnd = function () { return (seed = (seed * 9301 + 49297) % 233280) / 233280; };
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      i = y * S + x;
      var t = Math.min(1, Math.max(0, (L[i] - lo) / Math.max(1, hi - lo) + bri));
      t = Math.pow(t, gamma) * top;
      t = t + (t - 0.5) * con * 1.6 * (1 - Math.abs(t - 0.5) * 2) * 2;   // courbe en S
      t = Math.min(1, Math.max(0, t + (rnd() - 0.5) * 0.05));          // grain
      var col = ramp(t), k = y % 3 === 0 ? 0.72 : 1;                    // lignes de balayage
      var vx = (x - S / 2) / (S / 2), vy = (y - S / 2) / (S / 2), vig = 1 - Math.max(0, Math.hypot(vx, vy) - 0.75) * 0.9;
      p[i * 4] = col[0] * k * vig; p[i * 4 + 1] = col[1] * k * vig; p[i * 4 + 2] = col[2] * k * vig; p[i * 4 + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    seed = seed0 * 3;
    for (var n = 0; n < gl; n++) {   // tranches décalées
      var yy = 30 + rnd() * (S - 60), hh = 3 + rnd() * 7, dx = (rnd() < 0.5 ? -1 : 1) * (4 + rnd() * 8);
      g.drawImage(c, 0, yy, S, hh, dx, yy, S, hh);
    }
    // cadre : coins en équerre et petite ligne d'identifiant
    g.strokeStyle = 'rgba(255,170,160,.85)'; g.lineWidth = 3;
    var m = 12, L2 = 26;
    [[m, m, 1, 1], [S - m, m, -1, 1], [m, S - m, 1, -1], [S - m, S - m, -1, -1]].forEach(function (q) {
      g.beginPath(); g.moveTo(q[0], q[1] + q[3] * L2); g.lineTo(q[0], q[1]); g.lineTo(q[0] + q[2] * L2, q[1]); g.stroke();
    });
    g.fillStyle = 'rgba(255,190,180,.8)'; g.font = '11px "Share Tech Mono", monospace';
    g.fillText('ID ' + (opt.id || '0x' + seed0.toString(16).toUpperCase()) + ' // CAPRI.NET', m + 6, S - m - 8);
    return c;
  }

  // ---------- avatars Capri (dessins originaux, traits blancs) ----------
  var P = 'fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"';
  var ICONS = {
    'ÉCLAIR': '<path d="M140 30 80 140h44l-20 86 76-122h-46z" fill="#fff"/>',
    'CHAT': '<path ' + P + ' d="M64 92 70 44l36 30h44l36-30 6 48c10 18 12 40 2 62-14 32-46 48-66 48s-52-16-66-48c-10-22-8-44 2-62z"/><circle cx="104" cy="126" r="9" fill="#fff"/><circle cx="152" cy="126" r="9" fill="#fff"/><path ' + P + ' d="M120 152h16l-8 8zM60 150h30M60 168h30M166 150h30M166 168h30"/>',
    'RENARD': '<path ' + P + ' d="M50 52l42 34h72l42-34-10 74-68 82-68-82z"/><path ' + P + ' d="M92 86l36 40 36-40M128 208v-40"/><circle cx="104" cy="124" r="7" fill="#fff"/><circle cx="152" cy="124" r="7" fill="#fff"/>',
    'ROBOT': '<rect ' + P + ' x="62" y="78" width="132" height="104" rx="14"/><path ' + P + ' d="M128 78V48"/><circle cx="128" cy="40" r="10" fill="#fff"/><rect x="88" y="110" width="26" height="22" fill="#fff"/><rect x="142" y="110" width="26" height="22" fill="#fff"/><path ' + P + ' d="M96 156h64M62 128H42M194 128h20"/>',
    'FANTÔME': '<path ' + P + ' d="M68 206V116a60 60 0 0 1 120 0v90l-20-16-20 16-20-16-20 16-20-16z"/><circle cx="106" cy="120" r="11" fill="#fff"/><circle cx="150" cy="120" r="11" fill="#fff"/>',
    'COURONNE': '<path ' + P + ' d="M52 184 40 84l48 40 40-64 40 64 48-40-12 100z"/><path ' + P + ' d="M56 210h144"/><circle cx="128" cy="150" r="10" fill="#fff"/>',
    'FLAMME': '<path ' + P + ' d="M128 30c20 40 64 60 64 112a64 64 0 0 1-128 0c0-30 18-46 30-62 2 22 12 32 22 36-6-34 2-60 12-86z"/><path ' + P + ' d="M128 210a26 26 0 0 1-26-26c0-18 14-24 22-40 10 18 30 24 30 40a26 26 0 0 1-26 26z"/>',
    'CŒUR': '<path fill="#fff" d="M72 64h32v16h16v16h16V80h16V64h32v16h16v48h-16v16h-16v16h-16v16h-16v16h-16v-16h-16v-16H88v-16H72v-16H56V80h16z"/>',
    'CASQUE': '<path ' + P + ' d="M56 150v-20a72 72 0 0 1 144 0v20"/><rect ' + P + ' x="42" y="146" width="40" height="62" rx="10"/><rect ' + P + ' x="174" y="146" width="40" height="62" rx="10"/>',
    'PLANÈTE': '<circle ' + P + ' cx="128" cy="128" r="56"/><path ' + P + ' d="M40 160c-20 30 70 10 130-26s96-68 64-74"/>',
    'DÉ': '<path ' + P + ' d="M128 36l78 42v100l-78 42-78-42V78z"/><path ' + P + ' d="M50 78l78 42 78-42M128 120v100"/><circle cx="128" cy="78" r="9" fill="#fff"/><circle cx="88" cy="140" r="8" fill="#fff"/><circle cx="104" cy="172" r="8" fill="#fff"/><circle cx="168" cy="140" r="8" fill="#fff"/><circle cx="152" cy="172" r="8" fill="#fff"/>',
    'MANETTE': '<path ' + P + ' d="M70 92h116c22 0 34 20 38 52 4 36-8 52-22 52-16 0-24-26-40-26H94c-16 0-24 26-40 26-14 0-26-16-22-52 4-32 16-52 38-52z"/><path ' + P + ' d="M86 124v28M72 138h28"/><circle cx="164" cy="128" r="8" fill="#fff"/><circle cx="184" cy="148" r="8" fill="#fff"/>'
  };
  var NAMES = Object.keys(ICONS);
  function iconImage(name) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">' +
      '<defs><radialGradient id="g" cx="50%" cy="45%" r="65%"><stop offset="0" stop-color="#7a7a7a"/><stop offset="1" stop-color="#1a1a1a"/></radialGradient></defs>' +
      '<rect width="256" height="256" fill="url(#g)"/><g transform="translate(128 128) scale(.78) translate(-128 -128)">' + ICONS[name] + '</g></svg>';
    return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  }
  function preset(name) {
    var k = NAMES.indexOf(name);
    return iconImage(name).then(function (img) { return holo(img, { con: 30, glitch: 1, seed: 11 + k * 17, id: '0x' + (0xA0 + k).toString(16).toUpperCase() + 'C' }); });
  }
  function jpeg(canvas, size, q) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    c.getContext('2d').drawImage(canvas, 0, 0, size, size);
    return c.toDataURL('image/jpeg', q);
  }
  function save(canvas, kind, name) {
    data.avatar = { kind: kind, name: name || '', img: jpeg(canvas, 128, 0.85), small: jpeg(canvas, 96, 0.72), v: Date.now() };
    C.save();
    if (C.phone && C.phone.avatarChanged) C.phone.avatarChanged();
  }

  // ---------- fenêtre de choix ----------
  function pick(done) {
    var w = el('div', 'avp', '<div class="avp-frame"><div class="avp-head"><span>PHOTO DE PROFIL</span><button type="button" class="key avp-x" aria-label="Fermer">✕</button></div>' +
      '<div class="avp-hero"><canvas width="256" height="256"></canvas><div><b></b><span class="mono"></span></div></div>' +
      '<nav class="avp-tabs"><button type="button" data-p="presets" class="on">AVATARS CAPRI</button><button type="button" data-p="photo">MA GALERIE</button></nav>' +
      '<div class="avp-body"><div class="avp-grid" data-p="presets"></div>' +
      '<div class="avp-photo" data-p="photo" hidden><label class="avp-pick">CHOISIR UNE PHOTO<small>Elle est recadrée en carré puis passée en rouge et blanc.</small><input type="file" accept="image/*"></label>' +
      '<div class="avp-sl"><span>Luminosité</span><input type="range" data-k="bri" min="-40" max="40" value="0"><span>Contraste</span><input type="range" data-k="con" min="0" max="80" value="35"><span>Glitch</span><input type="range" data-k="gli" min="0" max="3" value="1"></div></div></div>' +
      '<div class="avp-acts"><button type="button" class="btn avp-no">ANNULER</button><button type="button" class="avp-ok" disabled>APPLIQUER</button></div></div>');
    document.body.appendChild(w);
    var hero = w.querySelector('.avp-hero canvas'), label = w.querySelector('.avp-hero span'), ok = w.querySelector('.avp-ok');
    w.querySelector('.avp-hero b').textContent = (data.userName || 'MOI').toUpperCase();
    var chosen = null, photo = null;   // chosen = { canvas, kind, name }
    function show(c, kind, name, text) {
      chosen = { canvas: c, kind: kind, name: name };
      hero.getContext('2d').drawImage(c, 0, 0, S, S); label.textContent = text; ok.disabled = false;
    }
    if (data.avatar && data.avatar.img) {
      var cur = new Image(); cur.onload = function () { hero.getContext('2d').drawImage(cur, 0, 0, S, S); }; cur.src = data.avatar.img;
      label.textContent = 'PHOTO ACTUELLE';
    } else label.textContent = 'AUCUNE PHOTO';
    var grid = w.querySelector('.avp-grid');
    NAMES.forEach(function (name) {
      preset(name).then(function (c) {
        c.title = name; grid.appendChild(c);
        if (data.avatar && data.avatar.kind === 'preset' && data.avatar.name === name) c.classList.add('on');
        c.addEventListener('click', function () {
          grid.querySelectorAll('canvas').forEach(function (x) { x.classList.toggle('on', x === c); });
          show(c, 'preset', name, 'AVATAR CAPRI · ' + name);
        });
      });
    });
    var sl = {};
    w.querySelectorAll('.avp-sl input').forEach(function (i) { sl[i.dataset.k] = i; i.addEventListener('input', redo); });
    function redo() { if (photo) show(holo(photo, { bri: +sl.bri.value, con: +sl.con.value, glitch: +sl.gli.value, seed: 23, photo: true }), 'photo', '', 'MA PHOTO · ROUGE ET BLANC'); }
    w.querySelector('input[type=file]').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var i = new Image(); i.onload = function () { photo = i; redo(); URL.revokeObjectURL(i.src); }; i.src = URL.createObjectURL(f);
    });
    w.querySelectorAll('.avp-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        w.querySelectorAll('.avp-tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
        w.querySelectorAll('.avp-body [data-p]').forEach(function (x) { x.hidden = x.dataset.p !== b.dataset.p; });
      });
    });
    function close() { w.remove(); }
    w.querySelector('.avp-x').addEventListener('click', close);
    w.querySelector('.avp-no').addEventListener('click', close);
    ok.addEventListener('click', function () {
      if (!chosen) return;
      save(chosen.canvas, chosen.kind, chosen.name);
      close();
      if (done) done();
    });
    C.avatar.open = w;   // pour les tests
    C.avatar.setPhoto = function (img) { photo = img; w.querySelector('.avp-tabs button[data-p=photo]').click(); redo(); };
  }

  // une image reçue d'un ami n'est acceptée que si c'est une petite image encodée (rien d'autre ne peut être injecté)
  function valid(src) { return typeof src === 'string' && src.length < 24000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(src); }

  C.avatar = { pick: pick, holo: holo, presets: NAMES, valid: valid };
})();
