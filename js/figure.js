// Dessin vectoriel de Capri (port de Figure.cs / Anim.cs) : repère 120 x 200, pieds au sol à y = 166, regard vers la droite
var C = window.C || (window.C = {});

(function () {
  var W = 120, H = 200, GROUND = 166, FPS = 12;
  C.FIG = { W: W, H: H, GROUND: GROUND, FPS: FPS, PS: 400 };

  var COL = C.COL = {
    Black: '#0B0A10', Red: '#FF1E46', RedBack: '#B0122F', Green: '#3CF06E', GreenBack: '#1F9E48', GreenMid: '#2FD25E',
    Shadow: '#5A0A3C', Purple: '#7B2CF0', Blue: '#1E6BFF', White: '#FFFFFF', Mouthin: '#5A0A1C', Volt: '#B46BFF'
  };
  // Palette de Vex, la rivale
  C.VEX = { Red: '#1EC8FF', RedBack: '#0E6E9A', Green: '#FF2BD6', GreenBack: '#A01488', GreenMid: '#D020B0', Purple: '#FCEE0A', Shadow: '#0A2F5A' };

  // ---------- petits outils vectoriels ----------
  function P(x, y) { return { x: x, y: y }; }
  function add(a, b) { return P(a.x + b.x, a.y + b.y); }
  function sub(a, b) { return P(a.x - b.x, a.y - b.y); }
  function mul(a, k) { return P(a.x * k, a.y * k); }
  function len(a) { return Math.sqrt(a.x * a.x + a.y * a.y); }
  function norm(a) { var l = len(a); return l < 1e-9 ? P(0, 0) : P(a.x / l, a.y / l); }
  function pts(v) { var r = []; for (var i = 0; i < v.length; i += 2) r.push(P(v[i], v[i + 1])); return r; }
  // pseudo-aléatoire stable
  function R(i) { var v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); }
  C.vec = { P: P, add: add, sub: sub, mul: mul, len: len, norm: norm };

  // contexte de dessin : couleur résolue selon teinte (silhouette unie) ou palette
  function col(d, name) { return d.tint || (d.pal && d.pal[name]) || COL[name]; }

  function poly(d, fill, p, alpha) {
    var c = d.ctx;
    c.beginPath();
    c.moveTo(p[0].x, p[0].y);
    for (var i = 1; i < p.length; i++) c.lineTo(p[i].x, p[i].y);
    c.closePath();
    if (alpha != null) c.globalAlpha = d.alpha * alpha;
    c.fillStyle = fill;
    c.fill();
    if (alpha != null) c.globalAlpha = d.alpha;
  }

  // contour fermé lissé (Catmull-Rom -> Bézier)
  function smooth(d, fill, p) {
    var c = d.ctx, n = p.length;
    c.beginPath();
    c.moveTo(p[0].x, p[0].y);
    for (var i = 0; i < n; i++) {
      var p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      c.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
    }
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }

  function disc(d, fill, x, y, r, stroke, th) {
    var c = d.ctx;
    c.beginPath();
    c.arc(x, y, r - (stroke ? th / 2 : 0), 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = th; c.stroke(); }
  }

  function line(d, stroke, th, v) {
    var c = d.ctx;
    c.beginPath();
    c.moveTo(v[0], v[1]);
    for (var i = 2; i < v.length; i += 2) c.lineTo(v[i], v[i + 1]);
    c.strokeStyle = stroke;
    c.lineWidth = th;
    c.lineJoin = 'miter';
    c.stroke();
  }

  // membre galbé a -> k -> b ; demi-largeurs côté dos (wb) et avant (wf)
  function curvy(d, fill, a, k, b, wb, wf) {
    var d1 = sub(k, a), d2 = sub(b, k);
    if (len(d1) < 0.01) d1 = P(0, 1);
    if (len(d2) < 0.01) d2 = d1;
    d1 = norm(d1); d2 = norm(d2);
    var n1 = P(-d1.y, d1.x), n2 = P(-d2.y, d2.x), nk = add(n1, n2);
    if (len(nk) < 0.01) nk = n1;
    nk = norm(nk);
    var us = [0, 0.4, 0.8, 1, 1.35, 1.7, 2], mid = [], nor = [];
    for (var i = 0; i < us.length; i++) {
      var u = us[i];
      if (u < 1) { mid[i] = add(a, mul(sub(k, a), u)); nor[i] = n1; }
      else if (u > 1) { mid[i] = add(k, mul(sub(b, k), u - 1)); nor[i] = n2; }
      else { mid[i] = k; nor[i] = nk; }
    }
    var p = [];
    for (i = 0; i < us.length; i++) p.push(add(mid[i], mul(nor[i], wb[i])));
    p.push(add(b, mul(d2, (wb[6] + wf[6]) * 0.6)));
    for (i = us.length - 1; i >= 0; i--) p.push(sub(mid[i], mul(nor[i], wf[i])));
    p.push(sub(a, mul(d1, (wb[0] + wf[0]) * 0.4)));
    smooth(d, fill, p);
  }

  function leg(d, hip, kn, fo, fill) {
    curvy(d, fill, hip, kn, fo, [6.0, 5.6, 3.6, 2.8, 3.9, 2.6, 1.4], [6.4, 5.2, 3.4, 2.8, 2.6, 2.0, 1.4]);
  }

  function claw(d, el, ha, fill) {
    var dv = sub(ha, el);
    if (len(dv) < 0.01) dv = P(0, 1);
    dv = norm(dv);
    var n = P(-dv.y, dv.x);
    smooth(d, fill, [sub(sub(ha, mul(n, 1.6)), mul(dv, 0.5)), sub(add(ha, mul(dv, 3)), mul(n, 1.2)), add(add(ha, mul(dv, 3)), mul(n, 1.2)), sub(add(ha, mul(n, 1.6)), mul(dv, 0.5))]);
    for (var i = -1; i <= 2; i++) {
      var a = (i - 0.5) * 0.32;
      var fd = add(mul(dv, Math.cos(a)), mul(n, Math.sin(a)));
      var fn = P(-fd.y, fd.x);
      var b = add(add(ha, mul(dv, 2.5)), mul(n, (i - 0.5) * 0.9));
      poly(d, fill, [add(b, mul(fn, 0.5)), add(b, mul(fd, i === 2 ? 4.5 : 7)), sub(b, mul(fn, 0.5))]);
    }
  }

  function arm(d, sh, el, ha, fill) {
    curvy(d, fill, sh, el, ha, [3.0, 2.6, 1.8, 1.6, 2.0, 1.6, 1.0], [3.0, 2.4, 1.8, 1.6, 1.8, 1.4, 1.0]);
    claw(d, el, ha, fill);
  }

  function shoe(d, f, fill, edge) {
    if (edge) {
      shoe(d, add(f, P(0.9, 0.9)), edge, null);
      shoe(d, add(f, P(-0.6, -0.6)), edge, null);
    }
    smooth(d, fill, pts([f.x - 3.2, f.y - 8.5, f.x + 1.2, f.y - 7.5, f.x + 6, f.y - 3.2, f.x + 10.5, f.y - 0.8, f.x + 4, f.y - 0.2, f.x - 0.5, f.y - 2.6, f.x - 3.6, f.y - 4.2]));
    poly(d, fill, pts([f.x + 8, f.y - 1.9, f.x + 13, f.y, f.x + 8, f.y - 0.1]));
    poly(d, fill, pts([f.x - 4, f.y - 5, f.x - 3.4, f.y, f.x - 2.6, f.y - 0.2, f.x - 2.2, f.y - 4]));
  }

  function neckSeg(d, p0, p1, fill) {
    var dv = sub(p1, p0);
    if (len(dv) < 0.01) dv = P(0, -1);
    dv = norm(dv);
    var n = P(-dv.y, dv.x), m = add(p0, mul(sub(p1, p0), 0.5));
    smooth(d, fill, [add(p0, mul(n, 2.6)), add(m, mul(n, 1.7)), add(p1, mul(n, 2)), sub(p1, mul(n, 2)), sub(m, mul(n, 1.7)), sub(p0, mul(n, 2.6))]);
  }

  function torso(d, p, red, green) {
    var u = sub(p.Hip, p.Neck), L = len(u);
    if (L < 1) return;
    u = norm(u);
    var n = P(-u.y, u.x);
    function at(t, s) { return add(add(p.Neck, mul(u, L * t)), mul(n, s)); }
    smooth(d, red, [at(-0.02, 2.4), at(0.07, 5.6), at(0.28, 4.6), at(0.56, 3.0), at(0.8, 7.2), at(0.97, 7.4), at(1.1, 0.5),
      at(0.98, -8.0), at(0.82, -8.4), at(0.6, -3.4), at(0.45, -4.6), at(0.33, -8.6), at(0.2, -7.6), at(0.08, -5.4), at(-0.02, -2.4)]);
    smooth(d, green, [at(-0.02, 2.4), at(0.07, 5.6), at(0.28, 4.6), at(0.56, 3.0), at(0.8, 7.2), at(0.97, 7.4), at(1.1, 0.5),
      at(0.98, -0.6), at(0.72, -0.2), at(0.4, 0.8), at(0.12, 0.2), at(-0.02, -0.2)]);
  }

  function atHead(d, p, fn) {
    var c = d.ctx;
    c.save();
    c.translate(p.Head.x, p.Head.y);
    c.rotate(p.Tilt * Math.PI / 180);
    fn();
    c.restore();
  }

  function hair(d, p) {
    var flow = norm(p.ScarfDir), a0 = -p.Tilt * Math.PI / 180;
    flow = P(flow.x * Math.cos(a0) - flow.y * Math.sin(a0), flow.x * Math.sin(a0) + flow.y * Math.cos(a0));
    var stretch = 3 + (p.ScarfStretch - 1) * 20, o = P(-4, -10);
    var n = 11, span = 250, step = span / n * Math.PI / 180;
    function polar(a, r, fl) { return add(add(o, P(Math.cos(a) * r, Math.sin(a) * r)), mul(flow, stretch * fl)); }
    atHead(d, p, function () {
      var q = [];
      for (var i = 0; i <= n; i++) {
        var f = i / n;
        var a = (-235 + f * span) * Math.PI / 180 + Math.sin(p.ScarfPhase * 0.6 + i * 1.7) * 0.03;
        var r = 44 + R(i) * 15 - Math.abs(f - 0.3) * 10;
        var fl = 0.5 + R(i + 40);
        q.push(polar(a, r, fl));
        if (i < n) {
          q.push(polar(a + step * 0.22, r * (0.72 + R(i + 60) * 0.12), fl * 0.8));
          q.push(polar(a + step * 0.38, r * (0.82 + R(i + 80) * 0.1), fl * 0.8));
          q.push(polar(a + step * 0.62, 29 + R(i + 20) * 8, 0.4));
        }
      }
      q.push(P(12, 6));
      q.push(P(-6, 14));
      poly(d, col(d, 'Purple'), q.map(function (v) { return add(v, P(1.8, 2.2)); }));
      poly(d, col(d, 'Red'), q);
      var sh = [-175, -60, -10];
      for (var s = 0; s < sh.length; s++) {
        var aa = sh[s] * Math.PI / 180, dv = P(Math.cos(aa), Math.sin(aa)), nv = P(-dv.y, dv.x);
        var m = add(add(add(o, mul(dv, 60 + R(s + 70) * 4)), mul(flow, stretch * 1.3)), mul(nv, Math.sin(p.ScarfPhase * 0.8 + s) * 1.2));
        var o15 = P(1.5, 1.5);
        poly(d, col(d, 'Purple'), [add(add(m, mul(nv, 2.6)), o15), add(add(m, mul(dv, 6)), o15), add(sub(m, mul(nv, 1.6)), o15)]);
        poly(d, col(d, 'Red'), [add(m, mul(nv, 2.6)), add(m, mul(dv, 6)), sub(m, mul(nv, 1.6))]);
      }
      if (!d.tint) {
        var flick = Math.floor(p.ScarfPhase * 2);
        for (s = 0; s < 55; s++) {
          if ((s + flick) % 6 === 0) continue;
          var a2 = (-215 + R(s + 100) * 205) * Math.PI / 180, r2 = 14 + R(s + 200) * 34;
          var mm = add(add(o, P(Math.cos(a2) * r2, Math.sin(a2) * r2)), mul(flow, stretch * 0.5));
          var z = 0.4 + R(s + 300) * 0.8;
          poly(d, COL.White, [P(mm.x, mm.y - z), P(mm.x + z, mm.y), P(mm.x, mm.y + z), P(mm.x - z, mm.y)], 0.55 + R(s + 400) * 0.45);
        }
      }
    });
  }

  function eyes(d, face) {
    var ex = [-5.5, 7.5], ey = [-5, -6], B = COL.Black, G = col(d, 'Green');
    for (var i = 0; i < 2; i++) {
      var x = ex[i], y = ey[i];
      if (face === 1) line(d, B, 1.7, [x - 4, y + 1.5, x, y - 2.5, x + 4, y + 1.5]);
      else if (face === 2) line(d, B, 1.7, [x - 4, y + 0.5, x + 4, y + 0.5]);
      else if (face === 4) {
        disc(d, B, x, y, 5);
        var sp = [];
        for (var k = 0; k <= 22; k++) { var a = k * 0.6 + i * 3, r = 0.2 + k * 0.18; sp.push(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        line(d, G, 0.9, sp);
      } else if (face === 3) {
        disc(d, B, x, y, 6); disc(d, null, x, y, 4.8, G, 0.8); disc(d, COL.Blue, x, y, 2); disc(d, COL.White, x, y, 0.8);
      } else {
        disc(d, B, x, y, 5); disc(d, null, x, y, 3.9, G, 0.8); disc(d, COL.Blue, x, y, 2.8); disc(d, COL.White, x + 0.5, y - 0.4, 1.1);
      }
    }
    if (face === 0 || face === 3) poly(d, B, pts([8, -0.5, 10.5, 2.2, 6.5, 1.8]));
  }

  function mouth(d, open) {
    var m = open * 3.2;
    if (m > 0.4) poly(d, COL.Mouthin, pts([-6, 6, 10, 5, 9, 7 + m, -5, 8 + m]));
    line(d, COL.White, 0.7, [-6, 6, -3, 4.2, 0, 7, 3, 4.2, 6, 6.8, 9.5, 4.6]);
    if (m > 0.4) line(d, COL.White, 0.7, [-5, 8 + m, -2, 6 + m, 1, 8.6 + m, 4, 6 + m, 7, 8.2 + m, 9, 6.6 + m]);
  }

  function headPart(d, p) {
    atHead(d, p, function () {
      var black = d.tint || COL.Black, green = col(d, 'Green');
      poly(d, black, pts([-6, -11, -15, -38, 2, -13]));
      poly(d, black, pts([5, -12, 21, -29, 12, -8]));
      poly(d, black, pts([-12, -5, -30, -11, -11, 2]));
      poly(d, black, pts([12, -3, 32, -7, 11, 4]));
      poly(d, green, pts([-13, -11, 13, -14, 16, -3, 12, 1, -11, 2, -15, -4]));
      poly(d, black, pts([-11, 2, 12, 1, 15, 4, 7, 13, -3, 16, -10, 9]));
      poly(d, black, pts([0.6, -14, 2.4, -14, 1.6, 1.5]));
      if (!d.tint) { eyes(d, p.Face); mouth(d, p.Mouth); }
    });
  }

  // Dessine Capri dans ctx (repère figure). tint : silhouette unie ; pal : palette de remplacement (Vex)
  C.drawFigure = function (ctx, p, tint, pal, alpha) {
    var d = { ctx: ctx, tint: tint || null, pal: pal || null, alpha: alpha == null ? 1 : alpha };
    ctx.save();
    ctx.globalAlpha = d.alpha;
    hair(d, p);
    arm(d, p.ShB, p.ElB, p.HaB, col(d, 'GreenBack'));
    leg(d, add(p.Hip, P(-3, 0)), p.KnB, p.FoB, col(d, 'GreenMid'));
    var edge = d.tint ? null : col(d, 'Purple');
    shoe(d, p.FoB, d.tint || COL.Black, edge);
    torso(d, p, col(d, 'Red'), col(d, 'Green'));
    neckSeg(d, add(p.Neck, mul(sub(p.Neck, p.Hip), -0.06)), add(p.Head, P(0, 8)), col(d, 'Green'));
    leg(d, add(p.Hip, P(3, 0)), p.KnF, p.FoF, col(d, 'Red'));
    shoe(d, p.FoF, d.tint || COL.Black, edge);
    headPart(d, p);
    arm(d, p.ShF, p.ElF, p.HaF, col(d, 'Green'));
    ctx.restore();
  };

  // ---------- gros plan (apparition buggée), repère 400 x 400 ----------
  function bigEye(d, x, y, closed) {
    if (closed) {
      line(d, COL.Black, 7, [x - 19, y - 11, x + 17, y + 11]);
      line(d, COL.Black, 7, [x - 17, y + 12, x + 19, y - 10]);
      return;
    }
    disc(d, COL.Black, x, y, 26); disc(d, null, x, y, 19, COL.Green, 3.5); disc(d, COL.Blue, x, y, 12); disc(d, COL.White, x + 3, y - 3, 4.5);
  }

  C.drawPortrait = function (ctx, wink, tint) {
    var d = { ctx: ctx, tint: tint || null, pal: null, alpha: 1 };
    var o = P(200, 180);
    function pol(a, r) { return add(o, P(Math.cos(a) * r, Math.sin(a) * r)); }
    function k(name) { return tint || COL[name]; }
    var n = 15, step = Math.PI * 2 / n, q = [];
    for (var i = 0; i < n; i++) {
      var a = i * step + R(i + 500) * 0.15, r = 135 + R(i + 510) * 50;
      q.push(pol(a, r)); q.push(pol(a + step * 0.25, r * 0.7)); q.push(pol(a + step * 0.42, r * 0.78)); q.push(pol(a + step * 0.7, 85 + R(i + 520) * 20));
    }
    poly(d, k('Purple'), q.map(function (v) { return add(v, P(7, 8)); }));
    poly(d, k('Red'), q);
    for (var s = 0; s < 7; s++) {
      var aa = (s / 7) * Math.PI * 2 + 0.3, m = pol(aa, 178 + R(s + 530) * 12), dv = P(Math.cos(aa), Math.sin(aa)), nv = P(-dv.y, dv.x), o3 = P(3, 3);
      poly(d, k('Purple'), [add(add(m, mul(nv, 6)), o3), add(add(m, mul(dv, 14)), o3), add(sub(m, mul(nv, 4)), o3)]);
      poly(d, k('Red'), [add(m, mul(nv, 6)), add(m, mul(dv, 14)), sub(m, mul(nv, 4))]);
    }
    if (!tint)
      for (s = 0; s < 170; s++) {
        var a3 = R(s + 600) * Math.PI * 2, r3 = 30 + R(s + 700) * 145, mm = pol(a3, r3), z = 0.8 + R(s + 800) * 1.8;
        poly(d, COL.White, [P(mm.x, mm.y - z), P(mm.x + z, mm.y), P(mm.x, mm.y + z), P(mm.x - z, mm.y)], 0.5 + R(s + 900) * 0.5);
      }
    poly(d, k('Purple'), pts([114, 304, 279, 294, 324, 400, 79, 400]));
    poly(d, k('Black'), pts([120, 300, 285, 290, 330, 400, 85, 400]));
    poly(d, k('Green'), pts([118, 302, 175, 296, 150, 400, 92, 400]));
    poly(d, k('Red'), pts([200, 300, 222, 298, 214, 345, 228, 400, 196, 400, 206, 340]));
    poly(d, k('Black'), pts([175, 260, 230, 255, 240, 302, 165, 306]));
    var horns = [[150, 162, 182, 145, 70, 70], [190, 142, 216, 143, 250, 15], [232, 148, 248, 151, 292, 62], [242, 152, 262, 168, 348, 98], [264, 188, 268, 212, 372, 214], [132, 198, 140, 222, 38, 190]];
    horns.forEach(function (h) {
      poly(d, k('Purple'), pts([h[0] + 5, h[1] + 5, h[2] + 5, h[3] + 5, h[4] + 5, h[5] + 5]));
      poly(d, k('Black'), pts(h));
    });
    poly(d, k('Green'), pts([135, 165, 205, 148, 262, 152, 280, 190, 262, 212, 200, 222, 140, 228, 122, 198]));
    poly(d, k('Black'), pts([211, 146, 220, 147, 192, 226, 184, 224]));
    poly(d, k('Black'), pts([132, 222, 205, 215, 270, 205, 262, 240, 225, 272, 175, 282, 145, 258]));
    if (!tint) {
      bigEye(d, 166, 190, false);
      bigEye(d, 240, 184, wink);
      poly(d, COL.Black, pts([244, 206, 262, 214, 238, 214]));
      var up = wink ? 6 : 0;
      line(d, COL.White, 1.8, [165, 247, 175, 241, 185, 249, 195, 241, 205, 248, 215, 240 - up * 0.4, 225, 246 - up * 0.7, 238, 236 - up]);
    }
  };

  // ---------- poses (port de Anim.cs) ----------
  function pose() {
    return { Hip: P(0, 0), Neck: P(0, 0), Head: P(0, 0), ShF: P(0, 0), ElF: P(0, 0), HaF: P(0, 0), ShB: P(0, 0), ElB: P(0, 0), HaB: P(0, 0),
      KnF: P(0, 0), FoF: P(0, 0), KnB: P(0, 0), FoB: P(0, 0), Tilt: 0, Face: 0, Mouth: 0, ScarfPhase: 0, ScarfStretch: 1, ScarfDir: P(-1, 0.25) };
  }
  function moveUpper(p, dx, dy) {
    ['Neck', 'Head', 'ShF', 'ElF', 'HaF', 'ShB', 'ElB', 'HaB'].forEach(function (k) { p[k] = P(p[k].x + dx, p[k].y + dy); });
  }
  function stand() {
    var p = pose();
    p.Hip = P(60, 104); p.Neck = P(60, 70); p.Head = P(61, 52);
    p.ShF = P(64, 74); p.ElF = P(70, 90); p.HaF = P(74, 106);
    p.ShB = P(56, 74); p.ElB = P(50, 90); p.HaB = P(46, 106);
    p.KnF = P(64, 135); p.FoF = P(66, 165); p.KnB = P(56, 135); p.FoB = P(53, 165);
    return p;
  }
  function bend(a, b, l, side) {
    var dv = sub(b, a), dist = len(dv);
    if (dist < 0.01) return a;
    var mid = add(a, mul(dv, 0.5));
    dv = norm(dv);
    var h = Math.sqrt(Math.max(0, (l / 2) * (l / 2) - (dist / 2) * (dist / 2)));
    return add(mid, mul(P(dv.y, -dv.x), h * side));
  }
  function solve(p) {
    p.KnF = bend(add(p.Hip, P(3, 0)), p.FoF, 61, 1);
    p.KnB = bend(add(p.Hip, P(-3, 0)), p.FoB, 61, 1);
    p.ElF = bend(p.ShF, p.HaF, 34, -1);
    p.ElB = bend(p.ShB, p.HaB, 34, -1);
  }
  function idle(t) {
    var p = stand();
    moveUpper(p, 0, Math.round(Math.sin(t * 2.6) * 1.6));
    p.Tilt = Math.sin(t * 0.9) * 3;
    if (t % 3.7 < 0.12) p.Face = 2;
    return p;
  }
  function talk(t) {
    var p = idle(t);
    p.Mouth = Math.floor(t * 10) % 2 === 0 ? 1 : 0.2;
    p.Tilt = Math.sin(t * 5) * 4;
    p.HaF = P(76 + Math.sin(t * 4) * 3, 96);
    p.ElF = bend(p.ShF, p.HaF, 34, -1);
    return p;
  }
  function think(t) {
    var p = stand();
    p.ElF = P(73, 88); p.HaF = P(70, 68); p.Tilt = -8;
    if (t % 2.5 < 0.15) p.Face = 2;
    return p;
  }
  function walk(t) {
    var p = stand(), ph = t * Math.PI * 2 * 1.7, s = Math.sin(ph), c = Math.cos(ph), bob = -Math.abs(c) * 2.5;
    p.Hip.y += bob;
    moveUpper(p, 2, bob);
    p.FoF = P(60 + 13 * s, 165 - Math.max(0, c) * 7);
    p.FoB = P(60 - 13 * s, 165 - Math.max(0, -c) * 7);
    p.HaF = P(65 - 9 * s, 106 + bob);
    p.HaB = P(55 + 9 * s, 106 + bob);
    solve(p);
    return p;
  }
  function dash(t) {
    var p = pose(), f = Math.floor(t * FPS) % 2 === 0;
    p.Hip = P(54, 110); p.Neck = P(74, 80); p.Head = P(84, 64);
    p.ShF = P(72, 84); p.ElF = P(58, 90); p.HaF = P(42, 92);
    p.ShB = P(70, 82); p.ElB = P(54, 82); p.HaB = P(38, 80);
    if (f) { p.FoF = P(72, 146); p.FoB = P(20, 142); } else { p.FoF = P(28, 146); p.FoB = P(70, 140); }
    p.KnF = bend(add(p.Hip, P(3, 0)), p.FoF, 61, 1);
    p.KnB = bend(add(p.Hip, P(-3, 0)), p.FoB, 61, 1);
    p.Tilt = 12; p.ScarfStretch = 2.2; p.ScarfDir = P(-1, -0.05);
    return p;
  }
  function crouch() {
    var p = pose();
    p.Hip = P(54, 132); p.Neck = P(66, 102); p.Head = P(73, 86);
    p.KnF = P(78, 140); p.FoF = P(76, 165); p.KnB = P(46, 162); p.FoB = P(26, 165);
    p.ShF = P(68, 106); p.ElF = P(76, 130); p.HaF = P(84, 164);
    p.ShB = P(62, 104); p.ElB = P(48, 112); p.HaB = P(34, 106);
    p.Tilt = 8; p.ScarfDir = P(-1, -0.6); p.ScarfStretch = 1.3;
    return p;
  }
  function sit(t, asleep) {
    var p = pose(), s = asleep ? 0 : Math.sin(t * 3);
    p.Hip = P(58, 163); p.Neck = P(58, 129); p.Head = P(60, 111);
    p.KnF = P(76, 166); p.FoF = P(78 + 3 * s, 194); p.KnB = P(72, 168); p.FoB = P(70 - 3 * s, 196);
    p.ShF = P(61, 133); p.ElF = P(66, 148); p.HaF = P(70, 163);
    p.ShB = P(55, 133); p.ElB = P(50, 148); p.HaB = P(46, 164);
    p.ScarfDir = P(-1, 0.7);
    if (asleep) { p.Face = 2; p.Tilt = 14; moveUpper(p, 0, 2); p.Head = P(63, 116); }
    else { p.Tilt = Math.sin(t * 1.3) * 5; if (t % 4.1 < 0.12) p.Face = 2; }
    return p;
  }
  function wave(t) {
    var p = idle(t);
    p.ElF = P(75, 62); p.HaF = P(79 + 5 * Math.sin(t * 14), 46); p.Face = 1; p.Tilt = 6;
    return p;
  }
  function dance(t) {
    var p = stand();
    p.Face = 1;
    switch (Math.floor(t * 3.2) % 4) {
      case 0: moveUpper(p, 3, 0); p.Hip.x += 3; p.HaF = P(84, 40); p.HaB = P(40, 42); break;
      case 1: moveUpper(p, 0, 8); p.Hip.y += 8; p.HaF = P(76, 98); p.HaB = P(44, 98); p.FoF = P(72, 165); p.FoB = P(46, 165); break;
      case 2: moveUpper(p, -3, 0); p.Hip.x -= 3; p.HaF = P(88, 66); p.HaB = P(28, 66); p.FoF = P(84, 150); break;
      default: p.HaF = P(94, 46); p.HaB = P(48, 100); p.Tilt = -10;
    }
    solve(p);
    return p;
  }
  function held(t) {
    var p = pose(), s = Math.sin(t * 7) * 4;
    p.Hip = P(60, 112); p.Neck = P(60, 76); p.Head = P(60, 58);
    p.KnF = P(64 + s, 142); p.FoF = P(66 + s * 1.5, 170); p.KnB = P(56 - s, 142); p.FoB = P(54 - s, 170);
    p.ShF = P(63, 80); p.ElF = P(74, 68 + s); p.HaF = P(80, 54 - s);
    p.ShB = P(57, 80); p.ElB = P(46, 68 - s); p.HaB = P(40, 54 + s);
    p.Face = 3; p.ScarfDir = P(-0.2, 1);
    return p;
  }
  function dizzy(t) {
    var p = stand(), s = Math.sin(t * 9);
    moveUpper(p, s * 4, 0);
    p.Hip.x += s * 2; p.Tilt = s * 16; p.Face = 4; p.Mouth = 0.5;
    p.HaF = P(78, 98 + s * 4); p.HaB = P(42, 98 - s * 4);
    p.FoF = P(70, 165); p.FoB = P(50, 165);
    solve(p);
    return p;
  }
  function netrun(t) {
    var p = pose(), b = Math.round(Math.sin(t * 2));
    p.Hip = P(60, 152); p.Neck = P(60, 118 + b); p.Head = P(61, 100 + b);
    p.ShF = P(63, 122 + b); p.ElF = P(73, 138); p.HaF = P(80, 153);
    p.ShB = P(57, 122 + b); p.ElB = P(47, 138); p.HaB = P(40, 153);
    p.KnF = P(82, 158); p.FoF = P(50, 165); p.KnB = P(38, 158); p.FoB = P(70, 166);
    p.Face = 2; p.Tilt = 4; p.ScarfDir = P(-1, 0.6);
    return p;
  }
  function fall(t) {
    var p = held(t);
    p.FoF = P(76, 158); p.FoB = P(44, 160);
    p.KnF = bend(add(p.Hip, P(3, 0)), p.FoF, 61, 1);
    p.KnB = bend(add(p.Hip, P(-3, 0)), p.FoB, 61, 1);
    p.ScarfDir = P(-0.3, -1);
    return p;
  }

  C.pose = function (anim, t) {
    t = Math.floor(t * FPS) / FPS;
    var p;
    switch (anim) {
      case 'walk': p = walk(t); break;
      case 'dash': p = dash(t); break;
      case 'crouch': p = crouch(); break;
      case 'sit': p = sit(t, false); break;
      case 'sleep': p = sit(t, true); break;
      case 'wave': p = wave(t); break;
      case 'dance': p = dance(t); break;
      case 'talk': p = talk(t); break;
      case 'think': p = think(t); break;
      case 'held': p = held(t); break;
      case 'fall': p = fall(t); break;
      case 'dizzy': p = dizzy(t); break;
      case 'netrun': p = netrun(t); break;
      default: p = idle(t);
    }
    p.ScarfPhase = t * 7;
    return p;
  };
})();
