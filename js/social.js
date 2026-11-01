// Amis, carte du monde (style Netwatch) et piratages entre amis — même format que la version PC (src/Buddies.cs) :
// message "F1:" + JSON { t: req|ok|up|hack|del, from, code, skin, lvl, ice, hack, city, lat, lon, win } envoyé dans la boîte du code ami.
// La position n'est envoyée que si on a choisi d'apparaître sur la carte, et seulement la ville (coordonnées arrondies à ~10 km).
var C = window.C || (window.C = {});

(function () {
  var data = C.data, COOLDOWN = 10 * 60, WEEK = 7 * 24 * 3600;
  var pending = null, pendingTimer = 0, duelActive = false;
  ['buddies', 'requests', 'asked'].forEach(function (k) { if (!Array.isArray(data[k])) data[k] = []; });
  if (!data.ice) data.ice = 1;
  if (data.hackable === undefined) data.hackable = true;

  // masque terre/mer 180 x 84 (Natural Earth 110m), un bit par point, latitudes +84 à -84
  var MASK = 'AAAAAAAA/gHwPwAAAAAAAAAAAAAAAAAAAAAAgP7P//9/AAAAAAAAIAAAAAAAAAAAAGC4D////wAAHwAAAAA8AAAAAAAAAAAMQD78//8fAEAAAAAAAAYAAAAAAAAAABz1A+D//wAAAADAAOD/A4AbAAAAAAAX0d4A/P8HAAAAAAPA//83AAAAARgAkD/MPwD/XwAAwAAguP///////wfw/////////////38A/48EAAAAAAAE+P//////////////AYACQAAAAAAAADD//////////////w+GAgAAAAAAAAAAAP////8fwAIeAADA5////////////w/4+///f4AHwAEAAH7+/////////08PAB7g//8HeAIAAADgx/////////9BBACAAPj//wF/AAAAGDT+////////B/AAAAEA/v//+R8AAMBB8P///////z8ABwAAAOD//5//AwAANv//////////PxAAAAAA/P///z8AAAD7//////////8CAAAAAID+//8vBgAA4P//////////LwAAAAAA8P///4MAAAD+/////////38CAAAAAAD///9vAAAA4O+fPv//////AwAAAAAA8P//fwAAAOCP+cDz/////x8DAAAAAAD///8DAAAAPGTvf/7///9/EAAAAAAA8P//DwAAAOADtP/n////HwIBAAAAAAD+//8AAAAAGC7wf/7///9nDAAAAAAAwP//DwAAAIB/QPT/////P/IAAAAAAAD4/z8AAAAA/A8A//////+DAQAAAAAAAP//AQAAAOD/9/7/////fwAAAAAAAADAPyAAAAAA/v//v/////8HAAAAAAAAAPoBAgAAAPj///fn////PwAAAAAAAABAHwAAAACA//9//oL///8DAAAAAAAAAOABAwAAAPz//+//4P//TwAAAAAAAAAAHoYAAADg/////Qf+8w8AAAAAAAAAAMAzQAAAAPz//59/wA9+AQAAAAAAAAAA8AMAAADA////+QF44A8EAAAAAAAAAADwAAAAAP7//78HgAP4QAAAAAAAAAAAAAwAAADA////FwA4gB8EAAAAAAAAAACA8AAAAPz///8MAAPIAAEAAAAAAAAAAFD/AACA////fwBQgAQAAAAAAAAAAAAA+B8AAPD///8HAAQAAAEAAAAAAAAAAID/DwAAFv7/PwAAQIMBAAAAAAAAAAAA+P8BAACA//8BAAAoHAAAAAAAAAAAAMD/HwAAAPj/DwAAgOEFAAAAAAAAAAAA/P8HAADA/38AAAAwHhgAAAAAAAAAAMD//wMAAPj/AwAAAOZGHQAAAAAAAAAA/v//AAAA/z8AAABAgIAHAAAAAAAAAMD//x8AAPD/AwAAADgA+BAAAAAAAAAA+P//AAAA/z8AAAAAEAELBAAAAAAAAID//wcAAOD/AwAAAAAAAAAAAAAAAAAA8P9/AAAA/z8EAAAAADgCAAAAAAAAAAD//wcAAPD/QwAAAADwYwACAAAAAAAAwP8/AAAA/x8HAAAAgH8GAAAAAAAAAAD4/wMAAPD/cAAAAAD4fwAAAAAAAAAAgP8/AAAA/g8DAAAA8P8fEAAAAAAAAAD4/wAAAOD/MAAAAID//wEAAAAAAAAAgP8DAAAA/gcBAAAA+P8/AAAAAAAAAAD4PwAAAMA/AAAAAID//wcAAAAAAAAAwP8BAAAA/AMAAAAA+P9/AAAAAAAAAAD8HwAAAIAfAAAAAAD//wcAAAAAAAAAwP8AAAAA+AAAAAAA8OA/AAAAAAAAAAD8AQAAAAAAAAAAAAAB+AEQAAAAAAAA4D8AAAAAAAAAAAAAAAAfAAIAAAAAAAB+AAAAAAAAAAAAAAAAAABgAAAAAAAA4AUAAAAAAAAAAAAAAAAMAAMAAAAAAAA8AAAAAAAAAAAAAAAAgAAYAAAAAAAA4AEAAAAAAAAAAAAAAAAAwAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAEAAAAAAAAAAAAAAAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAgAcABP/5fwAAAAAAAAAAAAMAAAAAAMj/H/7/////AAAAAAAAAAB8AAAAgP/////8//////8DAAAAAMAhAA8AAPj/////////////fwAAAP//8v8/AADg//////////////8BAID/////BwAA+P//////////////DwAg/////38A4PD///////////////8AAAD/////fwAB////////////////AwAA/v////////////////////////8B';

  function now() { return Math.floor(Date.now() / 1000); }
  function clean(c) { return C.friends.clean(c || ''); }
  function name(b) { return b.name || b.code; }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function hasPlace(b) { return !!b.city && num(b.lat) !== null && num(b.lon) !== null; }
  function canHack(b) { return b.hack !== false && b.hack !== '0'; }
  function ice(b) { return Math.max(1, Math.min(10, parseInt(b.ice, 10) || 1)); }
  function changed() { C.save(); if (C.worldMap.isOpen()) C.worldMap.refresh(); renderRequests(); }

  // ---------- alertes : bandeau rouge + Capri + notification du téléphone (si autorisée) ----------
  C.alert = function (title, text) {
    var b = el('div', 'alertbar', '<b></b><span></span>');
    b.querySelector('b').textContent = title;
    b.querySelector('span').textContent = text;
    b.addEventListener('click', function () { b.remove(); });
    var stack = document.getElementById('alerts');
    if (!stack) { stack = el('div'); stack.id = 'alerts'; document.body.appendChild(stack); }
    stack.appendChild(b);
    setTimeout(function () { b.classList.add('out'); setTimeout(function () { b.remove(); }, 400); }, 9000);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    C.say(text, title);
    if (C.voice && data.cfg.voice) C.voice.speak(text);
    if (window.Notification && Notification.permission === 'granted' && navigator.serviceWorker)
      navigator.serviceWorker.ready.then(function (reg) { reg.showNotification('Capri — ' + title, { body: text, icon: 'icons/icon-192.png', tag: 'capri-' + title, renotify: true }); }).catch(function () { });
  };

  // ---------- piratage subi : texte buggé « VOUS AVEZ ÉTÉ PIRATÉ » qui apparaît puis disparaît ----------
  C.hackedText = function (done) {
    var TXT = 'VOUS AVEZ ÉTÉ PIRATÉ', TOTAL = 3.4;
    var box = el('div', 'hacked', '<div class="hk-t"><span class="c"></span><span class="r"></span><span class="m"></span></div><div class="hk-bar"><i></i></div><div class="hk-s"></div>');
    box.querySelectorAll('.hk-t span').forEach(function (s) { s.textContent = TXT; });
    box.querySelector('.hk-s').textContent = '> ICE COMPROMIS // NETWATCH TRACE 0x' + Math.floor(Math.random() * 0xFFFFFFF).toString(16).toUpperCase();
    // tranches qui glissent
    for (var i = 0; i < 3; i++) { var s = el('div', 'hk-slice'); s.textContent = TXT; box.querySelector('.hk-t').appendChild(s); }
    document.body.appendChild(box);
    if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 200]);
    var t0 = performance.now(), c = box.querySelector('.c'), r = box.querySelector('.r'), m = box.querySelector('.m'), slices = box.querySelectorAll('.hk-slice');
    var iv = setInterval(function () {
      var t = (performance.now() - t0) / 1000;
      if (t >= TOTAL) { clearInterval(iv); box.remove(); if (done) done(); return; }
      var on = t < 0.5 ? Math.random() < t / 0.5 + 0.15 : t > TOTAL - 0.7 ? Math.random() > (t - (TOTAL - 0.7)) / 0.7 : Math.random() > 0.06;
      var heavy = t < 0.5 ? 1 : t > TOTAL - 0.7 ? 0.8 : (Math.random() < 0.15 ? 0.7 : 0.15), dx = (Math.random() - 0.5) * 18 * heavy;
      box.style.opacity = on ? 1 : 0.15;
      c.style.transform = 'translate(' + (-3 - 8 * heavy + dx) + 'px,' + (Math.random() - 0.5) * 3 + 'px)';
      r.style.transform = 'translate(' + (3 + 8 * heavy - dx) + 'px,' + (Math.random() - 0.5) * 3 + 'px)';
      m.style.opacity = Math.random() < 0.08 ? 0.3 : 1;
      slices.forEach(function (s) {
        if (Math.random() > 0.35 * heavy + 0.05) { s.style.display = 'none'; return; }
        var y = Math.random() * 80, h = 6 + Math.random() * 25;
        s.style.display = 'block';
        s.style.clipPath = 'inset(' + y + '% 0 ' + Math.max(0, 100 - y - h) + '% 0)';
        s.style.transform = 'translateX(' + (Math.random() - 0.5) * 50 * heavy + 'px)';
      });
      box.querySelector('.hk-bar i').style.width = Math.min(100, t / 1.2 * 100) + '%';
    }, 42);
  };

  // ---------- demandes d'ami : cartes en haut à droite, jusqu'à accepter / refuser ----------
  function renderRequests() {
    var box = document.getElementById('freqs');
    if (!box) { box = el('div'); box.id = 'freqs'; document.body.appendChild(box); }
    box.innerHTML = '';
    data.requests.forEach(function (r) {
      var c = el('div', 'freq', '<div class="fq-h">DEMANDE D\'AMI // NETWATCH</div><div class="fq-n"></div><div class="fq-i"></div><div class="fq-a"></div>');
      c.querySelector('.fq-n').textContent = name(r).toUpperCase();
      c.querySelector('.fq-i').textContent = 'LVL ' + (r.lvl || 1) + ' · ICE ' + ice(r) + (r.city ? ' · ' + r.city : '');
      var y = el('button', 'btn yes', 'ACCEPTER'), n = el('button', 'btn', 'REFUSER');
      y.addEventListener('click', function () { buddies.accept(r); C.say(C.line('buddy.accepted', 'C\'est fait, vous êtes amis : {0}.', name(r))); });
      n.addEventListener('click', function () { buddies.refuse(r); });
      c.querySelector('.fq-a').appendChild(y); c.querySelector('.fq-a').appendChild(n);
      box.appendChild(c);
    });
  }
  setTimeout(renderRequests, 0);

  // ma fiche (ville seulement si j'ai choisi d'apparaître sur la carte)
  function me(type) {
    var d = { t: type, from: data.userName || 'Un choom', code: C.friends.myCode(), skin: C.cred.skin().id, lvl: C.cred.level(), ice: data.ice, hack: data.hackable !== false };
    if (data.onMap && data.city && (data.lat || data.lon)) { d.city = data.city; d.lat = Math.round(data.lat * 10) / 10; d.lon = Math.round(data.lon * 10) / 10; }
    return d;
  }
  function post(code, msg) { return C.friends.post(code, 'F1:' + JSON.stringify(msg)); }
  function byCode(code) { return data.buddies.filter(function (b) { return b.code === code; })[0] || null; }
  function find(q) {
    var n = C.norm(q), c = clean(q);
    return data.buddies.filter(function (b) { return b.code === c || C.norm(name(b)) === n; })[0]
      || (n.length >= 3 ? data.buddies.filter(function (b) { return C.norm(name(b)).indexOf(n) === 0; })[0] : null) || null;
  }
  function upsert(m) {
    var code = clean(m.code), b = byCode(code);
    if (!b) { b = { code: code }; data.buddies.push(b); }
    b.name = m.from || code; b.skin = m.skin || ''; b.lvl = m.lvl || 1; b.ice = m.ice || 1; b.hack = m.hack !== false;
    b.city = m.city || ''; b.lat = m.city ? m.lat : ''; b.lon = m.city ? m.lon : ''; b.seen = now();
    return b;
  }

  var buddies = C.buddies = {
    find: find, name: name, ice: ice, canHack: canHack, hasPlace: hasPlace,
    request: function (code) { code = clean(code); if (data.asked.indexOf(code) < 0) data.asked.push(code); C.save(); return post(code, me('req')); },
    accept: function (r) {
      data.requests.splice(data.requests.indexOf(r), 1);
      r.from = r.from || r.name;
      var b = upsert(r);
      post(b.code, me('ok'));
      C.unlock('friend');
      changed();
    },
    refuse: function (r) { data.requests.splice(data.requests.indexOf(r), 1); changed(); },
    remove: function (b) { data.buddies.splice(data.buddies.indexOf(b), 1); post(b.code, me('del')); changed(); },
    broadcast: function (force) {
      if (!force && now() - (data.lastBroadcast || 0) < 6 * 3600) return;
      data.lastBroadcast = now(); C.save();
      data.buddies.forEach(function (b) { post(b.code, me('up')); });
    },
    // l'ICE fond d'un niveau par semaine sans entraînement
    checkDecay: function () {
      var t = now(), dropped = 0;
      if (!data.iceStamp) { data.iceStamp = t; C.save(); return; }
      while (t - data.iceStamp >= WEEK) { if (data.ice > 1) { data.ice--; dropped++; } data.iceStamp += WEEK; }
      if (!dropped) return;
      C.save();
      C.alert('ICE EN FONTE', C.line('ice.decay', 'Ton ICE a fondu au niveau {0} faute d\'entretien. Dis « renforce l\'ICE » avant qu\'un ami en profite.', data.ice));
      buddies.broadcast(true);
      changed();
    },
    touchIce: function () { data.iceStamp = now(); C.save(); },
    daysBeforeDecay: function () { var l = (data.iceStamp || now()) + WEEK - now(); return l <= 0 ? 0 : Math.ceil(l / 86400); },
    waitMinutes: function (b) { var w = (b.lastHack || 0) + COOLDOWN - now(); return w <= 0 ? 0 : Math.ceil(w / 60); },
    duelActive: function () { return duelActive || (C.intrusion && C.intrusion.active()); },
    windowFor: function () { return 30; },   // même durée que le breach (app.js)
    // j'attaque : l'ami reçoit l'écran d'intrusion (dur = ma fenêtre)
    attack: function (b) { var m = me('atk'); m.dur = buddies.windowFor(ice(b)); post(b.code, m); },
    // fin de mon breach : j'envoie ma performance puis j'attends le verdict de l'ami
    attackResult: function (b, win, seconds) {
      b.lastHack = now();
      C.save();
      var m = me(win ? 'strike' : 'miss'); if (win) m.tm = Math.round(seconds * 100) / 100;
      post(b.code, m);
      pending = { b: b, win: win };
      duelActive = true;
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(function () {   // pas de verdict (ami hors ligne) : on garde notre résultat
        if (!pending) return;
        var p = pending; pending = null; duelActive = false;
        if (p.win) { buddies.win(p.b); C.reply(C.line('hack.win', 'On est dedans ! L\'ICE de {0} a cédé.', name(p.b))); }
        else C.reply(C.line('hack.fail', 'Tracée... l\'ICE de {0} nous a éjectées.', name(p.b)));
      }, win ? 40000 : 30000);
    },
    win: function (b) {
      data.hacksWon = (data.hacksWon || 0) + 1;
      C.cred.add(15 + 3 * ice(b));
      C.unlock('netrun');
      if (ice(b) >= 8) C.unlock('netrun8');
      b.ice = Math.max(1, ice(b) - 1);
      C.save(); changed();
    },
    // côté défenseur : applique le verdict chez moi et l'envoie à l'attaquant
    resolveDefense: function (code, defHacked, atkHacked) {
      var b = byCode(code);
      if (defHacked) data.ice = Math.max(1, data.ice - 1);
      else if (atkHacked && b) buddies.win(b);
      else { data.hacksBlocked = (data.hacksBlocked || 0) + 1; C.cred.add(10); C.unlock('wall'); }
      C.save();
      if (b) { var m = me('res'); m.defHacked = defHacked; m.atkHacked = atkHacked; post(code, m); }
      if (defHacked) buddies.broadcast(true);
      changed();
    },
    iceUp: function () {
      buddies.touchIce();
      if (data.ice < 10) data.ice++;
      C.cred.add(8);
      if (data.ice >= 5) C.unlock('ice5');
      if (data.ice >= 10) C.unlock('ice10');
      buddies.broadcast(true);
      changed();
    },
    handle: function (m) {
      var code = clean(m.code);
      if (!code || code === clean(C.friends.myCode())) return;
      var who = m.from || code, known = byCode(code);
      if (m.t === 'req') {
        if (known || data.asked.indexOf(code) >= 0) {
          data.asked = data.asked.filter(function (c) { return c !== code; });
          upsert(m); post(code, me('ok'));
          if (!known) { C.unlock('friend'); C.say(C.line('buddy.new', '{0} et toi, vous êtes amis maintenant.', who)); }
        } else {
          data.requests = data.requests.filter(function (r) { return clean(r.code) !== code; });
          var r = JSON.parse(JSON.stringify(m)); r.code = code; r.name = who;
          data.requests.push(r);
          if (navigator.vibrate) navigator.vibrate(150);
          C.say(C.line('buddy.req', '{0} veut devenir ton ami. Dis « accepte {0} » ou « refuse {0} ».', who));
        }
      } else if (m.t === 'atk') {
        if (!known || data.hackable === false || C.intrusion.active()) return;
        upsert(m);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        C.alert('ALERTE INTRUSION', C.line('hack.incoming', 'Alerte ! {0} est en train d\'attaquer ton ICE (niveau {1}) !', who, data.ice));
        var dur = parseFloat(m.dur); if (!(dur > 0)) dur = buddies.windowFor(data.ice);
        C.intrusion.show(known, Math.max(8, Math.min(40, dur)));
      } else if (m.t === 'strike' || m.t === 'miss') {
        if (!known) return;
        var w2 = m.t === 'strike', tm = parseFloat(m.tm); if (!(tm > 0)) tm = 999;
        if (C.intrusion.active() && C.intrusion.code() === code) C.intrusion.attacker(w2, tm);
        else if (data.hackable !== false) passiveDefense(code, who, w2);
      } else if (m.t === 'res') {
        if (!pending || clean(pending.b.code) !== code) return;
        clearTimeout(pendingTimer);
        var p = pending; pending = null; duelActive = false;
        if (m.atkHacked) {
          data.ice = Math.max(1, data.ice - 1); C.save();
          var cl = C.line('hack.countered', 'Contre-piratage ! {0} a été plus rapide et a percé ton ICE (niveau {1}).', who, data.ice);
          C.ui.closePanel(); C.hackedText(function () { C.alert('VOUS AVEZ ÉTÉ PIRATÉ', cl); });
          buddies.broadcast(true);
        } else if (m.defHacked && p.win) {
          buddies.win(p.b); C.reply(C.line('hack.win', 'On est dedans ! L\'ICE de {0} a cédé.', who)); C.stage.dance();
        } else C.reply(C.line('hack.fail', 'Tracée... l\'ICE de {0} nous a éjectées.', who));
      } else if (m.t === 'ok') {
        if (!known && data.asked.indexOf(code) < 0) return;
        data.asked = data.asked.filter(function (c) { return c !== code; });
        upsert(m);
        if (!known) { C.unlock('friend'); C.say(C.line('buddy.ok', '{0} a accepté ta demande d\'ami !', who)); }
      } else if (m.t === 'up') {
        if (!known) return;
        upsert(m);
      } else if (m.t === 'del') {
        if (known) data.buddies.splice(data.buddies.indexOf(known), 1);
      } else if (m.t === 'hack') {   // ancienne version de Capri chez l'ami
        if (!known || data.hackable === false) return;
        upsert(m); passiveDefense(code, who, !!m.win);
      } else return;
      changed();
    }
  };

  // piratage subi sans écran (Capri était en arrière-plan pendant l'attaque)
  function passiveDefense(code, who, struck) {
    buddies.resolveDefense(code, struck, false);
    if (struck) {
      var lost = C.line('hack.lost', '{0} a percé ton ICE. Il est tombé au niveau {1}. Dis « renforce l\'ICE » pour le remonter.', who, data.ice);
      C.ui.closePanel(); C.hackedText(function () { C.alert('VOUS AVEZ ÉTÉ PIRATÉ', lost); });
    } else C.alert('ATTAQUE BLOQUÉE', C.line('hack.blocked', '{0} a tenté de pirater ton ICE... et s\'est fait tracer. Ton ICE a tenu !', who));
  }

  // ---------- jeux ----------
  C.netrun = function (b) {
    if (data.buddies.indexOf(b) < 0) return;
    if (!canHack(b)) { C.reply(name(b) + ' a désactivé les piratages entre amis.'); return; }
    var w = buddies.waitMinutes(b);
    if (w > 0) { C.reply('Son ICE est en alerte après ta dernière tentative. Réessaie dans ' + w + ' min.'); return; }
    C.sys('connexion à l\'ICE de ' + name(b) + ' (niveau ' + ice(b) + ')...');
    buddies.attack(b);   // l'ami reçoit l'écran d'intrusion
    C.game.start(ice(b), name(b), function (res, sec) {
      // le verdict final vient de l'ami (il peut contre-pirater : le plus rapide gagne)
      buddies.attackResult(b, res > 0, sec || 0);
      C.sys(res > 0 ? 'séquence injectée en ' + (sec || 0).toFixed(1) + ' s — en attente de ' + name(b) + '...' : (res === 0 ? 'netrun abandonné — en attente de ' + name(b) + '...' : 'breach raté — en attente de ' + name(b) + '...'));
    });
  };
  C.trainIce = function () {
    if (data.ice >= 10) { C.reply('Ton ICE est déjà au niveau maximum. Aucun netrunner ne passe.'); return; }
    C.game.firewall(data.ice, function (res) {
      if (res > 0) { buddies.iceUp(); C.sys('ICE renforcé : niveau ' + data.ice + '.'); C.reply(C.line('ice.up', 'Pare-feu consolidé. Ton ICE passe au niveau {0}. Bonne chance aux netrunners.', data.ice)); }
      else if (res < 0) { C.sys('entraînement raté.'); C.reply(C.line('ice.fail', 'Le noyau a pris trop de coups. Retente : « renforce l\'ICE ».')); }
      else C.sys('entraînement abandonné.');
    });
  };

  // ---------- écran d'intrusion : barre de chargement + « rien faire » / « contre-piratage » (course) ----------
  C.intrusion = (function () {
    var box = null, bud, bcode, dur, choice, t0, raf, resolved;
    var counterDone, counterWon, counterTime, atkDone, atkWon, atkTime;
    function elc(tag, cls, html) { var d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; }
    function show(b, d) {
      if (box) return;
      bud = b; bcode = clean(b.code); dur = d; choice = 0; resolved = false;
      counterDone = atkDone = false; t0 = performance.now();
      box = elc('div', 'intru', '<div class="in-card"><div class="in-t">⚠ INTRUSION DÉTECTÉE</div>' +
        '<div class="in-s"></div><div class="in-bar"><i></i><b>INTRUSION 0 %</b></div><div class="in-sub">Il force ton pare-feu. Réagis vite.</div>' +
        '<div class="in-btns"><button class="btn">RIEN FAIRE</button><button class="btn cnt">CONTRE-PIRATAGE</button></div></div>');
      box.querySelector('.in-s').textContent = name(b).toUpperCase() + ' ATTAQUE TON ICE (NIVEAU ' + data.ice + ')';
      var bt = box.querySelectorAll('.in-btns .btn');
      bt[0].addEventListener('click', chooseNothing);
      bt[1].addEventListener('click', chooseCounter);
      document.body.appendChild(box);
      raf = requestAnimationFrame(tick);
    }
    function tick() {
      if (!box) return;
      if (choice !== 2) {
        var p = Math.min(1, (performance.now() - t0) / 1000 / dur);
        box.querySelector('.in-bar i').style.width = (p * 100) + '%';
        box.querySelector('.in-bar b').textContent = 'INTRUSION ' + Math.round(p * 100) + ' %';
        if (p >= 1 && choice === 0) { chooseNothing(); return; }
      }
      raf = requestAnimationFrame(tick);
    }
    function chooseNothing() {
      if (choice) return;
      choice = 1;
      box.querySelector('.in-btns').style.display = 'none';
      box.querySelector('.in-sub').textContent = 'Tu laisses faire. Intrusion en cours...';
      resolve();
    }
    function chooseCounter() {
      if (choice) return;
      choice = 2;
      remove();   // on bascule sur le breach (le plus rapide pirate l'autre)
      C.ui.openPanel();
      C.game.start(ice(bud), name(bud), function (res, sec) {
        counterDone = true; counterWon = res > 0; counterTime = sec || 0;
        C.sys('breach terminé — calcul du vainqueur...');
        resolve();
      });
    }
    function attacker(win, t) { atkDone = true; atkWon = win; atkTime = t; resolve(); }
    function resolve() {
      if (resolved) return;
      var defHacked, atkHacked = false;
      if (choice === 1) { if (!atkDone) return; defHacked = atkWon; }
      else {
        if (!counterDone) return;
        if (!counterWon) defHacked = true;
        else { if (!atkDone) return; atkHacked = !atkWon || counterTime <= atkTime; defHacked = !atkHacked; }
      }
      resolved = true; duelActive = false;
      remove();
      buddies.resolveDefense(bcode, defHacked, atkHacked);
      if (defHacked) {
        var lost = C.line(choice === 2 ? 'hack.lost.race' : 'hack.lost', '{0} a percé ton ICE. Il est tombé au niveau {1}. Dis « renforce l\'ICE » pour le remonter.', name(bud), data.ice);
        C.ui.closePanel(); C.hackedText(function () { C.alert('VOUS AVEZ ÉTÉ PIRATÉ', lost); });
      } else if (atkHacked) { C.alert('CONTRE-PIRATAGE RÉUSSI', 'Tu as été plus rapide : l\'ICE de ' + name(bud) + ' a cédé. +Street Cred.'); C.stage.dance(); }
      else C.alert('ATTAQUE BLOQUÉE', name(bud) + ' s\'est fait tracer. Ton ICE a tenu.');
    }
    function remove() { if (raf) cancelAnimationFrame(raf); if (box) { box.remove(); box = null; } }
    return { show: show, attacker: attacker, active: function () { return !!box || (choice === 2 && !resolved); }, code: function () { return bcode; } };
  })();

  // ---------- carte du monde ----------
  C.worldMap = (function () {
    var wrap = null, cv, ctx, selected = null, raf = 0, land = null, pins = [];
    function X(lon, W) { return (lon + 180) / 360 * W; }
    function Y(lat, H) { return (84 - lat) / 168 * H; }
    function drawLand(W, H) {
      var c = document.createElement('canvas'), dpr = window.devicePixelRatio || 1;
      c.width = W * dpr; c.height = H * dpr;
      var x = c.getContext('2d'), bits = Uint8Array.from(atob(MASK), function (ch) { return ch.charCodeAt(0); });
      x.scale(dpr, dpr);
      x.fillStyle = '#07090C'; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(122,40,48,0.45)'; x.lineWidth = 0.5;
      for (var lon = -150; lon < 180; lon += 30) { x.beginPath(); x.moveTo(X(lon, W), 0); x.lineTo(X(lon, W), H); x.stroke(); }
      for (var lat = -60; lat <= 60; lat += 30) { x.beginPath(); x.moveTo(0, Y(lat, H)); x.lineTo(W, Y(lat, H)); x.stroke(); }
      var dx = W / 180, dy = H / 84, s = Math.max(1, Math.min(dx, dy) * 0.62);
      x.fillStyle = 'rgba(184,50,60,0.8)';
      for (var j = 0; j < 84; j++) for (var i = 0; i < 180; i++) { var k = j * 180 + i; if (bits[k >> 3] & (1 << (k & 7))) x.fillRect((i + 0.5) * dx - s / 2, (j + 0.5) * dy - s / 2, s, s); }
      return c;
    }
    function frame(t) {
      if (!wrap) return;
      var W = cv.clientWidth, H = cv.clientHeight, dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); land = null; }
      if (!land) land = drawLand(W, H);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(land, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var sx = ((t / 1000) * 90) % (W + 80) - 40, g = ctx.createLinearGradient(sx - 40, 0, sx, 0);
      g.addColorStop(0, 'rgba(0,240,255,0)'); g.addColorStop(1, 'rgba(0,240,255,0.25)');
      ctx.fillStyle = g; ctx.fillRect(sx - 40, 0, 40, H);
      var ph = (t / 1600) % 1;
      pins = [];
      function pin(lat, lon, label, sub, color, b, mine) {
        var x = X(lon, W), y = Y(lat, H);
        pins.push({ x: x, y: y, b: b });
        if (mine) { ctx.strokeStyle = 'rgba(94,246,255,0.3)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.setLineDash([]); }
        ctx.strokeStyle = color; ctx.globalAlpha = 1 - ph; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 4 + ph * 13, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.fill();
        ctx.font = '700 10px Rajdhani, sans-serif';
        var tw = Math.max(ctx.measureText(label).width, sub ? ctx.measureText(sub).width * 0.9 : 0) + 10, lx = x + tw + 12 > W ? x - tw - 8 : x + 8, ly = Math.max(2, y - 10);
        ctx.fillStyle = 'rgba(10,12,16,0.8)'; ctx.fillRect(lx, ly, tw, sub ? 24 : 14);
        ctx.fillStyle = color; ctx.fillRect(lx, ly, 1.5, sub ? 24 : 14);
        ctx.fillText(label, lx + 5, ly + 10);
        if (sub) { ctx.fillStyle = '#E8E3D8'; ctx.font = '9px monospace'; ctx.fillText(sub, lx + 5, ly + 20); }
      }
      var compact = W < 500;   // petit écran : détails seulement pour l'ami sélectionné
      if (data.city && (data.lat || data.lon)) pin(data.lat, data.lon, compact ? 'TOI' : 'TOI — ' + data.city.toUpperCase(), compact ? '' : 'ICE ' + data.ice, '#5EF6FF', null, true);
      data.buddies.forEach(function (b) { if (hasPlace(b) && b !== selected) pin(num(b.lat), num(b.lon), name(b).toUpperCase(), compact ? '' : b.city + ' · LVL ' + (b.lvl || 1) + ' · ICE ' + ice(b), '#FF4FA8', b); });
      if (selected && hasPlace(selected)) pin(num(selected.lat), num(selected.lon), name(selected).toUpperCase(), selected.city + ' · LVL ' + (selected.lvl || 1) + ' · ICE ' + ice(selected), '#FCEE0A', selected);
      raf = requestAnimationFrame(frame);
    }
    function refresh() {
      if (!wrap) return;
      var list = wrap.querySelector('.wm-list');
      list.innerHTML = '';
      if (!data.buddies.length) list.appendChild(el('div', 'wm-empty', 'Aucun ami pour l\'instant. Donne ton code ami, ou tape dans le chat : « ami AMI-XXXX-XXXX ».'));
      data.buddies.forEach(function (b) {
        var r = el('div', 'wm-row' + (b === selected ? ' sel' : ''), '<b></b><span></span>');
        r.querySelector('b').textContent = name(b).toUpperCase();
        r.querySelector('span').textContent = (hasPlace(b) ? b.city : 'position masquée') + ' · LVL ' + (b.lvl || 1) + ' · ICE ' + ice(b);
        r.addEventListener('click', function () { selected = b; refresh(); });
        list.appendChild(r);
        if (b === selected) {
          var a = el('div', 'wm-acts');
          [['PIRATER', function () { close(); C.ui.openPanel(); C.netrun(b); }],
           ['VISITE', function () { C.friends.send(b.code, '').then(function (ok) { status(ok ? 'ta Capri est partie chez ' + name(b) + '.' : 'le relais ne répond pas.'); }); }],
           ['RETIRER', function () { if (confirm('Retirer ' + name(b) + ' de tes amis ?')) { selected = null; buddies.remove(b); } }]].forEach(function (x) {
            var btn = el('button', 'btn', x[0]); btn.addEventListener('click', x[1]); a.appendChild(btn);
          });
          list.appendChild(a);
        }
      });
      data.requests.forEach(function (rq) {
        var r = el('div', 'wm-row req', '<b></b>');
        r.querySelector('b').textContent = 'DEMANDE : ' + name(rq).toUpperCase();
        var a = el('div', 'wm-acts');
        var y = el('button', 'btn', 'ACCEPTER'); y.addEventListener('click', function () { buddies.accept(rq); status('vous êtes amis.'); });
        var n = el('button', 'btn', 'REFUSER'); n.addEventListener('click', function () { buddies.refuse(rq); });
        a.appendChild(y); a.appendChild(n); r.appendChild(a);
        list.appendChild(r);
      });
      var f = wrap.querySelector('.wm-foot');
      f.textContent = 'TON CODE AMI : ' + C.friends.myCode() + '  ·  MA POSITION : ' + (data.onMap ? (data.city ? 'VISIBLE (' + data.city.toUpperCase() + ', ville seulement)' : 'VISIBLE — aucune ville réglée') : 'MASQUÉE') + '  ›  toucher pour changer';
      f.style.color = data.onMap ? 'var(--cyan)' : 'var(--red-text)';
    }
    function status(t) { if (wrap) wrap.querySelector('.wm-status').textContent = '> ' + t; }
    function open() {
      if (wrap) { refresh(); return; }
      wrap = el('div', 'wmap', '<div class="wm-head"><div><div class="wm-sub">NETWATCH // TRAÇAGE DES CHOOMS</div><div class="wm-title">CARTE DES AMIS</div></div><button class="btn wm-close">FERMER</button></div>' +
        '<canvas class="wm-map"></canvas><div class="wm-foot"></div><div class="wm-status"></div><div class="wm-list"></div>');
      document.body.appendChild(wrap);
      cv = wrap.querySelector('canvas'); ctx = cv.getContext('2d');
      wrap.querySelector('.wm-close').addEventListener('click', close);
      wrap.querySelector('.wm-foot').addEventListener('click', function () { data.onMap = !data.onMap; C.save(); buddies.broadcast(true); refresh(); });
      cv.addEventListener('click', function (e) {
        var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        pins.forEach(function (p) { if (p.b && Math.abs(p.x - x) < 14 && Math.abs(p.y - y) < 14) { selected = p.b; refresh(); } });
      });
      C.unlock('map');
      refresh();
      raf = requestAnimationFrame(frame);
    }
    function close() { if (!wrap) return; cancelAnimationFrame(raf); wrap.remove(); wrap = null; land = null; }
    return { open: open, close: close, refresh: refresh, isOpen: function () { return !!wrap; } };
  })();

  function el(tag, cls, html) { var d = document.createElement(tag); if (cls) d.className = cls; if (html) d.innerHTML = html; return d; }

  // copie dans le presse-papiers (avec repli pour les vieux navigateurs)
  C.copy = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    return Promise.resolve(fallbackCopy(text));
  };
  function fallbackCopy(text) {
    try { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }
  // ligne réglage avec un code et un bouton COPIER
  C.copyRow = function (box, label, getCode) {
    var r = el('div', 'row', '<div class="lb"></div><div class="rt cp"><span></span><button class="btn cpy">COPIER</button></div>');
    r.querySelector('.lb').textContent = label;
    var val = r.querySelector('span'), btn = r.querySelector('.cpy');
    function show() { var c = getCode(); val.textContent = c || '—'; btn.style.display = c ? '' : 'none'; }
    show();
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var c = getCode(); if (!c) return;
      C.copy(c).then(function (ok) { if (ok) { btn.textContent = 'COPIÉ ✓'; setTimeout(function () { btn.textContent = 'COPIER'; }, 1500); } });
    });
    box.appendChild(r);
  };

  // ---------- commandes ----------
  C.trySocial = function (n, t, reply, ask) {
    var m = t.match(/^(?:ami|ajoute|ajoute l'ami|ajoute ami|ajouter|ajoute en ami|deviens ami avec|demande d'ami a|demande d'ami à)\s+(AMI[\-\s]?[A-Za-z0-9]{4}[\-\s]?[A-Za-z0-9]{4})$/i);
    if (m) {
      var code = clean(m[1].replace(/\s/g, '-'));
      if (code.indexOf('AMI-') !== 0) code = 'AMI-' + code.slice(3).replace(/^-+/, '');
      if (code === clean(C.friends.myCode())) { reply('C\'est ton propre code, choom.'); return true; }
      if (find(code)) { reply('Vous êtes déjà amis.'); return true; }
      buddies.request(code).then(function (ok) { reply(ok ? C.line('buddy.sent', 'Demande d\'ami envoyée. Dès qu\'elle est acceptée, ton ami apparaît dans ta liste et sur la carte.') : 'Le relais ne répond pas. T\'es connecté au Net ?'); });
      return true;
    }
    if (/^(mes amis|amis|liste des amis|mes chooms|liste d amis)$/.test(n)) {
      if (!data.buddies.length && !data.requests.length) { reply('Pas encore d\'amis. Donne ton code (« mon code ami ») ou tape « ami AMI-XXXX-XXXX ».'); return true; }
      data.buddies.forEach(function (b) { C.sys(name(b) + ' — LVL ' + (b.lvl || 1) + ' · ICE ' + ice(b) + ' · ' + (hasPlace(b) ? b.city : 'position masquée') + (canHack(b) ? '' : ' · piratage désactivé')); });
      data.requests.forEach(function (r) { C.sys('demande en attente : ' + name(r) + ' (« accepte ' + name(r) + ' »)'); });
      reply(data.buddies.length + ' ami(s). « carte » pour les voir sur la carte du monde, « pirate <nom> » pour tester leur ICE.');
      return true;
    }
    m = n.match(/^(accepte|accepter|refuse|refuser)(?: la demande)?(?: de)? ?(.*)$/);
    if (m && data.requests.length) {
      var yes = m[1].indexOf('accept') === 0, who = m[2].trim();
      var picked = data.requests.filter(function (r) { return !who || who === 'tout' || who === 'tous' || C.norm(name(r)).indexOf(who) === 0; });
      if (!picked.length) { reply('Aucune demande de « ' + who + ' ».'); return true; }
      picked.forEach(function (r) { if (yes) buddies.accept(r); else buddies.refuse(r); });
      reply(yes ? C.line('buddy.accepted', 'C\'est fait, vous êtes amis : {0}.', picked.map(name).join(', ')) : 'Demande refusée.');
      return true;
    }
    if (/^(carte|carte des amis|carte du monde|ouvre la carte|montre la carte|map|ou sont mes amis)$/.test(n)) {
      C.ui.closePanel();
      C.worldMap.open();
      return true;
    }
    m = n.match(/^(?:pirate|pirater|hack|hacke|netrun|breach) (.+)$/);
    if (m) {
      var b = find(m[1]);
      if (!b) { reply(data.buddies.length ? '« ' + m[1] + ' » n\'est pas dans tes amis. Je ne pirate que des amis, c\'est la règle.' : 'Tu ne peux pirater que tes amis, et tu n\'en as pas encore. Tape « ami AMI-XXXX-XXXX ».'); return true; }
      C.netrun(b);
      return true;
    }
    if (/^((renforce|renforcer|entraine|entrainer|ameliore|muscle|augmente) (l |l'|mon |ma |les |mes |la )?(ice|glace|glaces|pare feu|protection|defense)|pare feu|entrainement ice|entrainement)$/.test(n)) { C.trainIce(); return true; }
    if (/^(mon ice|niveau d ice|mon niveau d ice|ma protection|mes glaces)$/.test(n)) {
      reply('Ton ICE est au niveau ' + data.ice + ' / 10' + (data.ice > 1 ? ' et perdra un niveau dans ' + buddies.daysBeforeDecay() + ' jour(s) sans entraînement' : '') + '. ' + (data.hacksWon || 0) + ' piratage(s) réussi(s), ' + (data.hacksBlocked || 0) + ' tentative(s) bloquée(s). « renforce l\'ICE » pour le monter.');
      return true;
    }
    m = n.match(/^(?:retire|supprime|enleve) (?:l ami |mon ami |de mes amis )?(.+?)(?: de mes amis)?$/);
    if (m && find(m[1])) { var rb = find(m[1]); ask('Je retire ' + name(rb) + ' de tes amis ? (oui / non)', function () { buddies.remove(rb); reply(name(rb) + ' n\'est plus dans tes amis.'); }); return true; }
    m = n.match(/^(?:visite|rends visite a|va voir|passe voir) (.+)$/);
    if (m && find(m[1])) {
      var vb = find(m[1]);
      C.friends.send(vb.code, '').then(function (ok) { if (ok) { reply(C.line('visit.sent', 'Je file chez ton ami. Je lui passe le bonjour.')); C.cred.add(10); } else reply('Le relais ne répond pas. T\'es connecté au Net ?'); });
      return true;
    }
    return false;
  };

  // ---------- réglages ----------
  C.socialSettings = function (box, row, toggle) {
    box.appendChild(el('div', 'section', 'Amis et carte du monde'));
    C.copyRow(box, 'Mon code ami', function () { return C.friends.myCode(); });
    row('Amis', data.buddies.length + ' AMI(S)' + (data.requests.length ? ' · ' + data.requests.length + ' DEMANDE(S)' : ''));
    toggle('Apparaître sur la carte (ville seulement)', function () { return !!data.onMap; }, function (v) { data.onMap = v; buddies.broadcast(true); });
    toggle("Visites d'amis", function () { return data.cfg.visits !== false; }, function (v) { data.cfg.visits = v; });
    box.appendChild(el('div', 'section', 'Piratages entre amis'));
    toggle('Mes amis peuvent tenter de me pirater', function () { return data.hackable !== false; }, function (v) { data.hackable = v; buddies.broadcast(true); });
    var notif = window.Notification ? Notification.permission : 'absent';
    toggle('Notifications d\'alerte (attaques, ICE)', function () { return notif === 'granted'; }, function () {
      if (!window.Notification) { C.reply('Ce navigateur ne gère pas les notifications. Sur iPhone : ajoute Capri à l\'écran d\'accueil (iOS 16.4 ou plus), puis réessaie.'); return; }
      if (Notification.permission === 'granted') { C.reply('Pour couper les notifications, va dans Réglages > Notifications > Capri.'); return; }
      Notification.requestPermission().then(function (p) { C.reply(p === 'granted' ? 'Notifications activées. Je te préviens si on t\'attaque.' : 'Notifications refusées. Tu peux les autoriser dans les réglages du téléphone.'); });
    });
    row('Mon ICE', 'NIVEAU ' + data.ice + ' / 10 · FOND DANS ' + buddies.daysBeforeDecay() + ' J · ' + (data.hacksWon || 0) + ' RÉUSSI(S) · ' + (data.hacksBlocked || 0) + ' BLOQUÉ(S)');
    var b = el('div', 'btnrow');
    var m1 = el('button', 'btn', 'CARTE DES AMIS'); m1.addEventListener('click', function () { C.ui.closePanel(); C.worldMap.open(); });
    var m2 = el('button', 'btn', 'RENFORCER L\'ICE'); m2.addEventListener('click', function () { C.trainIce(); });
    b.appendChild(m1); b.appendChild(m2);
    box.appendChild(b);
  };
})();
