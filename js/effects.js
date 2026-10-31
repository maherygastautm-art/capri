// Effets plein écran : lancement, apparition buggée, Breach Protocol, ERROR, néons, pluie, succès, garde
var C = window.C || (window.C = {});

(function () {
  var fx = function () { return document.getElementById('fx'); };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  C.el = el;

  // boucle d'animation simple : fn(t) retourne true pour s'arrêter
  function loop(fn) {
    var t0 = performance.now(), stop = false;
    function f(now) { if (stop) return; if (fn((now - t0) / 1000) === true) return; requestAnimationFrame(f); }
    requestAnimationFrame(f);
    return function () { stop = true; };
  }
  C.loop = loop;

  // canvas plein écran avec densité de pixels
  function fullCanvas(z) {
    var c = el('canvas', 'fx-canvas');
    if (z) c.style.zIndex = z;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    var ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    document.body.appendChild(c);
    return { c: c, ctx: ctx, w: innerWidth, h: innerHeight };
  }

  // ---------- écran de lancement CAPRI.EXE ----------
  var STEPS = ['INIT NEURAL LINK', 'LOADING SPRITES', 'SYNC VOICE MODULE', 'CONNECTING NIGHT CITY', 'BREACH PROTOCOL', 'CAPRI ONLINE'];
  var CURVE = [0, 0, 0.5, 0.18, 0.8, 0.22, 1.4, 0.58, 1.7, 0.61, 2.3, 0.9, 2.6, 0.97, 2.85, 1];
  function progress(t) {
    for (var i = 0; i + 3 < CURVE.length; i += 2)
      if (t < CURVE[i + 2]) return CURVE[i + 1] + (CURVE[i + 3] - CURVE[i + 1]) * (t - CURVE[i]) / (CURVE[i + 2] - CURVE[i]);
    return 1;
  }

  // done() est appelé après le toucher de l'utilisateur (nécessaire sur iPhone pour le son)
  C.boot = function (version, done) {
    var b = el('div', '', '<div class="bp"><div class="t"><span class="ga">CAPRI.EXE</span><span class="gb">CAPRI.EXE</span><span class="m">CAPRI.EXE</span>&nbsp;</div>' +
      '<div class="sub">NEURAL COMPANION // v' + version + ' // NAVI-ARASAKA</div>' +
      '<div class="lrow"><div class="ld">L O A D I N G</div><div class="pc">000</div></div>' +
      '<div class="barw"><div class="fill"></div><div class="head"></div></div><div class="blocks"></div>' +
      '<div class="st"><span class="a"></span><span class="b"></span></div></div><div class="tap hidden">TOUCHE POUR TE CONNECTER</div>');
    b.id = 'boot';
    document.body.appendChild(b);
    var bp = b.querySelector('.bp'), ga = b.querySelector('.ga'), gb = b.querySelector('.gb'), m = b.querySelector('.m');
    var pc = b.querySelector('.pc'), fill = b.querySelector('.fill'), head = b.querySelector('.head'), blocks = b.querySelector('.blocks');
    var sa = b.querySelector('.st .a'), sb = b.querySelector('.st .b'), tap = b.querySelector('.tap');
    var n = 30;
    for (var i = 0; i < n; i++) blocks.appendChild(el('i'));
    var bars = [];
    for (i = 0; i < 3; i++) { var nb = el('div', 'noise'); bp.appendChild(nb); bars.push(nb); }
    var ready = false, ending = -1;
    b.addEventListener('click', function () { if (ready && ending < 0) ending = 0; });
    loop(function (t) {
      if (ending >= 0) {
        if (ending === 0) ending = t;
        var u = (t - ending) / 0.4;
        if (u >= 1) { b.remove(); done(); return true; }
        bp.style.transform = u < 0.6 ? 'scale(' + (1 + u * 0.1) + ',' + Math.max(0.015, 1 - u / 0.6) + ')' : 'scale(' + Math.max(0, 1.06 * (1 - (u - 0.6) / 0.4)) + ',0.015)';
        tap.style.opacity = 0;
        return;
      }
      var p = progress(t), w = bp.querySelector('.barw').clientWidth - 4;
      pc.textContent = ('00' + Math.round(p * 100)).slice(-3);
      fill.style.width = (w * p) + 'px';
      head.style.left = (2 + w * p - 1.5) + 'px';
      var kids = blocks.children;
      for (var k = 0; k < n; k++) kids[k].className = k < p * n ? 'on' : '';
      var step = STEPS[Math.min(STEPS.length - 1, Math.floor(p * (STEPS.length - 1) + 0.0001))];
      sa.textContent = '> ' + step + (p < 1 ? '...' : '') + (Math.floor(t * 4) % 2 === 0 ? '_' : ' ');
      if (Math.random() < 0.4) sb.textContent = '0x' + Math.floor(rnd(0x10000000, 0x7fffffff)).toString(16).toUpperCase() + '  MEM ' + Math.floor(rnd(400, 999)) + 'K';
      var g = t < 0.25 || Math.random() < 0.07;
      ga.style.visibility = gb.style.visibility = g ? 'visible' : 'hidden';
      if (g) {
        ga.style.left = (-3 - Math.random() * 5) + 'px';
        gb.style.left = (3 + Math.random() * 5) + 'px';
        bp.style.transform = 'translateX(' + Math.round(rnd(-3, 3)) + 'px)';
        m.style.opacity = t < 0.25 && Math.random() < 0.5 ? 0.2 : 1;
      } else { bp.style.transform = ''; m.style.opacity = 1; }
      bars.forEach(function (r) {
        var on = g && Math.random() < 0.6;
        r.style.display = on ? 'block' : 'none';
        if (!on) return;
        r.style.width = rnd(40, 260) + 'px'; r.style.height = rnd(1, 6) + 'px';
        r.style.background = Math.random() < 0.33 ? '#5EF6FF' : '#FF5E57';
        r.style.left = rnd(0, bp.clientWidth - 40) + 'px'; r.style.top = rnd(0, 230) + 'px';
      });
      if (t > 3 && !ready) { ready = true; tap.classList.remove('hidden'); }
      if (ready) tap.style.opacity = 0.5 + 0.5 * Math.sin(t * 5);
    });
  };

  // ---------- apparition buggée (gros plan + clin d'œil) ----------
  var IN = 0.55, WINK0 = 1.45, WINK1 = 1.95, OUT = 2.75, TOTAL = 3.3;
  var portraits = null;
  function renderPortrait(wink, tint) {
    var px = 800, c = document.createElement('canvas');
    c.width = c.height = px;
    var ctx = c.getContext('2d');
    ctx.scale(px / 400, px / 400);
    C.drawPortrait(ctx, wink, tint);
    return c;
  }
  C.glitchPlaying = false;
  C.glitch = function (caption, done) {
    if (C.glitchPlaying) return;
    C.glitchPlaying = true;
    if (!portraits) portraits = { open: renderPortrait(false), wink: renderPortrait(true), ga: renderPortrait(false, '#3CF06E'), gb: renderPortrait(false, '#5EF6FF') };
    var f = fullCanvas(90), ctx = f.ctx, W = f.w, H = f.h, size = Math.min(H * 0.8, W * 0.95);
    C.stage.hidden = true;
    var scan = ctx.createPattern((function () { var p = document.createElement('canvas'); p.width = 4; p.height = 4; var x = p.getContext('2d'); x.fillStyle = 'rgba(0,0,0,1)'; x.fillRect(0, 0, 4, 1.5); return p; })(), 'repeat');
    loop(function (t) {
      ctx.clearRect(0, 0, W, H);
      if (t >= TOTAL) { f.c.remove(); C.glitchPlaying = false; C.stage.hidden = false; if (done) done(); return true; }
      var calm = t >= IN && t < OUT;
      var heavy = t < IN ? 1 - t / IN * 0.6 : calm ? 0 : 0.4 + 0.6 * (t - OUT) / (TOTAL - OUT);
      var z = calm ? 0.94 + 0.06 * (t - IN) / (OUT - IN) : 0.94, s = size * z;
      var x = (W - s) / 2, y = (H - s) / 2;
      var src = t >= WINK0 && t < WINK1 ? portraits.wink : portraits.open;
      ctx.fillStyle = 'rgba(0,0,0,' + (calm ? 0.3 : Math.random() * 0.5) + ')';
      ctx.fillRect(0, 0, W, H);
      function slices(count, off) {
        for (var i = 0; i < count; i++) {
          var top = Math.random() * s, h = 4 + Math.random() * s * 0.08;
          var img = Math.random() < 0.25 ? (Math.random() < 0.5 ? portraits.ga : portraits.gb) : src;
          var sy = top / s * img.height, sh = h / s * img.height;
          ctx.drawImage(img, 0, sy, img.width, sh, x + (Math.random() - 0.5) * 2 * off, y + top, s, h);
        }
      }
      if (calm) {
        if (Math.random() < 0.12) {
          ctx.globalAlpha = 0.7;
          ctx.drawImage(portraits.ga, x - 6 - Math.random() * 8, y, s, s);
          ctx.drawImage(portraits.gb, x + 6 + Math.random() * 8, y, s, s);
          ctx.globalAlpha = 1;
        }
        ctx.drawImage(src, x, y, s, s);
        if (Math.random() < 0.1) slices(1 + Math.floor(Math.random() * 2), 30);
        if (Math.random() > 0.08) {
          ctx.fillStyle = '#FF5E57';
          ctx.font = '14px "Share Tech Mono", monospace';
          ctx.fillText(caption || '> capri.exe  //  SIGNAL HIJACKED', x + s * 0.08, y + s * 0.95);
        }
      } else {
        var off = 20 + heavy * 120;
        ctx.globalAlpha = 0.7;
        ctx.drawImage(portraits.ga, x - off * 0.3 * Math.random() - 4, y + (Math.random() - 0.5) * 8, s, s);
        ctx.drawImage(portraits.gb, x + off * 0.3 * Math.random() + 4, y + (Math.random() - 0.5) * 8, s, s);
        ctx.globalAlpha = 1;
        if (t > TOTAL - 0.2) {
          var u = (t - (TOTAL - 0.2)) / 0.2;
          ctx.save();
          ctx.translate(x + s / 2, y + s / 2);
          ctx.scale(1 + u * 0.2, Math.max(0.02, 1 - u));
          ctx.drawImage(src, -s / 2, -s / 2, s, s);
          ctx.restore();
        } else {
          if (Math.random() < 1 - heavy * 0.6) ctx.drawImage(src, x + (Math.random() - 0.5) * heavy * 30, y, s, s);
          slices(5 + Math.floor(Math.random() * 9), off);
        }
        var cols = ['#FF5E57', '#3CF06E', '#FFFFFF', '#000000', '#7B2CF0'];
        var bars = 3 + Math.floor(Math.random() * 8);
        for (var i = 0; i < bars; i++) {
          var bw = W * rnd(0.3, 1);
          ctx.globalAlpha = rnd(0.25, 0.75);
          ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)];
          ctx.fillRect(Math.random() * (W - bw), Math.random() * H, bw, rnd(2, 30));
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = scan;
      ctx.globalAlpha = calm ? 0.16 : 0.3;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    });
  };

  // ---------- Breach Protocol (résolu automatiquement) ----------
  var CODES = ['1C', '55', 'BD', 'E9', '7A', 'FF'];
  C.CODES = CODES;
  C.breachActive = false;
  C.breach = function (done) {
    if (C.breachActive) return;
    C.breachActive = true;
    var START = 0.6, STEP = 0.55, GRANT = START + STEP * 4, DUR = GRANT + 1.3, OUT2 = 0.35;
    var pr = [0], pc = [Math.floor(Math.random() * 5)];
    pr[1] = 1 + Math.floor(Math.random() * 4); pc[1] = pc[0];
    pr[2] = pr[1]; pc[2] = (pc[1] + 1 + Math.floor(Math.random() * 4)) % 5;
    pr[3] = (pr[2] + 1 + Math.floor(Math.random() * 4)) % 5; pc[3] = pc[2];
    var seq = [0, 1, 2, 3].map(function () { return CODES[Math.floor(Math.random() * 6)]; });
    var w = el('div', 'breach', '<div class="bp"><h2>BREACH PROTOCOL</h2><div class="s1">RECONNEXION À LA SESSION // ICE ACTIF</div>' +
      '<div class="tl">TEMPS RESTANT<b>5.00</b></div><div class="body"><div><div class="g-lab">MATRICE DE CODE</div><div class="grid"><div class="band"></div><div class="cur"></div></div></div>' +
      '<div class="g-side"><div class="g-lab">BUFFER</div><div class="g-buf"></div><div class="g-lab">SÉQUENCE REQUISE</div><div class="g-seq"></div><div class="g-status"></div></div></div>' +
      '<div class="banner hidden"><b>ACCÈS AUTORISÉ</b><span>re-bienvenue, choom.</span></div></div>');
    document.body.appendChild(w);
    var grid = w.querySelector('.grid'), band = w.querySelector('.band'), cur = w.querySelector('.cur'), cells = [];
    for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) {
      var code = CODES[Math.floor(Math.random() * 6)];
      for (var i = 0; i < 4; i++) if (pr[i] === r && pc[i] === c) code = seq[i];
      var d = el('div', '', code);
      grid.appendChild(d);
      cells.push(d);
    }
    var buf = w.querySelector('.g-buf'), sq = w.querySelector('.g-seq');
    for (i = 0; i < 6; i++) buf.appendChild(el('span'));
    seq.forEach(function (s) { sq.appendChild(el('span', '', s)); });
    var tl = w.querySelector('.tl b'), status = w.querySelector('.g-status'), banner = w.querySelector('.banner'), bp = w.querySelector('.bp');
    var picked = 0, skip = false, jump = 0;
    w.addEventListener('click', function () { skip = true; });
    var CW = 40, CH = 34, GX = 6, GY = 6;
    loop(function (t) {
      if (skip && !jump && t < DUR) jump = DUR - t;   // un toucher passe directement à la fermeture
      t += jump;
      bp.style.opacity = t < 0.35 && Math.random() < 0.5 ? 0.25 : 1;
      tl.textContent = Math.max(0, 5 - Math.min(t, GRANT)).toFixed(2);
      var step = Math.floor((t - START) / STEP);
      while (picked < 4 && picked < step) {
        var cell = cells[pr[picked] * 5 + pc[picked]];
        cell.textContent = '[ ]'; cell.style.color = '#8A3633';
        buf.children[picked].textContent = seq[picked];
        sq.children[picked].className = 'ok';
        picked++;
      }
      if (step >= 0 && step < 4) {
        var row = step % 2 === 0;
        band.style.display = cur.style.display = 'block';
        if (row) { band.style.cssText = 'left:' + GX + 'px;top:' + (GY + pr[step] * CH) + 'px;width:' + CW * 5 + 'px;height:' + CH + 'px'; }
        else { band.style.cssText = 'left:' + (GX + pc[step] * CW) + 'px;top:' + GY + 'px;width:' + CW + 'px;height:' + CH * 5 + 'px'; }
        var from = row ? (step === 0 ? 0 : pc[step - 1]) : (step === 1 ? 0 : pr[step - 1]), to = row ? pc[step] : pr[step];
        var moved = Math.min(Math.abs(to - from), Math.floor((t - START - step * STEP) / 0.09)), at = from + Math.sign(to - from) * moved;
        var cr = row ? pr[step] : at, cc = row ? at : pc[step];
        cur.style.cssText = 'display:block;left:' + (GX + cc * CW + 2) + 'px;top:' + (GY + cr * CH + 3) + 'px;width:' + (CW - 4) + 'px;height:' + (CH - 6) + 'px';
        status.textContent = '> injection ' + (step + 1) + '/4' + (Math.floor(t * 4) % 2 === 0 ? '_' : '');
      } else if (step >= 4) {
        band.style.display = cur.style.display = 'none';
        status.textContent = '> ICE neutralisé'; status.style.color = '#5EF6FF';
        banner.classList.remove('hidden');
        banner.style.opacity = Math.random() < 0.08 ? 0.4 : 1;
      }
      if (t > DUR) {
        var u = (t - DUR) / OUT2;
        if (u >= 1) { w.remove(); C.breachActive = false; if (done) done(); return true; }
        bp.style.transform = 'scale(' + (u < 0.6 ? 1 : Math.max(0, 1 - (u - 0.6) / 0.4)) + ',' + Math.max(0.015, 1 - u * 1.6) + ')';
      }
    });
  };

  // ---------- écran ERROR buggé (dans le panneau de discussion) ----------
  var HAND = '<svg width="58" height="58" viewBox="10 10 84 84"><polygon points="52,14 92,86 12,86" fill="#6B5A12" stroke="#A8901C" stroke-width="3" stroke-linejoin="round"/>' +
    '<g fill="#151012"><rect x="42" y="57" width="21" height="21" rx="5"/><rect x="42" y="47" width="4.6" height="20" rx="2.3"/><rect x="47.5" y="43" width="4.6" height="20" rx="2.3"/>' +
    '<rect x="53" y="44" width="4.6" height="20" rx="2.3"/><rect x="58.5" y="49" width="4.6" height="20" rx="2.3"/><rect x="34" y="62" width="12" height="5" rx="2.5" transform="rotate(-35 40 64)"/></g></svg>';
  function errBox() { return '<div class="err-box"><div class="err-icon">' + HAND + '</div><div class="err-word">ERROR</div></div>'; }
  C.showError = function () {
    var host = document.getElementById('errorFx');
    if (!host || document.getElementById('panel').classList.contains('closed')) return;
    host.innerHTML = '<div class="err-wrap"><div class="err-ghost a">' + errBox() + '</div><div class="err-ghost b">' + errBox() + '</div>' +
      '<div class="err-main">' + errBox() + '</div><div class="err-marks" style="top:-22px"><span>56 34</span><span>65 45</span><span>56 34</span><span>65 45</span></div>' +
      '<div class="err-marks" style="top:82px"><span>56 34</span><span>65 45</span><span>56 34</span><span>65 45</span></div><div class="err-sub">COMMANDE INCONNUE</div></div>';
    host.classList.remove('hidden');
    var wrap = host.querySelector('.err-wrap'), ga = host.querySelector('.err-ghost.a'), gb = host.querySelector('.err-ghost.b'), main = host.querySelector('.err-main');
    main.style.position = 'absolute'; main.style.inset = '0';
    var noise = [];
    for (var i = 0; i < 5; i++) { var n = el('div', 'err-noise'); host.appendChild(n); noise.push(n); }
    loop(function (t) {
      if (t >= 1.75) { host.classList.add('hidden'); host.innerHTML = ''; return true; }
      var entering = t < 0.3, leaving = t > 1.35, glitch = entering || leaving || Math.random() < 0.12;
      host.style.opacity = entering && Math.random() < 0.45 ? 0.15 : 1;
      var amp = entering || leaving ? 22 : 9;
      main.style.transform = glitch && Math.random() < 0.6 ? 'translateX(' + rnd(-amp, amp) + 'px)' : '';
      main.style.clipPath = glitch && Math.random() < 0.5 ? 'inset(' + rnd(0, 40) + '% 0 ' + rnd(0, 40) + '% 0)' : '';
      var g = glitch ? rnd(4, 9) : 2.5;
      ga.style.transform = 'translate(' + (-g) + 'px,' + (glitch ? rnd(-2, 2) : 0) + 'px)';
      gb.style.transform = 'translate(' + g + 'px,' + (glitch ? rnd(-2, 2) : 0) + 'px)';
      ga.style.opacity = gb.style.opacity = glitch || Math.random() < 0.7 ? 0.65 : 0;
      if (leaving) {
        var u = (t - 1.35) / 0.4;
        wrap.style.transform = 'scale(' + (u < 0.6 ? 1 : Math.max(0, 1 - (u - 0.6) / 0.4)) + ',' + Math.max(0.02, 1 - u * 1.4) + ')';
      } else wrap.style.transform = '';
      noise.forEach(function (nb) {
        var on = glitch ? Math.random() < 0.6 : Math.random() < 0.05;
        nb.style.display = on ? 'block' : 'none';
        if (!on) return;
        nb.style.width = rnd(40, 200) + 'px'; nb.style.height = rnd(2, 9) + 'px';
        nb.style.left = rnd(0, host.clientWidth - 60) + 'px'; nb.style.top = rnd(10, host.clientHeight - 20) + 'px';
        nb.style.background = Math.random() < 0.5 ? '#fff' : '#FF5E57'; nb.style.opacity = rnd(0.25, 0.75);
      });
    });
  };

  // ---------- succès ----------
  var achQueue = [], achBusy = false;
  C.achPopup = function (name, desc) {
    achQueue.push([name, desc]);
    if (!achBusy) nextAch();
  };
  function nextAch() {
    var a = achQueue.shift();
    if (!a) { achBusy = false; return; }
    achBusy = true;
    var p = el('div', 'ach', '<div class="hex">✦</div><div><div class="k">SUCCÈS DÉBLOQUÉ</div><div class="n"></div><div class="d"></div></div>');
    p.querySelector('.n').textContent = a[0].toUpperCase();
    p.querySelector('.d').textContent = a[1];
    document.body.appendChild(p);
    requestAnimationFrame(function () { requestAnimationFrame(function () { p.classList.add('in'); }); });
    loop(function (t) {
      p.style.opacity = t < 0.5 && Math.random() < 0.35 ? 0.3 : (Math.random() < 0.02 ? 0.6 : 1);
      if (t > 5) p.classList.remove('in');
      if (t > 5.4) { p.remove(); nextAch(); return true; }
    });
  }

  // ---------- mode fête : néons et projecteurs ----------
  var NCOLS = [[255, 30, 120], [40, 240, 255], [180, 90, 255], [255, 230, 40]];
  C.neon = function () {
    var f = fullCanvas(54), ctx = f.ctx, W = f.w, H = f.h;
    var strips = [];
    for (var i = 0; i < 6; i++) strips.push({ x: 0, y: 0, w: 0, c: 0 });
    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
    function edge(x0, y0, x1, y1, x, y, w, h, c, k) {
      var g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, rgba(c, 0.9 * k)); g.addColorStop(0.12, rgba(c, 0.35 * k)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    }
    return {
      frame: function (t, pulse, hue, fade) {
        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = fade;
        var k = 0.35 + pulse * 0.65, e = 60;
        edge(0, 0, 0, e, 0, 0, W, e, NCOLS[hue], k);
        edge(0, H, 0, H - e, 0, H - e, W, e, NCOLS[(hue + 1) % 4], k);
        edge(0, 0, e, 0, 0, 0, e, H, NCOLS[(hue + 2) % 4], k * 0.8);
        edge(W, 0, W - e, 0, W - e, 0, e, H, NCOLS[(hue + 3) % 4], k * 0.8);
        ctx.fillStyle = rgba(NCOLS[hue], pulse * 0.11);
        ctx.fillRect(0, 0, W, H);
        for (var i = 0; i < 3; i++) {
          var ox = W * (0.18 + i * 0.32), ang = Math.sin(t * (0.7 + i * 0.13) + i * 1.7) * 0.55, L = H * 1.1, half = 0.08, c = NCOLS[(hue + i) % 4];
          var g = ctx.createLinearGradient(ox, H, ox, 0);
          g.addColorStop(0, rgba(c, (70 + 60 * pulse) / 255)); g.addColorStop(1, rgba(c, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(ox, H);
          ctx.lineTo(ox + Math.sin(ang - half) * L, H - Math.cos(ang - half) * L);
          ctx.lineTo(ox + Math.sin(ang + half) * L, H - Math.cos(ang + half) * L);
          ctx.fill();
        }
        strips.forEach(function (s) {
          if (pulse > 0.9 || Math.random() < 0.02) { s.w = W * rnd(0.1, 0.4); s.x = Math.random() * (W - s.w); s.y = Math.random() * H; s.c = Math.floor(Math.random() * 4); }
          ctx.fillStyle = rgba(NCOLS[s.c], pulse * 0.8);
          ctx.fillRect(s.x, s.y, s.w, 3);
        });
        ctx.globalAlpha = 1;
      },
      remove: function () { f.c.remove(); }
    };
  };

  // ---------- pluie / neige / orage de néons ----------
  C.rainActive = false;
  C.rain = function (sky, seconds) {
    if (C.rainActive) return;
    C.rainActive = true;
    var f = fullCanvas(56), ctx = f.ctx, W = f.w, H = f.h, snow = sky === 'snow', storm = sky === 'storm';
    var cols = ['255,40,140', '60,230,255', '170,100,255', '255,90,90'];
    var drops = [], splashes = [], n = snow ? 90 : sky === 'drizzle' ? 60 : 120;
    function reset(d, anywhere) {
      d.x = Math.random() * (W + 100) - 50;
      d.y = anywhere ? Math.random() * H : -Math.random() * 200 - 60;
      d.v = snow ? rnd(40, 100) : rnd(700, 1300);
      d.l = snow ? 3 : rnd(20, 50);
      d.c = cols[Math.floor(Math.random() * cols.length)];
    }
    for (var i = 0; i < n; i++) { var d = {}; reset(d, true); drops.push(d); }
    var last = 0, strikeT = -10, nextStrike = 2, bolt = null;
    loop(function (t) {
      var dt = Math.min(0.05, t - last); last = t;
      if (t >= seconds) { f.c.remove(); C.rainActive = false; return true; }
      var fade = Math.max(0, Math.min(1, t / 2, (seconds - t) / 2));
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = fade;
      drops.forEach(function (d) {
        d.y += d.v * dt;
        d.x += (snow ? Math.sin(t * 1.3 + d.v) * 25 : d.v * 0.08) * dt;
        if (d.y > H) { if (!snow && Math.random() < 0.3) splashes.push({ x: d.x, t: t, c: d.c }); reset(d, false); }
        if (snow) {
          ctx.fillStyle = 'rgba(' + d.c + ',0.9)';
          ctx.beginPath(); ctx.arc(d.x, d.y, 2, 0, Math.PI * 2); ctx.fill();
        } else {
          var g = ctx.createLinearGradient(d.x, d.y - d.l, d.x, d.y);
          g.addColorStop(0, 'rgba(' + d.c + ',0)'); g.addColorStop(1, 'rgba(' + d.c + ',0.9)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(d.x - d.l * 0.08, d.y - d.l); ctx.lineTo(d.x, d.y); ctx.stroke();
        }
      });
      splashes = splashes.filter(function (s) {
        var age = t - s.t;
        if (age > 0.35) return false;
        ctx.strokeStyle = 'rgba(' + s.c + ',' + (1 - age / 0.35) + ')'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(s.x, H - 4, 3 + age * 30, 1.5, 0, 0, Math.PI * 2); ctx.stroke();
        return true;
      });
      if (storm) {
        if (t > nextStrike) {
          nextStrike = t + rnd(3, 8); strikeT = t; bolt = [];
          var x = W * rnd(0.15, 0.85), y = 0;
          while (y < H * 0.7) { bolt.push([x, y]); x += rnd(-35, 35); y += rnd(30, 70); }
        }
        var age = t - strikeT;
        if (age < 0.12) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, 0, W, H); }
        if (bolt && age < 0.25) {
          ctx.strokeStyle = 'rgba(94,246,255,' + (1 - age / 0.25) + ')'; ctx.lineWidth = 2.5;
          ctx.beginPath(); bolt.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    });
  };

  // ---------- garde : écrans de déverrouillage autour de Capri ----------
  C.lockPanels = function (cx, cy) {
    var list = [], W = innerWidth, H = innerHeight, count = W < 500 ? 5 : 7, ended = -1, t0 = performance.now();
    function place(p) {
      var best = null, bestS = 1e12;
      for (var k = 0; k < 20; k++) {
        var a = Math.PI * rnd(0.9, 2.1), r = rnd(120, 260);
        var x = cx + Math.cos(a) * r * 1.2 - p.w / 2, y = cy + Math.sin(a) * r - p.h / 2;
        x = Math.max(4, Math.min(W - p.w - 4, x)); y = Math.max(50, Math.min(H - p.h - 80, y));
        var s = 0;
        list.forEach(function (o) {
          if (o === p) return;
          var ix = Math.max(0, Math.min(x + p.w, o.x + o.w) - Math.max(x, o.x)), iy = Math.max(0, Math.min(y + p.h, o.y + o.h) - Math.max(y, o.y));
          s += ix * iy;
        });
        var cxo = Math.max(0, Math.min(x + p.w, cx + 60) - Math.max(x, cx - 60)), cyo = Math.max(0, Math.min(y + p.h, cy + 120) - Math.max(y, cy - 120));
        s += cxo * cyo * 4;
        if (s < bestS) { bestS = s; best = [x, y]; }
      }
      p.x = best[0]; p.y = best[1];
      p.e.style.left = p.x + 'px'; p.e.style.top = p.y + 'px';
    }
    function fresh(p) {
      var cells = p.e.querySelectorAll('.mx span');
      for (var i = 0; i < cells.length; i++) { cells[i].textContent = CODES[Math.floor(Math.random() * 6)]; cells[i].style.color = ''; }
      p.e.querySelector('.stp').style.display = 'none';
    }
    for (var i = 0; i < count; i++) {
      var cyan = Math.random() < 0.28, w = rnd(170, 210), h = rnd(120, 140);
      var e = el('div', 'lockp', '<div class="hd">BREACH // NODE 0x' + Math.floor(rnd(256, 4095)).toString(16).toUpperCase() + '</div><div class="mx"><div class="bd"></div></div><div class="mt"><i></i></div><div class="sg"></div><div class="stp"></div>');
      e.style.width = w + 'px'; e.style.height = h + 'px';
      e.style.setProperty('--acc', cyan ? '#5EF6FF' : '#FF3355');
      e.style.setProperty('--fill', cyan ? 'rgba(21,200,216,.19)' : 'rgba(255,34,68,.25)');
      var mx = e.querySelector('.mx');
      for (var c = 0; c < 20; c++) mx.appendChild(el('span'));
      var sg = e.querySelector('.sg');
      for (c = 0; c < 10; c++) sg.appendChild(el('i'));
      document.body.appendChild(e);
      var p = { e: e, w: w, h: h, delay: 0.2 + i * 0.25, start: 0, solve: rnd(2.6, 4.6) };
      list.push(p);
      fresh(p);
      place(p);
    }
    var stopLoop = loop(function (t) {
      list.forEach(function (p) {
        var e = p.e, stp = e.querySelector('.stp');
        if (ended >= 0) {
          var g = t - ended;
          e.style.opacity = Math.random() < 0.1 ? 0.4 : 1;
          e.style.setProperty('--acc', '#5EF6FF');
          stp.style.display = 'block'; stp.textContent = 'ACCÈS AUTORISÉ'; stp.style.color = '#5EF6FF';
          var u = Math.max(0, (g - 1.1) / 0.3);
          e.style.transform = u > 0 ? 'scale(' + (u < 0.6 ? 1 : Math.max(0, 1 - (u - 0.6) / 0.4)) + ',' + Math.max(0.02, 1 - u * 1.5) + ')' : '';
          return;
        }
        var lt = t - p.delay - p.start;
        if (lt < 0) { e.style.opacity = 0; return; }
        var cyc = 0.35 + p.solve + 0.8 + 0.3;
        if (lt < 0.35) { e.style.transform = 'scaleY(' + Math.min(1, 0.05 + lt / 0.35 * 1.3) + ')'; e.style.opacity = Math.random() < 0.5 ? 0.3 : 0.95; return; }
        e.style.opacity = Math.random() < 0.04 ? 0.5 : 0.95;
        e.style.transform = '';
        var st = lt - 0.35, segs = e.querySelectorAll('.sg i'), bd = e.querySelector('.bd'), meter = e.querySelector('.mt i');
        if (st < p.solve) {
          var u2 = st / p.solve, row = Math.floor(st / 0.45) % 4;
          bd.style.top = (5 + row * 17) + 'px';
          if (Math.random() < 0.18) { var cell = e.querySelectorAll('.mx span')[row * 5 + Math.floor(Math.random() * 5)]; cell.textContent = '[ ]'; cell.style.color = 'var(--acc)'; }
          meter.style.height = (u2 * 100) + '%';
          for (var k = 0; k < segs.length; k++) segs[k].className = k < u2 * segs.length ? 'on' : '';
        } else if (st < p.solve + 0.8) {
          stp.style.display = 'block'; stp.textContent = 'ICE BRISÉ'; stp.style.color = '#fff';
        } else if (lt < cyc) {
          var u3 = (lt - 0.35 - p.solve - 0.8) / 0.3;
          e.style.transform = 'scale(' + (u3 < 0.6 ? 1 : Math.max(0, 1 - (u3 - 0.6) / 0.4)) + ',' + Math.max(0.02, 1 - u3 * 1.5) + ')';
        } else {
          e.style.opacity = 0;
          p.start = t - p.delay + rnd(0.3, 1.2);
          fresh(p); meter.style.height = '0';
          place(p);
        }
      });
      if (ended >= 0 && t - ended > 1.5) { list.forEach(function (p) { p.e.remove(); }); return true; }
    });
    return {
      end: function () { if (ended < 0) ended = (performance.now() - t0) / 1000; },
      kill: function () { stopLoop(); list.forEach(function (p) { p.e.remove(); }); }
    };
  };
})();
