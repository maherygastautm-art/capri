// Dessin vectoriel de Capri (port de Figure.cs / Anim.cs) : repère 120 x 200, pieds au sol à y = 166, regard vers la droite.
// Style Capricorne : corps en éclats géométriques rose / rouge / vert / noir à contour violet,
// énorme crinière d'éclats rouges pailletés, deux mèches sur le visage, yeux en cibles.
var C = window.C || (window.C = {});

(function () {
  var W = 120, H = 200, GROUND = 166, FPS = 12;
  C.FIG = { W: W, H: H, GROUND: GROUND, FPS: FPS, PS: 400 };

  var COL = C.COL = {
    Black: '#0B0A10', Red: '#FF1E46', RedBack: '#B0122F', Pink: '#FF4F8B', Green: '#3CF06E', GreenBack: '#1F9E48', GreenMid: '#2FD25E',
    Shadow: '#5A0A3C', Purple: '#7B2CF0', Blue: '#1E6BFF', White: '#FFFFFF', Mouthin: '#5A0A1C', Volt: '#B46BFF'
  };
  // Palette de Vex, la rivale
  C.VEX = { Red: '#1EC8FF', RedBack: '#0E6E9A', Pink: '#8CF4FF', Green: '#FF2BD6', GreenBack: '#A01488', GreenMid: '#D020B0', Purple: '#FCEE0A', Shadow: '#0A2F5A' };

  // ---------- petits outils vectoriels ----------
  function P(x, y) { return { x: x, y: y }; }
  function add(a, b) { return P(a.x + b.x, a.y + b.y); }
  function sub(a, b) { return P(a.x - b.x, a.y - b.y); }
  function mul(a, k) { return P(a.x * k, a.y * k); }
  function len(a) { return Math.sqrt(a.x * a.x + a.y * a.y); }
  function norm(a) { var l = len(a); return l < 1e-9 ? P(0, 0) : P(a.x / l, a.y / l); }
  function pts(v) { var r = []; for (var i = 0; i < v.length; i += 2) r.push(P(v[i], v[i + 1])); return r; }
  function dir(a, b) { var d = sub(b, a); return len(d) < 0.01 ? P(0, 1) : norm(d); }
  // pseudo-aléatoire stable
  function R(i) { var v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); }
  C.vec = { P: P, add: add, sub: sub, mul: mul, len: len, norm: norm };

  // couleur résolue selon teinte (silhouette unie) ou palette (Vex)
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

  // éclat avec son contour violet décalé
  function shard(d, fill, edge, p) {
    if (edge) poly(d, edge, p.map(function (q) { return add(q, P(1.3, 1.3)); }));
    poly(d, fill, p);
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

  function atHead(d, p, fn) {
    var c = d.ctx;
    c.save();
    c.translate(p.Head.x, p.Head.y);
    c.rotate(p.Tilt * Math.PI / 180);
    fn();
    c.restore();
  }

  // lame anguleuse de a vers b, bords en dents de scie, pointe au bout
  function blade(a, b, wa, wb, tip) {
    var d = dir(a, b), n = P(-d.y, d.x), L = len(sub(b, a));
    function at(t, s) { return add(add(a, mul(d, L * t)), mul(n, s)); }
    return [add(a, mul(n, wa)), at(0.32, wa * 1.2), at(0.66, wb * 1.45), add(b, mul(n, wb * 0.7)), add(b, mul(d, tip)),
      sub(b, mul(n, wb * 0.85)), at(0.56, -wb * 1.15), at(0.24, -wa * 1.05), sub(a, mul(n, wa * 0.9))];
  }

  // ---------- corps ----------
  function leg(d, hip, kn, fo, main, dark, accent, edge) {
    shard(d, main, edge, blade(hip, kn, 6.2, 3.6, 3));
    shard(d, main, edge, blade(kn, fo, 3.6, 1.5, 2));
    var d1 = dir(hip, kn), n1 = P(-d1.y, d1.x), d2 = dir(kn, fo), n2 = P(-d2.y, d2.x), l1 = len(sub(kn, hip)), l2 = len(sub(fo, kn));
    function a1(t, s) { return add(add(hip, mul(d1, l1 * t)), mul(n1, s)); }
    function a2(t, s) { return add(add(kn, mul(d2, l2 * t)), mul(n2, s)); }
    poly(d, dark, [a1(0.18, 5.2), a1(0.7, 4.2), a1(0.42, 1.2)]);
    poly(d, accent, [a1(0.35, -5.6), a1(0.62, -3.2), a1(0.86, -4.4), a1(0.6, -1.2)]);
    poly(d, dark, [add(kn, mul(n2, 3.6)), add(add(kn, mul(d2, 6)), mul(n2, 1)), sub(kn, mul(n2, 2.4))]);
    poly(d, dark, [a2(0.5, -2.4), a2(0.78, -1.2), a2(0.6, 0.6)]);
  }

  function foot(d, f, fill, edge) {
    shard(d, fill, edge, pts([f.x - 3.5, f.y - 7, f.x + 1.5, f.y - 6, f.x + 13, f.y + 0.2, f.x + 2, f.y - 0.5, f.x - 3, f.y + 0.4]));
    poly(d, COL.Black, pts([f.x - 3.8, f.y - 4.5, f.x - 2.2, f.y + 0.4, f.x - 1.2, f.y - 3.5]));
  }

  function claw(d, el, ha, fill) {
    var dv = dir(el, ha), n = P(-dv.y, dv.x);
    poly(d, fill, [sub(ha, mul(n, 1.8)), sub(add(ha, mul(dv, 3)), mul(n, 1.2)), add(add(ha, mul(dv, 3)), mul(n, 1.2)), add(ha, mul(n, 1.8))]);
    for (var i = -1; i <= 2; i++) {
      var a = (i - 0.5) * 0.34;
      var fd = add(mul(dv, Math.cos(a)), mul(n, Math.sin(a))), fn = P(-fd.y, fd.x);
      var b = add(add(ha, mul(dv, 2.5)), mul(n, (i - 0.5) * 0.9));
      poly(d, fill, [add(b, mul(fn, 0.6)), add(b, mul(fd, i === 2 ? 4.5 : 7.5)), sub(b, mul(fn, 0.6))]);
    }
  }

  function arm(d, sh, el, ha, main, dark, edge) {
    shard(d, main, edge, blade(sh, el, 2.8, 1.9, 1.5));
    shard(d, main, edge, blade(el, ha, 1.9, 1.1, 1.5));
    var dv = dir(el, ha), n = P(-dv.y, dv.x), l = len(sub(ha, el));
    poly(d, dark, [add(add(el, mul(dv, l * 0.25)), mul(n, 1.6)), add(add(el, mul(dv, l * 0.7)), mul(n, 0.4)), sub(add(el, mul(dv, l * 0.45)), mul(n, 0.8))]);
    claw(d, el, ha, main);
  }

  function neck(d, p, green, dark) {
    var a = add(p.Neck, mul(sub(p.Neck, p.Hip), -0.06)), b = add(p.Head, P(0, 8)), dv = dir(a, b), n = P(-dv.y, dv.x), ab = sub(b, a);
    poly(d, green, [add(a, mul(n, 2.6)), add(add(a, mul(ab, 0.5)), mul(n, 1.4)), add(b, mul(n, 2.2)), sub(b, mul(n, 2.2)), sub(add(a, mul(ab, 0.45)), mul(n, 1.8)), sub(a, mul(n, 2.8))]);
    poly(d, dark, [sub(add(a, mul(ab, 0.2)), mul(n, 1.6)), add(add(a, mul(ab, 0.6)), mul(n, 0.4)), sub(add(a, mul(ab, 0.75)), mul(n, 1.4))]);
  }

  function torso(d, p, edge) {
    var u = sub(p.Hip, p.Neck), L = len(u);
    if (L < 1) return;
    u = norm(u);
    var n = P(-u.y, u.x);
    function at(t, s) { return add(add(p.Neck, mul(u, L * t)), mul(n, s)); }
    shard(d, col(d, 'Red'), edge, [at(-0.02, 3), at(0.1, 6.4), at(0.3, 4.4), at(0.5, 2.6), at(0.72, 6.6), at(0.96, 8.2), at(1.1, 1),
      at(0.98, -8.6), at(0.8, -7.6), at(0.6, -3.1), at(0.42, -5.2), at(0.29, -9), at(0.15, -7.2), at(0.02, -3)]);
    poly(d, col(d, 'Green'), [at(-0.02, 3), at(0.1, 6.4), at(0.3, 4.4), at(0.46, 2.6), at(0.34, 0.4), at(0.12, 1.2)]);
    poly(d, col(d, 'Green'), [at(0.19, -7.6), at(0.31, -3.6), at(0.37, -8.6)]);
    poly(d, d.tint || COL.Black, [at(0.5, 2.6), at(0.6, -3.1), at(0.7, -0.6), at(0.6, 4)]);
    poly(d, d.tint || COL.Black, [at(0.8, 6.6), at(0.98, 8.2), at(1.08, 0.4), at(0.9, 2.4)]);
    poly(d, col(d, 'Pink'), [at(0.74, -6.8), at(0.92, -8.4), at(0.84, -3.2)]);
    poly(d, d.tint || COL.Black, [at(0.22, -2.5), at(0.36, -1.2), at(0.27, 1.5)]);
  }

  // ---------- crinière ----------
  // Crinière dessinée (img/hair.png, 190 x 154 unités) : la tête de Capri est au point (99.75, 88.97) de l'image
  var HAIR = { w: 190, h: 154, x: 99.75, y: 88.97 }, hairImg = new Image(), hairTinted = {};
  hairImg.src = 'img/hair.png';
  // silhouette de la crinière dans une seule couleur (fantômes, Vex)
  function hairOf(color) {
    if (!color) return hairImg;
    if (!hairTinted[color]) {
      var c = document.createElement('canvas');
      c.width = hairImg.naturalWidth; c.height = hairImg.naturalHeight;
      var x = c.getContext('2d');
      x.drawImage(hairImg, 0, 0);
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
      hairTinted[color] = c;
    }
    return hairTinted[color];
  }
  // la crinière suit la tête, ondule un peu et part vers l'arrière pendant le sprint
  function hair(d, p) {
    if (!hairImg.complete || !hairImg.naturalWidth) { hairShards(d, p); return; }
    var flow = norm(p.ScarfDir), a0 = -p.Tilt * Math.PI / 180;
    flow = P(flow.x * Math.cos(a0) - flow.y * Math.sin(a0), flow.x * Math.sin(a0) + flow.y * Math.cos(a0));
    var drift = (p.ScarfStretch - 1) * 14, img = hairOf(d.tint || (d.pal && d.pal.Red));
    atHead(d, p, function () {
      var c = d.ctx;
      c.save();
      c.translate(flow.x * drift, flow.y * drift);
      // en plus de suivre la tête, elle accentue son inclinaison et se balance doucement
      c.rotate((Math.sin(p.ScarfPhase * 0.6) * 3 + p.Tilt * 0.35) * Math.PI / 180);
      c.scale(1 + (p.ScarfStretch - 1) * 0.12, 1);
      c.drawImage(img, -HAIR.x, -HAIR.y, HAIR.w, HAIR.h);
      c.restore();
    });
  }

  // ancienne crinière en éclats (affichée seulement le temps que l'image se charge)
  function hairShards(d, p) {
    var flow = norm(p.ScarfDir), a0 = -p.Tilt * Math.PI / 180;
    flow = P(flow.x * Math.cos(a0) - flow.y * Math.sin(a0), flow.x * Math.sin(a0) + flow.y * Math.cos(a0));
    var stretch = 3 + (p.ScarfStretch - 1) * 20, o = P(-2, -20);
    function polar(deg, r, fl) { var a = deg * Math.PI / 180; return add(add(o, P(Math.cos(a) * r, Math.sin(a) * r)), mul(flow, stretch * fl)); }
    atHead(d, p, function () {
      var shards = [], core = [], i;
      for (i = 0; i < 16; i++) {
        var dg = i * 360 / 16, upc = Math.max(0, -Math.sin(dg * Math.PI / 180));
        core.push(polar(dg, 26 + upc * 14 + R(i + 900) * 8, 0.15));
      }
      shards.push(core);
      var n = 12;
      for (i = 0; i < n; i++) {
        var deg = -206 + i * (232 / (n - 1)) + (R(i) - 0.5) * 10 + Math.sin(p.ScarfPhase * 0.6 + i * 1.7) * 1.5;
        var up = Math.max(0, -Math.sin(deg * Math.PI / 180)), L = 36 + R(i + 10) * 16 + up * 26, w = 13 + R(i + 20) * 7, fl = 0.4 + R(i + 40);
        shards.push([polar(deg - w, 20, 0.1), polar(deg - w * 0.9, L * 0.7, fl * 0.6), polar(deg - w * 0.45, L * 0.82, fl * 0.7), polar(deg - w * 0.2, L, fl),
          polar(deg + w * 0.25, L * 0.78, fl * 0.75), polar(deg + w * 0.55, L * 0.9, fl * 0.8), polar(deg + w * 0.8, L * 0.6, fl * 0.55), polar(deg + w, 20, 0.1)]);
      }
      [[160, 46, 8], [145, 40, 7], [172, 34, 6], [30, 42, 7], [45, 34, 6]].forEach(function (f, k) {
        var dg2 = f[0] + Math.sin(p.ScarfPhase * 0.7 + k) * 2;
        shards.push([polar(dg2 - f[2], 18, 0.1), polar(dg2 - f[2] * 0.3, f[1] * 0.7, 0.5), polar(dg2, f[1], 0.9), polar(dg2 + f[2] * 0.4, f[1] * 0.6, 0.45), polar(dg2 + f[2], 18, 0.1)]);
      });
      var red = col(d, 'Red'), shade = col(d, 'Purple');
      shards.forEach(function (s) { poly(d, shade, s.map(function (q) { return add(q, P(2, 2.4)); })); });
      shards.forEach(function (s) { poly(d, red, s); });
      [-150, -96, -40, 8, 120].forEach(function (lg, s) {
        var dg3 = lg + Math.sin(p.ScarfPhase * 0.8 + s) * 3, m = polar(dg3, 66 + R(s + 70) * 10, 1.3);
        var dv = P(Math.cos(dg3 * Math.PI / 180), Math.sin(dg3 * Math.PI / 180)), nv = P(-dv.y, dv.x), o15 = P(1.5, 1.5);
        poly(d, shade, [add(add(m, mul(nv, 2.6)), o15), add(add(m, mul(dv, 9)), o15), add(sub(m, mul(nv, 1.8)), o15)]);
        poly(d, red, [add(m, mul(nv, 2.6)), add(m, mul(dv, 9)), sub(m, mul(nv, 1.8))]);
      });
      if (!d.tint) {
        for (var s = 0; s < 6; s++) {
          var dg4 = -190 + s * 38 + R(s + 500) * 14, r0 = 16 + R(s + 510) * 10, r1 = r0 + 12 + R(s + 520) * 10;
          poly(d, COL.Black, [polar(dg4, r0, 0.3), polar(dg4 + 4, r1, 0.5), polar(dg4 - 3, (r0 + r1) / 2, 0.4)], 0.75);
        }
        var flick = Math.floor(p.ScarfPhase * 2);
        for (s = 0; s < 170; s++) {
          if ((s + flick) % 7 === 0) continue;
          var dg5 = -210 + R(s + 100) * 240, r = 6 + R(s + 200) * (40 + Math.max(0, -Math.sin(dg5 * Math.PI / 180)) * 24);
          var mm = polar(dg5, r, 0.5), z = 0.4 + R(s + 300) * 0.8;
          poly(d, COL.White, [P(mm.x, mm.y - z), P(mm.x + z, mm.y), P(mm.x, mm.y + z), P(mm.x - z, mm.y)], 0.5 + R(s + 400) * 0.5);
        }
      }
    });
  }

  // ---------- tête ----------
  function eyes(d, face) {
    var ex = [-7.5, 9], ey = [-4.5, -5.5], B = COL.Black, G = col(d, 'Green');
    for (var i = 0; i < 2; i++) {
      var x = ex[i], y = ey[i];
      if (face === 1) { line(d, B, 1.8, [x - 4.5, y + 1.5, x, y - 2.8, x + 4.5, y + 1.5]); line(d, G, 0.8, [x - 3.6, y + 2.6, x, y - 0.6, x + 3.6, y + 2.6]); }
      else if (face === 2) line(d, B, 1.8, [x - 4.5, y + 0.5, x + 4.5, y + 0.5]);
      else if (face === 4) {
        disc(d, B, x, y, 5.6);
        var sp = [];
        for (var k = 0; k <= 24; k++) { var a = k * 0.6 + i * 3, r = 0.2 + k * 0.19; sp.push(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        line(d, G, 0.9, sp);
      } else {
        // yeux de chat : amande noire pointue des deux côtés, trait qui remonte au coin extérieur,
        // fin anneau vert, anneau noir, iris bleu foncé puis bleu clair, pupille grise
        var k = (face === 3 ? 1.15 : 1) * 0.85, s = x < 0 ? -1 : 1, c = d.ctx;
        var X = function (u) { return x + u * k; }, Y = function (v) { return y + v * k; };
        c.beginPath();
        c.moveTo(X(-s * 7.6), Y(0.3));
        c.quadraticCurveTo(X(-s * 0.5), Y(-10), X(s * 7.8), Y(-1));
        c.quadraticCurveTo(X(s * 1), Y(9.5), X(-s * 7.6), Y(0.3));
        c.fillStyle = B; c.fill();
        poly(d, B, [P(X(s * 3), Y(-5)), P(X(s * 10.5), Y(-6.5)), P(X(s * 7), Y(-2.5))]);
        disc(d, G, x, y, 4.4 * k); disc(d, B, x, y, 3.85 * k);
        disc(d, '#24479E', x, y, 3.2 * k); disc(d, '#3A6FD8', x, y, 2.4 * k);
        disc(d, '#C9CBD6', x, y, (face === 3 ? 1.0 : 1.35) * k);
      }
    }
  }

  function mouth(d, open) {
    var m = open * 3.2;
    if (m > 0.4) poly(d, COL.Mouthin, pts([-6, 6, 10, 5, 9, 7 + m, -5, 8 + m]));
    line(d, COL.White, 0.7, [-6.5, 6, -4, 4, -1.5, 7, 1, 4, 3.5, 7, 6, 4.2, 8.5, 6.6, 10.5, 4.6]);
    if (m > 0.4) line(d, COL.White, 0.7, [-5, 8 + m, -2, 6 + m, 1, 8.6 + m, 4, 6 + m, 7, 8.2 + m, 9, 6.6 + m]);
  }

  function headPart(d, p) {
    atHead(d, p, function () {
      var black = d.tint || COL.Black, green = col(d, 'Green'), red = col(d, 'Red');
      poly(d, black, pts([-6, -11, -15, -36, 1, -13]));
      poly(d, black, pts([5, -12, 21, -30, 12, -8]));
      poly(d, black, pts([-12, -5, -31, -12, -11, 2]));
      poly(d, black, pts([12, -3, 33, -8, 11, 4]));
      poly(d, black, pts([-15, 0, -26, 10, -11, 5]));
      poly(d, black, pts([-16, -12, 15, -15, 18, -3, 14, 3, -13, 4, -18, -4]));
      poly(d, green, pts([-15, -10, -1.5, -12.5, -0.5, 0.5, -12, 2, -17, -4]));
      poly(d, green, pts([2.5, -13.5, 14.5, -14, 17.5, -4, 13.5, 1, 3, 0.5]));
      poly(d, black, pts([-12, 2, 13, 0.5, 16, 4, 8, 13, -3, 16, -11, 9]));
      // les deux mèches qui tombent sur le visage
      if (!d.tint) poly(d, col(d, 'Purple'), pts([1.2, -25, 7.6, -23, 2.2, -9, -1.4, 4]));
      poly(d, red, pts([0, -26, 6.4, -24, 1, -10, -2.6, 3.2]));
      poly(d, black, pts([5.5, -24, 11, -21, 5.2, -11, 2.8, -1]));
      if (!d.tint) { eyes(d, p.Face); mouth(d, p.Mouth); }
    });
  }

  // Dessine Capri dans ctx (repère figure). tint : silhouette unie ; pal : palette de remplacement (Vex)
  C.drawFigure = function (ctx, p, tint, pal, alpha) {
    var d = { ctx: ctx, tint: tint || null, pal: pal || null, alpha: alpha == null ? 1 : alpha };
    var edge = d.tint ? null : col(d, 'Purple');
    ctx.save();
    ctx.globalAlpha = d.alpha;
    hair(d, p);
    arm(d, p.ShB, p.ElB, p.HaB, col(d, 'GreenBack'), d.tint || COL.Black, edge);
    leg(d, add(p.Hip, P(-3, 0)), p.KnB, p.FoB, col(d, 'GreenMid'), d.tint || COL.Black, col(d, 'GreenBack'), edge);
    foot(d, p.FoB, d.tint || COL.Black, edge);
    torso(d, p, edge);
    neck(d, p, col(d, 'Green'), d.tint || COL.Black);
    leg(d, add(p.Hip, P(3, 0)), p.KnF, p.FoF, col(d, 'Red'), d.tint || COL.Black, col(d, 'Pink'), edge);
    foot(d, p.FoF, col(d, 'Red'), edge);
    headPart(d, p);
    arm(d, p.ShF, p.ElF, p.HaF, col(d, 'Green'), d.tint || COL.Black, edge);
    ctx.restore();
  };

  // ---------- gros plan (apparition buggée), repère 400 x 400 ----------
  function bigEye(d, x, y, closed) {
    if (closed) {
      line(d, COL.Black, 7, [x - 19, y - 11, x + 17, y + 11]);
      line(d, COL.Black, 7, [x - 17, y + 12, x + 19, y - 10]);
      return;
    }
    disc(d, COL.Black, x, y, 27); disc(d, null, x, y, 22, COL.Green, 5); disc(d, COL.Black, x, y, 16);
    disc(d, COL.Blue, x, y, 12.5); disc(d, null, x, y, 12.5, COL.Black, 2); disc(d, COL.White, x + 1, y - 1, 5.5);
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
    [[150, 162, 182, 145, 70, 70], [190, 142, 216, 143, 250, 15], [232, 148, 248, 151, 292, 62], [242, 152, 262, 168, 348, 98], [264, 188, 268, 212, 372, 214], [132, 198, 140, 222, 38, 190]].forEach(function (h) {
      poly(d, k('Purple'), pts([h[0] + 5, h[1] + 5, h[2] + 5, h[3] + 5, h[4] + 5, h[5] + 5]));
      poly(d, k('Black'), pts(h));
    });
    poly(d, k('Green'), pts([135, 165, 205, 148, 262, 152, 280, 190, 262, 212, 200, 222, 140, 228, 122, 198]));
    poly(d, k('Black'), pts([211, 146, 220, 147, 192, 226, 184, 224]));
    poly(d, k('Black'), pts([132, 222, 205, 215, 270, 205, 262, 240, 225, 272, 175, 282, 145, 258]));
    // les deux mèches sur le visage
    poly(d, k('Purple'), pts([186, 104, 212, 108, 206, 170, 196, 228]));
    poly(d, k('Red'), pts([180, 100, 206, 104, 200, 168, 190, 224]));
    poly(d, k('Black'), pts([214, 96, 240, 112, 214, 160, 206, 214]));
    if (!tint) {
      bigEye(d, 162, 190, false);
      bigEye(d, 244, 184, wink);
      poly(d, COL.Black, pts([248, 208, 266, 216, 242, 216]));
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
  // Voguing (Street Cred 3)
  function voguing(t) {
    var p = stand();
    p.Face = 1;
    switch (Math.floor(t * 3) % 4) {
      case 0: p.HaF = P(70, 44); p.ElF = P(84, 58); p.HaB = P(52, 44); p.ElB = P(38, 58); p.Tilt = -6; break;
      case 1: p.HaF = P(92, 72); p.ElF = P(80, 62); p.HaB = P(36, 90); p.ElB = P(44, 78); moveUpper(p, 2, 0); break;
      case 2: p.HaF = P(62, 60); p.ElF = P(80, 70); p.HaB = P(30, 52); p.ElB = P(40, 64); p.Tilt = 8; p.FoF = P(76, 165); break;
      default: p.HaF = P(86, 34); p.ElF = P(76, 50); p.HaB = P(56, 98); p.ElB = P(48, 84); p.Hip.x -= 3; moveUpper(p, -2, 0);
    }
    p.KnF = bend(add(p.Hip, P(3, 0)), p.FoF, 61, 1);
    p.KnB = bend(add(p.Hip, P(-3, 0)), p.FoB, 61, 1);
    return p;
  }
  // Breakdance (Street Cred 6)
  function breakdance(t) {
    var p = pose(), k = Math.floor(t * 4) % 4;
    p.Face = 1;
    p.Hip = P(58, 132); p.Neck = P(68, 106); p.Head = P(75, 90);
    p.ShF = P(70, 110); p.ShB = P(64, 108);
    p.HaF = P(84, 165); p.ElF = bend(p.ShF, p.HaF, 34, -1);
    p.HaB = k % 2 === 0 ? P(40, 96) : P(46, 120); p.ElB = bend(p.ShB, p.HaB, 34, -1);
    p.FoF = [P(26, 150), P(40, 165), P(92, 150), P(70, 165)][k];
    p.FoB = [P(80, 165), P(18, 140), P(44, 165), P(28, 128)][k];
    p.KnF = bend(add(p.Hip, P(3, 0)), p.FoF, 61, 1);
    p.KnB = bend(add(p.Hip, P(-3, 0)), p.FoB, 61, 1);
    p.Tilt = k % 2 === 0 ? 10 : -4; p.ScarfDir = P(-1, -0.4); p.ScarfStretch = 1.3;
    return p;
  }
  // Glitch (Street Cred 10)
  function glitchDance(t) {
    var p = stand(), f = Math.floor(t * 12);
    function j(i) { var v = Math.sin((f + i * 7) * 12.9898) * 43758.5453; return v - Math.floor(v) - 0.5; }
    p.Face = f % 9 === 0 ? 3 : 1;
    moveUpper(p, j(1) * 10, j(2) * 6);
    p.Hip.x += j(3) * 6; p.Tilt = j(4) * 30;
    p.HaF = P(70 + j(5) * 40, 60 + j(6) * 50); p.HaB = P(48 + j(7) * 40, 60 + j(8) * 50);
    p.FoF = P(68 + j(9) * 16, 165); p.FoB = P(52 + j(10) * 16, 165);
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
      case 'dance2': p = voguing(t); break;
      case 'dance3': p = breakdance(t); break;
      case 'dance4': p = glitchDance(t); break;
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
