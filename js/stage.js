// Scène : Capri vit en bas de l'écran (sur la barre de saisie, ou sur le panneau de discussion quand il est ouvert)
var C = window.C || (window.C = {});

(function () {
  var F = C.FIG;
  var canvas, ctx, dpr = 1, W = 0, H = 0, S = 1;
  var rnd = Math.random;
  var fxList = [];
  var hit, bubble, bubbleText, bubbleHead, vexBubble;

  var st = {
    x: 0, y: 0, vy: 0, dir: 1, mode: 'idle', modeT: 0, modeDur: 2, targetX: 0, dashStart: 0, ghostT: 0,
    animT: 0, glitchT: 0, talkT: 0, bubbleT: 0, zzzT: 0, codeT: 0, bounceT: 0,
    sleeping: false, partying: false, fighting: false, hacking: false, chatOpen: false,
    remarkT: 90, touch: null, ready: false
  };
  var stage = C.stage = { hidden: false, st: st, onTap: null };

  function rr(a, b) { return a + rnd() * (b - a); }
  function clampX(x) { return Math.max(34, Math.min(W - 34, x)); }

  function floorY() {
    var id = st.chatOpen ? 'panel' : 'inputBar';
    var r = document.getElementById(id).getBoundingClientRect();
    return r.top + (st.chatOpen ? 3 : 1);
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    S = Math.max(0.72, Math.min(1.05, W / 430));
    if (st.ready) st.x = clampX(st.x);
  }

  stage.init = function () {
    canvas = document.getElementById('stage');
    ctx = canvas.getContext('2d');
    hit = document.getElementById('capriHit');
    bubble = document.getElementById('bubble');
    bubbleText = bubble.querySelector('.bt');
    bubbleHead = bubble.querySelector('.bh');
    vexBubble = document.getElementById('vexBubble');
    resize();
    addEventListener('resize', resize);
    st.x = W * rr(0.3, 0.7);
    st.y = floorY();
    st.ready = true;
    hookTouch();
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tick(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  // entrée en scène : elle tombe du ciel dans un éclair
  stage.arrive = function () {
    st.y = floorY();
    spawnBolt(st.x, st.y - 700, st.x, st.y - 10, 0.4);
    st.glitchT = 0.3;
    land();
  };

  // ---------- modes ----------
  // chaque danse pioche parmi celles débloquées par la Street Cred (ou celle demandée)
  function setMode(m, dur) {
    if (m === 'dance' && (st.mode !== 'dance' || st.nextDance)) { st.danceAnim = st.nextDance || (C.cred ? C.cred.randomDance() : 'dance'); st.nextDance = null; }
    st.mode = m; st.modeT = 0; st.modeDur = dur || 0; st.animT = 0;
  }
  function land() { st.x = clampX(st.x); sparks(st.x, st.y, 12); setMode('land', 0.4); }

  function chooseNext() {
    if (st.partying) { setMode('dance', 1e9); return; }
    if (st.fighting) { setMode('idle', 0.5); return; }
    if (st.hacking) { setMode('netrun', 1e9); return; }
    if (st.sleeping) { setMode('sleep', 0); return; }
    if (!C.cfg('wander')) { setMode(rnd() < 0.25 ? 'sit' : 'idle', rr(3, 8)); return; }
    var r = rnd();
    if (r < 0.36) walkTo(clampX(st.x + (rnd() < 0.5 ? -1 : 1) * rr(60, W * 0.6)));
    else if (r < 0.52) stage.dashTo(rr(40, W - 40));
    else if (r < 0.64) setMode('idle', rr(2, 5));
    else if (r < 0.80) setMode('sit', rr(6, 14));
    else if (r < 0.87) stage.wave();
    else if (r < 0.92) setMode('dance', 3.5);
    else teleport(rr(40, W - 40));
  }

  function walkTo(x) {
    st.targetX = x;
    if (Math.abs(x - st.x) < 2) { setMode('idle', 2); return; }
    st.dir = x > st.x ? 1 : -1;
    setMode('walk', 0);
  }

  function teleport(x) {
    ghost('#FFFFFF', 0.8, 0.35);
    var nx = clampX(x);
    spawnBolt(st.x, st.y - 75 * S, nx, st.y - 75 * S, 0.3);
    st.x = nx; st.y = floorY();
    st.glitchT = 0.3;
    land();
  }

  function zapTo(x, y) {
    ghost('#3CF06E', 0.7, 0.3);
    spawnBolt(st.x, st.y - 75 * S, x, y - 75 * S, 0.3);
    st.x = x; st.y = y; st.glitchT = 0.2;
    sparks(st.x, st.y, 8);
  }

  function update(dt) {
    var f = floorY();
    switch (st.mode) {
      case 'idle': if (st.modeT > st.modeDur && !st.chatOpen) chooseNext(); break;
      case 'walk':
        var d = st.targetX - st.x, step = 58 * S * dt;
        if (Math.abs(d) <= step) { st.x = st.targetX; setMode('idle', rr(1.5, 4.5)); } else { st.dir = Math.sign(d); st.x += step * st.dir; }
        break;
      case 'dashprep':
        if (st.modeT > 0.16) { st.dashStart = st.x; ghost('#FFFFFF', 0.6, 0.25); setMode('dash', 0); }
        break;
      case 'dash':
        var dd = st.targetX - st.x, stp = 2200 * dt, ox = st.x;
        st.ghostT -= dt;
        if (st.ghostT <= 0) { ghost(rnd() < 0.5 ? '#3CF06E' : '#FF1E46', 0.55, 0.22); st.ghostT = 0.02; }
        if (Math.abs(dd) <= stp) st.x = st.targetX; else st.x += stp * Math.sign(dd);
        spawnBolt(ox, st.y - 75 * S, st.x, st.y - 75 * S, 0.18);
        if (st.x === st.targetX) { spawnBolt(st.dashStart, st.y - 75 * S, st.x, st.y - 75 * S, 0.35); land(); }
        break;
      case 'land': if (st.modeT > 0.4) setMode('idle', rr(1, 3)); break;
      case 'sit': case 'wave': case 'dance': case 'dizzy': case 'think':
        if (st.modeT > st.modeDur) setMode('idle', rr(1, 3));
        break;
      case 'jump':
        if (st.modeT < 0.15) break;
        var u = Math.min(1, (st.modeT - 0.15) / st.jdur);
        st.x = st.jx0 + (st.jx1 - st.jx0) * u;
        st.y = f - st.jh * 4 * u * (1 - u);
        if (u >= 1) { st.y = f; land(); }
        break;
      case 'netrun':
        st.codeT -= dt;
        if (st.codeT <= 0) { spawnCode(); st.codeT = 0.12; }
        break;
      case 'sleep':
        if (!st.sleeping) { setMode('wave', 1.5); break; }
        st.zzzT -= dt;
        if (st.zzzT <= 0) { spawnZ(); st.zzzT = 1.3; }
        break;
      case 'held':
        if (st.touch) { st.x = st.touch.x; st.y = st.touch.y + 120 * S; }
        break;
    }
    // physique : chute et sol qui bouge (ouverture / fermeture du panneau)
    if (st.mode === 'held' || st.mode === 'jump') return;
    if (st.mode === 'fall') {
      st.vy += 2400 * dt;
      st.y += st.vy * dt;
      if (st.y >= f) { st.y = f; st.vy = 0; land(); }
      return;
    }
    if (st.y < f - 2) { st.vy = 0; setMode('fall', 0); }
    else if (st.y > f + 2) zapTo(st.x, f);
  }

  function anim() {
    switch (st.mode) {
      case 'walk': return 'walk';
      case 'dashprep': case 'land': return 'crouch';
      case 'dash': return 'dash';
      case 'sit': return 'sit';
      case 'sleep': return 'sleep';
      case 'wave': return 'wave';
      case 'dance': return st.danceAnim || 'dance';
      case 'held': return 'held';
      case 'fall': return 'fall';
      case 'jump': return st.modeT < 0.15 ? 'crouch' : 'fall';
      case 'dizzy': return 'dizzy';
      case 'netrun': return 'netrun';
      case 'think': return 'think';
    }
    if (st.talkT > 0 || C.speaking) return 'talk';
    return 'idle';
  }

  // ---------- effets ----------
  function ghost(tint, alpha, life) {
    fxList.push({ k: 'ghost', p: C.pose(anim(), st.animT), tint: tint, x: st.x, y: st.y, dir: st.dir, a: alpha, life: life, age: 0 });
  }
  function spawnBolt(x1, y1, x2, y2, life) { fxList.push({ k: 'bolt', x1: x1, y1: y1, x2: x2, y2: y2, life: life, age: 0 }); }
  function sparks(x, y, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.PI + rnd() * Math.PI, sp = rr(150, 450) * S;
      fxList.push({ k: 'spark', x: x, y: y - 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: i % 3 === 0 ? '#3CF06E' : '#B46BFF', life: rr(0.35, 0.6), age: 0 });
    }
  }
  function spawnZ() { fxList.push({ k: 'text', t: 'z', c: '#B46BFF', size: rr(12, 18), x: st.x + st.dir * 8, y: st.y - 100 * S, vy: -22, wob: true, life: 2.2, age: 0 }); }
  var BITS = ['0x3F', '1011', 'ICE', '01', 'NET', '0xBD', '1C', 'E9', 'FF', 'SYNC', '7A'];
  function spawnCode() {
    var cols = ['#3CF06E', '#FF1E46', '#5EF6FF', '#B46BFF'];
    fxList.push({ k: 'text', mono: true, t: BITS[Math.floor(rnd() * BITS.length)], c: cols[Math.floor(rnd() * 4)], size: rr(9, 12), x: st.x + (rnd() - 0.5) * 120 * S, y: st.y - 10 - rnd() * 120 * S, vy: -30, flick: true, life: 1.4, age: 0 });
  }
  function stars() {
    for (var i = 0; i < 3; i++) fxList.push({ k: 'star', ph: i * Math.PI * 2 / 3, c: i === 1 ? '#FCEE0A' : '#5EF6FF', life: 2.8, age: 0 });
  }
  stage.sparks = sparks;
  stage.bolt = spawnBolt;

  function jag(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, l = Math.sqrt(dx * dx + dy * dy), p = [[x1, y1]];
    if (l >= 1) {
      var n = Math.max(3, Math.floor(l / 16)), nx = -dy / l, ny = dx / l;
      for (var i = 1; i < n; i++) { var t = i / n, o = (rnd() * 2 - 1) * 9; p.push([x1 + dx * t + nx * o, y1 + dy * t + ny * o]); }
    }
    p.push([x2, y2]);
    return p;
  }

  function drawFx(dt, front) {
    for (var i = fxList.length - 1; i >= 0; i--) {
      var f = fxList[i];
      var isFront = f.k === 'spark' || f.k === 'text' || f.k === 'star';
      if (isFront !== front) continue;
      f.age += dt;
      if (f.age >= f.life) { fxList.splice(i, 1); continue; }
      var k = 1 - f.age / f.life;
      if (f.k === 'ghost') drawFig(f.p, f.x, f.y, f.dir, f.tint, null, f.a * k);
      else if (f.k === 'bolt') {
        var pts = jag(f.x1, f.y1, f.x2, f.y2);
        ctx.globalAlpha = k;
        [['rgba(60,240,110,.45)', 5], ['#FFFFFF', 1.6]].forEach(function (s) {
          ctx.strokeStyle = s[0]; ctx.lineWidth = s[1];
          ctx.beginPath(); pts.forEach(function (p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke();
        });
        ctx.globalAlpha = 1;
      } else if (f.k === 'spark') {
        f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
        ctx.globalAlpha = k; ctx.strokeStyle = f.c; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * 0.035, f.y - f.vy * 0.035); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (f.k === 'text') {
        f.y += f.vy * dt;
        if (f.wob) f.x += Math.sin(f.age * 3) * 10 * dt;
        ctx.globalAlpha = Math.min(1, k * 1.5) * (f.flick && rnd() < 0.1 ? 0.3 : 1);
        ctx.fillStyle = f.c;
        ctx.font = (f.mono ? '' : '700 ') + f.size + 'px ' + (f.mono ? '"Share Tech Mono", monospace' : 'Rajdhani, sans-serif');
        ctx.fillText(f.t, f.x, f.y);
        ctx.globalAlpha = 1;
      } else if (f.k === 'star') {
        var a = f.age * 7 + f.ph;
        ctx.globalAlpha = Math.min(1, k * 3);
        ctx.fillStyle = f.c;
        ctx.font = '700 13px sans-serif';
        ctx.fillText('✦', st.x + st.dir * 2 * S + Math.cos(a) * 24 * S - 5, st.y - 128 * S + Math.sin(a) * 7 * S);
        ctx.globalAlpha = 1;
      }
    }
  }

  // dessine une figure pieds en (x, y)
  function drawFig(p, x, y, dir, tint, pal, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(S * dir, S);
    ctx.translate(-F.W / 2, -F.GROUND);
    C.drawFigure(ctx, p, tint, pal, alpha);
    ctx.restore();
  }
  stage.drawFig = function (p, x, y, dir, tint, pal, alpha) { drawFig(p, x, y, dir, tint, pal, alpha); };

  // ---------- boucle ----------
  function tick(dt) {
    st.animT += dt; st.modeT += dt;
    if (st.talkT > 0) st.talkT -= dt;
    if (st.bounceT > 0) st.bounceT = Math.max(0, st.bounceT - dt);
    if (st.glitchT > 0) st.glitchT -= dt; else if (rnd() < dt * 0.05) st.glitchT = 0.16;
    if (st.bubbleT > 0) { st.bubbleT -= dt; if (st.bubbleT <= 0) bubble.classList.add('hidden'); }
    st.remarkT -= dt;
    if (st.remarkT <= 0) { st.remarkT = rr(120, 260); if (C.remark) C.remark(); }
    update(dt);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (st.mode === 'netrun') drawCables();
    drawFx(dt, false);
    if (C.vex) C.vex.draw(dt);
    if (C.visitor) C.visitor.draw(dt);
    var hop = st.bounceT > 0 ? Math.sin(Math.PI * st.bounceT / 0.18) * 12 : 0;
    if (!stage.hidden) {
      var p = C.pose(anim(), st.animT), g = st.glitchT > 0;
      if (g) {
        drawFig(p, st.x - (3 + rnd() * 3) * S, st.y - hop, st.dir, '#3CF06E', null, 0.7);
        drawFig(p, st.x + (3 + rnd() * 3) * S, st.y - hop, st.dir, '#FF1E46', null, 0.7);
      }
      ctx.shadowColor = 'rgba(139,61,255,.55)'; ctx.shadowBlur = 12;
      drawFig(p, st.x + (g ? Math.round(rr(-2, 2)) : 0), st.y - hop, st.dir, null, C.cred ? C.cred.palette() : null, 1);
      ctx.shadowBlur = 0;
    }
    drawFx(dt, true);

    // zone tactile et bulle
    var fw = 76 * S, fh = 160 * S;
    hit.style.left = (st.x - fw / 2) + 'px'; hit.style.top = (st.y - fh) + 'px';
    hit.style.width = fw + 'px'; hit.style.height = fh + 'px';
    hit.style.display = stage.hidden ? 'none' : 'block';
    if (!bubble.classList.contains('hidden')) placeBubble(bubble, st.x, st.y - 222 * S);
  }

  function placeBubble(b, x, top) {
    var w = b.offsetWidth, h = b.offsetHeight;
    var cx = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, x));
    b.style.left = cx + 'px';
    b.style.top = Math.max(50, top - h) + 'px';
  }
  stage.placeBubble = placeBubble;

  function drawCables() {
    var hx = st.x + st.dir * (51 - 60) * S, hy = st.y - (F.GROUND - 104) * S, cols = ['#7B2CF0', '#3CF06E', '#FF1E46'];
    for (var i = 0; i < 3; i++) {
      var ex = hx - st.dir * (42 + i * 22) * S, ey = st.y + 1;
      ctx.strokeStyle = cols[i]; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(hx, hy + i * 2);
      ctx.bezierCurveTo(hx - st.dir * 28 * S, hy + 8, ex + st.dir * 8, ey - 34 * S, ex, ey);
      ctx.stroke();
      ctx.fillStyle = '#0B0A10'; ctx.fillRect(ex - 3, ey - 2, 6, 3);
    }
  }

  // ---------- toucher : taper = discuter, glisser = l'attraper ----------
  function hookTouch() {
    var down = null;
    hit.addEventListener('pointerdown', function (e) {
      down = { x: e.clientX, y: e.clientY, moved: false };
      hit.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    hit.addEventListener('pointermove', function (e) {
      if (!down) return;
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) {
        down.moved = true;
        st.sleeping = false; st.hacking = false;
        setMode('held', 0);
      }
      if (down.moved) st.touch = { x: e.clientX, y: e.clientY };
    });
    function up() {
      if (!down) return;
      if (down.moved) { st.touch = null; st.vy = 0; setMode('fall', 0); }
      else if (stage.onTap) stage.onTap();
      down = null;
    }
    hit.addEventListener('pointerup', up);
    hit.addEventListener('pointercancel', up);
  }

  // ---------- commandes publiques ----------
  stage.say = function (text, header) {
    if (!text) return;
    var t = text.length > 160 ? text.slice(0, 157) + '...' : text;
    bubbleHead.textContent = header || 'CAPRI //';
    bubble.classList.toggle('notif', !!header);
    bubbleText.textContent = t;
    bubble.classList.remove('hidden');
    st.bubbleT = Math.max(3, Math.min(9, 2.5 + t.length * 0.055));
    stage.talkFor(Math.min(6, 0.8 + t.length * 0.05));
    placeBubble(bubble, st.x, st.y - 222 * S);
  };
  stage.hideBubble = function () { bubble.classList.add('hidden'); st.bubbleT = 0; };
  stage.talkFor = function (s) { st.talkT = Math.max(st.talkT, s); };
  stage.dashTo = function (x) {
    st.sleeping = false;
    st.targetX = clampX(x);
    if (Math.abs(st.targetX - st.x) < 5) { stage.wave(); return; }
    st.dir = st.targetX > st.x ? 1 : -1;
    setMode('dashprep', 0);
  };
  stage.dashRandom = function () { stage.dashTo(rr(40, W - 40)); };
  stage.come = function () { stage.dashTo(W / 2); };
  stage.wave = function () { setMode('wave', 2.2); };
  stage.dance = function (style) { st.sleeping = false; st.nextDance = style || null; setMode('dance', 5); };
  stage.think = function (s) { setMode('think', s || 2); };
  stage.setSleep = function (s) { st.sleeping = s; if (s) setMode('sleep', 0); else setMode('wave', 1.5); };
  stage.setChatOpen = function (open) {
    st.chatOpen = open;
    if (open && (st.mode === 'walk' || st.mode === 'sit' || st.mode === 'dance' || st.mode === 'sleep')) {
      if (!st.partying) { st.sleeping = false; setMode('idle', 2); }
    }
    if (open) stage.hideBubble();
  };
  stage.dizzy = function () {
    if (st.mode === 'held' || st.mode === 'fall' || st.mode === 'dizzy') return false;
    st.sleeping = false;
    setMode('dizzy', 2.8);
    st.glitchT = 0.25;
    stars();
    return true;
  };
  stage.party = function (on) {
    st.partying = on;
    if (on) { st.sleeping = false; if (st.mode !== 'held' && st.mode !== 'fall') setMode('dance', 1e9); }
    else if (st.mode === 'dance') setMode('wave', 1.5);
  };
  stage.beat = function (strong) {
    if (!st.partying || st.mode !== 'dance') return;
    st.bounceT = 0.18;
    if (strong) { sparks(st.x, st.y, 4); if (rnd() < 0.25) st.glitchT = 0.07; }
  };
  stage.hack = function (on) {
    if (on === st.hacking) return;
    st.hacking = on;
    if (on) { st.sleeping = false; setMode('netrun', 1e9); } else setMode('wave', 2);
  };
  stage.busy = function () { return st.fighting || st.partying || st.hacking || st.mode === 'held'; };
  stage.mode = function () { return st.mode; };
  stage.W = function () { return W; };
  stage.S = function () { return S; };
  stage.floor = floorY;

  // combat
  stage.engage = function (faceX) {
    st.fighting = true; st.sleeping = false; st.partying = false; st.hacking = false;
    stage.hideBubble();
    st.dir = faceX >= st.x ? 1 : -1;
    setMode('idle', 0.5);
  };
  stage.faceTo = function (x) { st.dir = x >= st.x ? 1 : -1; };
  stage.hopTo = function (x) {
    st.jx0 = st.x; st.jx1 = clampX(x); st.jdur = 0.5; st.jh = 60 * S;
    st.dir = st.jx1 >= st.x ? 1 : -1;
    sparks(st.x, st.y, 6);
    setMode('jump', 0);
  };
  stage.clash = function (x) {
    sparks(x, st.y - 70 * S, 22);
    for (var i = 0; i < 4; i++) { var a = rnd() * Math.PI * 2, r = rr(50, 120); spawnBolt(x, st.y - 80 * S, x + Math.cos(a) * r, st.y - 80 * S + Math.sin(a) * r, 0.3); }
    st.glitchT = 0.2;
  };
  stage.stun = function () { setMode('dizzy', 2.6); st.glitchT = 0.3; stars(); };
  stage.grabbed = function () { return st.mode === 'held'; };
})();
