// Interface et modules : chat, réglages, radio, fête, météo, mini-jeu, garde, Vex, démarrage
var C = window.C || (window.C = {});

(function () {
  var VERSION = '1.0.0';
  var $ = function (id) { return document.getElementById(id); };
  var el = C.el, data = C.data, pick = C.pick;
  function rr(a, b) { return a + Math.random() * (b - a); }

  // ---------- ville de fond ----------
  function skyline() {
    var c = $('bg'), dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    var x = c.getContext('2d');
    x.scale(dpr, dpr);
    var g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#07070D'); g.addColorStop(0.55, '#140A1A'); g.addColorStop(1, '#2A0A1C');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    var seed = 7;
    function R() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    [[0.62, '#0E0B16', 0.12], [0.7, '#0A0811', 0.2]].forEach(function (layer, li) {
      var bx = -10;
      while (bx < W) {
        var bw = 24 + R() * 50, bh = H * (0.12 + R() * layer[2] * 2.2), top = H * layer[0] - bh + H * 0.2;
        x.fillStyle = layer[1]; x.fillRect(bx, top, bw, H - top);
        for (var wy = top + 6; wy < H - 20; wy += 9)
          for (var wx = bx + 4; wx < bx + bw - 4; wx += 7)
            if (R() < (li ? 0.13 : 0.07)) { x.fillStyle = R() < 0.7 ? 'rgba(255,94,87,.35)' : 'rgba(94,246,255,.3)'; x.fillRect(wx, wy, 2, 3); }
        if (R() < 0.25) { x.fillStyle = R() < 0.5 ? 'rgba(255,30,70,.6)' : 'rgba(94,246,255,.5)'; x.fillRect(bx + 3, top + 10 + R() * 30, 3, 18 + R() * 30); }
        bx += bw + 2;
      }
    });
    x.fillStyle = 'rgba(255,255,255,0.025)';
    for (var y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
  }

  // ---------- voix et bip ----------
  C.speaking = false;
  var actx = null;
  function audioCtx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } return actx; }
  C.beep = function () {
    var a = audioCtx(); if (!a) return;
    [0, 0.25].forEach(function (d) {
      var o = a.createOscillator(), g = a.createGain();
      o.frequency.value = 880; o.type = 'square'; g.gain.value = 0.08;
      o.connect(g); g.connect(a.destination);
      o.start(a.currentTime + d); o.stop(a.currentTime + d + 0.15);
    });
  };
  function speak(t) {
    if (!data.cfg.voice || !window.speechSynthesis) return;
    if (C.voice) { C.voice.speak(t); return; }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(t.replace(/[«»*]/g, ''));
      u.lang = 'fr-FR'; u.rate = 1.05; u.pitch = 1.15;
      var v = speechSynthesis.getVoices().filter(function (v) { return /^fr/i.test(v.lang); });
      if (v.length) u.voice = v.filter(function (x) { return /amelie|audrey|marie|female/i.test(x.name); })[0] || v[0];
      u.onstart = function () { C.speaking = true; };
      u.onend = u.onerror = function () { C.speaking = false; };
      speechSynthesis.speak(u);
    } catch (e) { }
  }

  // ---------- panneau de discussion ----------
  var panel, log, input, typing = [], typingBusy = false;
  var ui = C.ui = {
    open: false,
    openPanel: function () {
      if (ui.open) return;
      ui.open = true;
      panel.classList.remove('closed');
      C.stage.setChatOpen(true);
      selectTab(curTab);
    },
    closePanel: function () {
      if (!ui.open) return;
      ui.open = false;
      panel.classList.add('closed');
      C.stage.setChatOpen(false);
      input.blur();
    },
    toggle: function () { if (ui.open) ui.closePanel(); else { ui.openPanel(); } }
  };
  var curTab = 0;
  function selectTab(i) {
    curTab = i;
    document.querySelectorAll('.tab').forEach(function (t, k) { t.classList.toggle('on', k === i); });
    ['pChat', 'pCmds', 'pSettings'].forEach(function (id, k) { $(id).classList.toggle('hidden', k !== i); });
    if (i === 2) buildSettings();
  }

  function addRow(node) {
    log.appendChild(node);
    while (log.children.length > 150) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }
  function msg(cls, who, text) {
    var r = el('div', 'msg ' + cls, '<div class="who"></div><div class="txt"></div>');
    r.querySelector('.who').textContent = who;
    r.querySelector('.txt').textContent = text;
    addRow(r);
    return r.querySelector('.txt');
  }
  C.sys = function (t) { var d = el('div', 'sys'); d.textContent = '// ' + t; addRow(d); };
  function addCapri(t) {
    var body = msg('capri', 'CAPRI', '');
    typing.push([body, t]);
    if (!typingBusy) typeNext();
  }
  function typeNext() {
    var job = typing.shift();
    if (!job) { typingBusy = false; return; }
    typingBusy = true;
    var pos = 0;
    (function step() {
      pos = Math.min(job[1].length, pos + 2);
      job[0].textContent = job[1].slice(0, pos) + (pos < job[1].length ? '▌' : '');
      log.scrollTop = log.scrollHeight;
      if (pos < job[1].length) setTimeout(step, 16); else typeNext();
    })();
  }
  // réponse de Capri : dans le chat, en bulle si le chat est fermé, et à voix haute si activé
  C.reply = function (t) {
    addCapri(t);
    if (!ui.open) C.stage.say(t);
    C.stage.talkFor(Math.min(6, 0.8 + t.length * 0.05));
    speak(t);
  };
  C.say = function (t, header) { C.stage.say(t, header); if (ui.open && !header) addCapri(t); };

  function send(t) {
    t = t.trim();
    if (!t) return;
    if (t === C.ADMIN_CODE) { C.sys('accès root accordé.'); input.blur(); C.admin(); return; }   // jamais affiché dans le chat
    selectTab(0);
    if (C.game.playing) {
      if (/^(stop|quitte|quitter|abandonne|arrete|fin)$/.test(C.norm(t))) { C.game.abort(); return; }
      C.game.abort();
    }
    msg('me', 'TOI', t);
    guardActivity();
    C.handle(t);
  }

  // ---------- micro ----------
  C.startMic = function () {
    ui.openPanel();
    var mic = $('mic');
    mic.classList.add('on');
    input.placeholder = 'Je t\'écoute... parle maintenant';
    C.mic.listen(function (text) { mic.classList.remove('on'); input.placeholder = 'Parle à Capri...'; C.unlock('voice'); send(text); },
      function (msg) { mic.classList.remove('on'); input.placeholder = 'Parle à Capri...'; C.reply(msg); });
    setTimeout(function () { mic.classList.remove('on'); input.placeholder = 'Parle à Capri...'; }, 9000);
  };

  // ---------- commandes et réglages ----------
  function buildCommands() {
    var box = $('cmds');
    C.HELP.forEach(function (c) {
      var r = el('div', 'cmd', '<div class="a"></div><div class="b"></div>');
      r.querySelector('.a').textContent = c[0];
      r.querySelector('.b').textContent = c[1];
      r.addEventListener('click', function () {
        var ex = c[0].split('/')[0].trim();
        if (ex.indexOf('...') >= 0) { input.value = ex.replace('...', '').trim() + ' '; selectTab(0); input.focus(); return; }
        selectTab(0);
        send(ex);
      });
      box.appendChild(r);
    });
  }

  var TOGGLES = [
    ['Voix de Capri', 'voice'], ['Promenade autonome', 'wander'], ['Commentaires aléatoires', 'remarks'], ['Personnalité Night City', 'personality'],
    ['Souvenirs (prénom, goûts...)', 'memory'], ['Anniversaires', 'anniversaries'], ['Succès', 'achievements'], ['Apparitions buggées (clin d\'œil)', 'glitches'],
    ['Breach Protocol au retour', 'breach'], ['Radio de Night City', 'radio'], ['Mode fête', 'party'], ['Météo en direct + pluie de néons', 'weather'],
    ['Visites de la rivale (Vex)', 'rival'], ['Tournis quand tu secoues', 'shake'], ['Garde du téléphone (inactivité)', 'guard']
  ];
  function buildSettings() {
    var box = $('settings');
    box.innerHTML = '';
    box.appendChild(el('div', 'section', 'Interface'));
    TOGGLES.forEach(function (tg) {
      var on = data.cfg[tg[1]];
      var r = el('div', 'row', '<div class="lb"></div><div class="toggle' + (on ? ' on' : '') + '"><span class="st">' + (on ? 'ON' : 'OFF') + '</span><div class="track"><i></i></div></div>');
      r.querySelector('.lb').textContent = tg[0];
      r.addEventListener('click', function () {
        C.cfg(tg[1], !data.cfg[tg[1]]);
        applyToggle(tg[1]);
        buildSettings();
      });
      box.appendChild(r);
    });
    box.appendChild(el('div', 'section', 'Capri'));
    var info = [['Confiance', data.trust + ' / 100 — ' + C.tierName().toUpperCase()], ['Ville (météo)', data.city || '—'], ['Version', 'v' + VERSION]];
    info.forEach(function (i) { var r = el('div', 'row', '<div class="lb"></div><div class="rt"></div>'); r.querySelector('.lb').textContent = i[0]; r.querySelector('.rt').textContent = i[1]; box.appendChild(r); });
    C.extraSettings(box, function (lb, rt) { var r = el('div', 'row', '<div class="lb"></div><div class="rt"></div>'); r.querySelector('.lb').textContent = lb; r.querySelector('.rt').textContent = rt; box.appendChild(r); },
      function (lb, get, set) { var on = get(); var r = el('div', 'row', '<div class="lb"></div><div class="toggle' + (on ? ' on' : '') + '"><span class="st">' + (on ? 'ON' : 'OFF') + '</span><div class="track"><i></i></div></div>'); r.querySelector('.lb').textContent = lb; r.addEventListener('click', function () { set(!get()); C.save(); buildSettings(); }); box.appendChild(r); });
    var b = el('div', 'btnrow');
    var reset = el('button', 'btn', 'RÉINITIALISER CAPRI');
    reset.addEventListener('click', function () { if (confirm('Effacer toute la mémoire de Capri (confiance, souvenirs, succès) ?')) C.resetAll(); });
    b.appendChild(reset);
    box.appendChild(b);
  }
  function applyToggle(k) {
    if (k === 'radio' && !data.cfg.radio) C.radio.stop();
    if (k === 'party' && !data.cfg.party) C.party.stop();
    if (k === 'voice' && !data.cfg.voice && window.speechSynthesis) speechSynthesis.cancel();
    if (k === 'shake' && data.cfg.shake) askMotion();
    if (k === 'weather') C.weather.chip();
  }

  // ---------- radio de Night City (Nightride FM) ----------
  var STATIONS = [
    { id: 'nightride', name: 'Nightride FM', genre: 'synthwave' }, { id: 'darksynth', name: 'Darksynth', genre: 'darksynth' },
    { id: 'chillsynth', name: 'Chillsynth', genre: 'chillsynth' }, { id: 'datawave', name: 'Datawave', genre: 'datawave' },
    { id: 'spacesynth', name: 'Spacesynth', genre: 'spacesynth' }
  ];
  var audio = null, meta = null, analyser = null, abuf = null;
  var radio = C.radio = {
    playing: false, track: null,
    current: function () { return STATIONS[data.station % STATIONS.length]; },
    find: function (n) { for (var i = 0; i < STATIONS.length; i++) if (n.indexOf(STATIONS[i].genre) >= 0 || n.indexOf(C.norm(STATIONS[i].name)) >= 0) return i; return -1; },
    play: function (i) {
      if (i != null && i >= 0) data.station = i;
      C.save();
      if (!audio) {
        audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'none';
        audio.addEventListener('error', function () { if (radio.playing) { radio.stop(); C.say(C.line('radio.fail', 'La radio grésille... pas de signal.')); } });
        try {
          var a = audioCtx();
          if (a) { var src = a.createMediaElementSource(audio); analyser = a.createAnalyser(); analyser.fftSize = 512; src.connect(analyser); analyser.connect(a.destination); abuf = new Uint8Array(analyser.fftSize); }
        } catch (e) { analyser = null; }
      }
      if (actx && actx.state === 'suspended') actx.resume();
      audio.src = 'https://stream.nightride.fm/' + radio.current().id + '.mp3';
      audio.play().catch(function () { });
      radio.playing = true;
      radio.track = null;
      radio.announced = false;
      C.unlock('radio');
      radio.chip();
      listenMeta();
    },
    next: function () { radio.play((data.station + 1) % STATIONS.length); },
    stop: function () {
      radio.playing = false;
      if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
      if (meta) { meta.close(); meta = null; }
      radio.chip();
    },
    chip: function () {
      var c = $('radioChip');
      c.classList.toggle('on', radio.playing);
      c.textContent = radio.playing ? '♪ ' + (radio.track ? radio.track : radio.current().name) : 'RADIO OFF';
    },
    // niveau sonore 0..1 (pour le rythme du mode fête)
    level: function () {
      if (!analyser || !radio.playing) return 0;
      analyser.getByteTimeDomainData(abuf);
      var p = 0;
      for (var i = 0; i < abuf.length; i++) p = Math.max(p, Math.abs(abuf[i] - 128));
      return p / 128;
    }
  };
  // titres en direct : flux d'évènements de nightride.fm
  function listenMeta() {
    if (meta || !window.EventSource) return;
    try {
      meta = new EventSource('https://nightride.fm/meta');
      meta.onmessage = function (e) {
        var list; try { list = JSON.parse(e.data); } catch (x) { return; }
        if (!Array.isArray(list)) return;
        list.forEach(function (it) {
          if (!radio.playing || it.station !== radio.current().id) return;
          var t = (it.artist ? it.artist + ' – ' : '') + it.title;
          if (t === radio.track) return;
          var first = !radio.announced;
          radio.track = t; radio.announced = true;
          radio.chip();
          var l = first ? C.line('radio.on', 'Ici Radio Night City, sur {0}. On commence avec {1}.', radio.current().name, t)
            : C.line('radio.next', 'Radio Night City. Morceau suivant : {1}.', radio.current().name, t);
          C.say(l);
        });
      };
    } catch (e) { }
  }

  // ---------- mode fête ----------
  var partyState = null;
  C.party = {
    active: function () { return !!partyState; },
    start: function (seconds, announce) {
      if (partyState) { partyState.dur = seconds ? partyState.t + seconds : 0; return; }
      var neon = C.neon(), ps = partyState = { t: 0, dur: seconds || 0, hist: [], lastBeat: -1, lastSound: 0, pulse: 0, hue: 0, nag: false, end: -1 };
      C.stage.party(true);
      $('partyStop').classList.remove('hidden');
      if (announce) C.say(C.line('party.on', 'Mode fête activé ! Monte le son, choom !'));
      C.unlock('party');
      C.cred.add(5);
      C.loop(function (t) {
        ps.t = t;
        if (ps.end >= 0) {
          var u = (t - ps.end) / 0.6;
          neon.frame(t, 0, ps.hue, Math.max(0, 1 - u));
          if (u >= 1) { neon.remove(); partyState = null; return true; }
          return;
        }
        if ((ps.dur > 0 && t > ps.dur) || t > 300) { C.party.stop(); return; }
        var peak = radio.level();
        ps.hist.push(peak); if (ps.hist.length > 36) ps.hist.shift();
        var avg = ps.hist.reduce(function (a, b) { return a + b; }, 0) / ps.hist.length;
        if (peak > 0.04) ps.lastSound = t;
        var silent = t - ps.lastSound > 2.5, beat;
        if (!silent) beat = peak > 0.06 && peak > avg * 1.3 && t - ps.lastBeat > 0.28;
        else beat = t - ps.lastBeat > (radio.playing ? 0.47 : 0.5);   // pas d'analyse possible : pulsation régulière
        if (beat) { ps.lastBeat = t; ps.pulse = silent && !radio.playing ? 0.55 : 1; ps.hue = (ps.hue + 1) % 4; C.stage.beat(!silent || radio.playing); }
        if (!radio.playing && t > 4 && !ps.nag && !ps.dur) { ps.nag = true; C.say(C.line('party.silent', 'Y\'a pas de son ! Dis « mets de la musique ».')); }
        ps.pulse = Math.max(0, ps.pulse - 0.06);
        neon.frame(t, ps.pulse, ps.hue, Math.min(1, t / 0.5));
      });
    },
    stop: function () {
      if (!partyState || partyState.end >= 0) return;
      partyState.end = partyState.t;
      C.stage.party(false);
      $('partyStop').classList.add('hidden');
    }
  };
  C.celebrate = function (line) {
    if (data.cfg.party) C.party.start(14, false); else C.stage.dance();
    C.say(line);
    speak(line);
  };

  // ---------- météo (Open-Meteo) ----------
  function describe(c) {
    if (c >= 95) return ['storm', 'orage'];
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return ['snow', 'neige'];
    if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return ['rain', c === 61 || c === 80 ? 'pluie légère' : 'pluie'];
    if (c >= 51 && c <= 57) return ['drizzle', 'bruine'];
    if (c === 45 || c === 48) return ['fog', 'brouillard'];
    if (c >= 2) return ['cloudy', c === 2 ? 'quelques nuages' : 'ciel couvert'];
    return ['clear', 'ciel dégagé'];
  }
  function geocode(city) {
    return fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=' + encodeURIComponent(city)).then(function (r) { return r.json(); })
      .then(function (j) { return j.results && j.results[0] ? { name: j.results[0].name, lat: j.results[0].latitude, lon: j.results[0].longitude } : null; });
  }
  function current(lat, lon) {
    return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code,is_day').then(function (r) { return r.json(); })
      .then(function (j) { var c = j.current; var d = describe(c.weather_code); return { temp: Math.round(c.temperature_2m), sky: d[0], desc: d[1] }; });
  }
  var lastSky = null, lastShow = 0;
  var weather = C.weather = {
    setCity: function (city) {
      geocode(city).then(function (g) {
        if (!g) { C.reply(C.line('weather.nocity', 'Je trouve pas « {0} » sur la carte.', city)); return; }
        data.city = g.name; data.lat = g.lat; data.lon = g.lon; C.save();
        lastSky = null;
        weather.poll();
      }).catch(function () { C.reply(C.line('weather.fail', 'Pas de signal météo.')); });
    },
    ask: function (city) {
      var go = function (g) {
        if (!g) { C.reply(C.line('weather.nocity', 'Je trouve pas « {0} » sur la carte.', city)); return; }
        current(g.lat, g.lon).then(function (r) {
          C.reply(C.line('weather.report', '{0} : {1} °C, {2}.', g.name, r.temp, r.desc));
          if (r.sky === 'rain' || r.sky === 'storm' || r.sky === 'drizzle') show(r.sky, 20);
        }).catch(function () { C.reply(C.line('weather.fail', 'Pas de signal météo.')); });
      };
      if (!city) {
        if (!data.city) { C.reply(C.line('weather.where', "Dis-moi ta ville d'abord : « ma ville c'est Paris ».")); return; }
        go({ name: data.city, lat: data.lat, lon: data.lon });
      } else geocode(city).then(go).catch(function () { C.reply(C.line('weather.fail', 'Pas de signal météo.')); });
    },
    poll: function () {
      if (!data.cfg.weather || !data.city) { weather.chip(); return; }
      current(data.lat, data.lon).then(function (r) {
        weather.last = r;
        weather.chip();
        var changed = lastSky !== r.sky, wet = /rain|storm|drizzle|snow/.test(r.sky);
        lastSky = r.sky;
        if (changed && !C.stage.st.sleeping) {
          var key = wet ? (r.sky === 'snow' ? 'weather.snow' : r.sky === 'storm' ? 'weather.storm' : 'weather.rain') : 'weather.dry';
          C.say(C.line(key, 'Météo à {0} : {1}, {2} °C.', data.city, r.desc, r.temp));
        }
        if (wet && (changed || Date.now() - lastShow > 55 * 60000)) show(r.sky, changed ? 45 : 25);
      }).catch(function () { });
    },
    chip: function () {
      var c = $('weatherChip');
      if (!data.cfg.weather || !data.city || !weather.last) { c.classList.add('hidden'); return; }
      c.classList.remove('hidden');
      c.textContent = data.city.toUpperCase() + ' ' + weather.last.temp + '°';
    }
  };
  function show(sky, sec) { if (C.rainActive) return; lastShow = Date.now(); C.rain(sky, sec); C.unlock('rainneon'); }

  // ---------- mini-jeux : breach (normal ou contre l'ICE d'un ami) et pare-feu ----------
  var game = C.game = { playing: false };
  (function () {
    var ALL = ['1C', '55', 'BD', 'E9', '7A', 'FF', '1E', '8D'];
    var N, BUF, LEN, LIMIT, ICE, CODES, CW, CH, box, grid, used, path, seq, picks, progress, step, lastR, lastC, started, over, t0, timer, elapsed, nextScramble, onDone, stopper;
    function selectable(r, c) { return !over && !used[r][c] && (step % 2 === 0 ? r === lastR : c === lastC); }
    function draw() {
      var g = box.querySelector('.g-grid'), cells = g.querySelectorAll('.g-cell');
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        var d = cells[r * N + c];
        d.textContent = used[r][c] ? '[ ]' : grid[r][c];
        d.className = 'g-cell' + (used[r][c] ? ' used' : selectable(r, c) ? ' sel' : '');
      }
      var band = g.querySelector('.g-band');
      band.style.display = over ? 'none' : 'block';
      if (step % 2 === 0) band.style.cssText += ';left:5px;top:' + (5 + lastR * CH) + 'px;width:' + (CW * N) + 'px;height:' + CH + 'px';
      else band.style.cssText += ';left:' + (5 + lastC * CW) + 'px;top:5px;width:' + CW + 'px;height:' + (CH * N) + 'px';
      var sq = box.querySelectorAll('.g-seq span');
      for (var i = 0; i < LEN; i++) sq[i].className = i < progress ? 'ok' : i === progress && !over ? 'next' : '';
      if (picks > 0 && !over) { var st = box.querySelector('.g-status'); st.textContent = '> injection ' + picks + '/' + BUF; st.style.color = ''; }
    }
    function banner(text, good) {
      var b = el('div', 'g-banner', text);
      b.style.background = good ? 'var(--on)' : 'var(--off)';
      b.style.color = good ? 'var(--cyan)' : 'var(--red)';
      box.appendChild(b);
    }
    function finish(res) {
      over = true;
      elapsed = (performance.now() - t0) / 1000;
      banner(res > 0 ? (ICE ? 'ICE PERCÉ' : 'ACCÈS AUTORISÉ') : (ICE ? 'TRACÉ — DÉCONNECTÉ' : 'ÉCHEC DU BREACH'), res > 0);
      box.querySelector('.g-status').textContent = res > 0 ? '> ICE neutralisé' : '> connexion perdue';
      setTimeout(function () { end(res); }, 1600);
    }
    function close() { clearInterval(timer); game.playing = false; box.classList.add('hidden'); $('panel').classList.remove('tall'); }
    function end(res) {
      close();
      if (onDone) { var f = onDone; onDone = null; f(res, elapsed); return; }
      if (res > 0) {
        C.sys('breach réussi en ' + elapsed.toFixed(1) + ' s.');
        C.reply(C.line('gamewin', elapsed < 8 ? "T'es un vrai netrunner, choom." : 'ICE brisé. Pas mal du tout !'));
        C.stage.dance();
        C.bond(4);
        data.breachWins++; C.save();
        C.unlock('breach1');
        if (elapsed < 8) C.unlock('breachfast');
        if (data.breachWins >= 10) C.unlock('breach10');
        C.cred.add(25);
      } else if (res < 0) {
        C.sys('breach échoué.');
        C.reply(C.line('gamelose', "Raté... l'ICE t'a eu. Tape « jeu » pour retenter."));
      } else C.sys('partie abandonnée.');
    }
    function pickCell(r, c) {
      if (!selectable(r, c)) return;
      if (!started) { started = true; t0 = performance.now(); }
      used[r][c] = true;
      var code = grid[r][c];
      box.querySelectorAll('.g-buf span')[picks++].textContent = code;
      progress = code === seq[progress] ? progress + 1 : (code === seq[0] ? 1 : 0);
      lastR = r; lastC = c; step++;
      var any = false;
      for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) if (selectable(i, j)) any = true;
      if (progress === LEN) finish(1);
      else if (picks >= BUF || !any) finish(-1);
      draw();
    }
    // le démon de l'ICE change quelques codes hors du chemin solution
    function scramble() {
      var cells = box.querySelectorAll('.g-cell');
      for (var k = 0; k < 2 + Math.floor(ICE / 3); k++) {
        var r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
        if (used[r][c] || path[r][c]) continue;
        grid[r][c] = pick(CODES);
        cells[r * N + c].textContent = grid[r][c];
        cells[r * N + c].classList.add('mut');
      }
      var st = box.querySelector('.g-status');
      st.textContent = '> démon : grille brouillée';
      st.style.color = 'var(--yellow)';
    }
    function open(tall) {
      if (game.playing) game.abort();
      input.blur();   // ferme le clavier : il cacherait la grille et ferait bouger le panneau pendant la partie
      ui.openPanel();
      $('panel').classList.toggle('tall', !!tall);   // netrun et pare-feu : panneau agrandi
      selectTab(0);
      box = $('game');
      box.classList.remove('hidden');
      game.playing = true;
    }
    // ice = 0 : partie normale ; 1 à 10 : piratage de l'ICE d'un ami (done(res, secondes) remplace les récompenses)
    game.start = function (ice, target, done) {
      if (game.playing) game.abort();   // l'ancienne partie se termine avec SON callback, avant qu'on le remplace
      ICE = ice || 0;
      onDone = done || null;
      if (!ICE) { N = 5; LEN = 4; BUF = 6; LIMIT = 25; CODES = ALL.slice(0, 6); }
      else {
        N = ICE >= 8 ? 7 : 6;
        LEN = ICE <= 4 ? 5 : ICE <= 8 ? 6 : 7;
        BUF = LEN + (ICE <= 3 ? 2 : ICE <= 7 ? 1 : 0);
        LIMIT = 30;   // 30 s à tous les niveaux : la difficulté vient de la grille, de la séquence et du démon
        CODES = ALL.slice(0, 6 + (ICE >= 3 ? 1 : 0) + (ICE >= 6 ? 1 : 0));
      }
      open(!!ICE);
      // contre un ami : grille au-dessus, séquence et buffer dessous, le tout doit tenir dans la hauteur du panneau
      // le clavier est peut-être encore en train de se fermer : on mesure la hauteur sans lui (innerHeight ne bouge pas sur iPhone)
      var room = Math.min(box.clientWidth || 330, 420) - 14, high = Math.max(box.clientHeight || 360, innerHeight - 250) - 200;
      CH = ICE ? Math.max(22, Math.min(37, Math.floor(high / N))) : 32;
      CW = ICE ? Math.min(44, Math.floor(room / N), Math.round(CH * 1.3)) : 38;
      box.innerHTML = '<div class="g-head"><div><div class="g-title' + (ICE ? ' net' : '') + '"></div><div class="g-help"></div></div>' +
        '<div class="g-time"><span></span><b>' + LIMIT.toFixed(2) + '</b></div></div><div class="g-body' + (ICE ? ' stack' : '') + '"><div class="g-grid"><div class="g-band"></div></div><div class="g-side">' +
        '<div class="g-lab">SÉQUENCE REQUISE</div><div class="g-seq"></div><div class="g-lab">BUFFER</div><div class="g-buf"></div><div class="g-status">> en attente du premier code_</div>' +
        (ICE >= 4 ? '<div class="g-warn">⚠ démon actif : la grille se brouille</div>' : '') + '<div class="g-quit">abandonner</div></div></div>';
      box.querySelector('.g-title').textContent = ICE ? 'NETRUN // ' + String(target || '').toUpperCase() : 'BREACH PROTOCOL // MINI-JEU';
      box.querySelector('.g-help').textContent = ICE ? 'ICE niveau ' + ICE + ' — le traçage a déjà commencé.' : 'ligne du haut, puis colonne, puis ligne... reproduis la séquence.';
      box.querySelector('.g-time span').textContent = ICE ? 'TRAÇAGE' : 'TEMPS';
      var g = box.querySelector('.g-grid');
      g.style.gridTemplateColumns = 'repeat(' + N + ', ' + CW + 'px)';
      g.style.gridAutoRows = CH + 'px';
      if (ICE) g.style.borderColor = 'var(--yellow)';
      // chemin solution : ligne 0, puis on alterne colonne / ligne sans repasser par une case
      var pr = [0], pc = [Math.floor(Math.random() * N)], i, r, c;
      for (i = 1; i < LEN; i++) {
        var tries = 0, bad;
        do {
          if (i % 2) { pr[i] = Math.floor(Math.random() * N); pc[i] = pc[i - 1]; } else { pr[i] = pr[i - 1]; pc[i] = Math.floor(Math.random() * N); }
          bad = (i % 2 ? pr[i] === pr[i - 1] : pc[i] === pc[i - 1]);
          for (var k = 0; k < i; k++) if (pr[k] === pr[i] && pc[k] === pc[i]) bad = true;
        } while (bad && ++tries < 200);
      }
      seq = []; for (i = 0; i < LEN; i++) seq.push(pick(CODES));
      grid = []; used = []; path = [];
      for (r = 0; r < N; r++) {
        grid.push([]); used.push([]); path.push([]);
        for (c = 0; c < N; c++) {
          var code = pick(CODES), on = false;
          for (i = 0; i < LEN; i++) if (pr[i] === r && pc[i] === c) { code = seq[i]; on = true; }
          grid[r].push(code); used[r].push(false); path[r].push(on);
        }
      }
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) (function (r, c) {
        var d = el('div', 'g-cell');
        if (ICE) d.style.fontSize = (CW < 40 ? 14 : 16) + 'px';
        d.addEventListener('click', function () { pickCell(r, c); });
        g.appendChild(d);
      })(r, c);
      seq.forEach(function (s) { box.querySelector('.g-seq').appendChild(el('span', '', s)); });
      for (i = 0; i < BUF; i++) box.querySelector('.g-buf').appendChild(el('span'));
      box.querySelector('.g-quit').addEventListener('click', game.abort);
      picks = progress = step = lastR = lastC = 0;
      over = false;
      started = !!ICE;   // contre un ami, le traçage démarre tout de suite
      t0 = performance.now();
      nextScramble = 6;
      stopper = function () { over = true; end(0); };
      draw();
      clearInterval(timer);
      timer = setInterval(function () {
        if (!started || over) return;
        var t = (performance.now() - t0) / 1000, left = Math.max(0, LIMIT - t), tb = box.querySelector('.g-time b');
        if (ICE >= 4 && t >= nextScramble) { draw(); scramble(); nextScramble = t + Math.max(3, 7 - ICE / 3); }
        tb.textContent = left.toFixed(2);
        tb.style.color = left < 5 ? 'var(--red)' : '';
        if (left <= 0) { finish(-1); draw(); }
      }, 33);
    };

    // pare-feu : cliquer les paquets avant qu'ils touchent le noyau ; réussi = done(1)
    game.firewall = function (level, done) {
      if (game.playing) game.abort();
      level = Math.max(1, Math.min(10, level));
      onDone = done;
      open(true);
      var target = 12 + level * 2, hp = 5, score = 0, packets = [], next = 0.6, last = 0, DUR = 30;
      box.innerHTML = '<div class="g-head"><div><div class="g-title ice">PARE-FEU // RENFORCER L\'ICE</div><div class="g-help">touche les paquets avant qu\'ils touchent le noyau.</div></div>' +
        '<div class="g-time">TEMPS<b>30.0</b></div></div><div class="fw"><div class="fw-ring r1"></div><div class="fw-ring r2"></div><div class="fw-ring r3"></div><div class="fw-core">ICE</div></div>' +
        '<div class="fw-foot"><span class="fw-score"></span><span class="fw-hp"></span></div><div class="g-quit">abandonner</div>';
      box.querySelector('.g-quit').addEventListener('click', game.abort);
      var fw = box.querySelector('.fw'), core = box.querySelector('.fw-core');
      var W = fw.clientWidth || 330, H = fw.clientHeight || 300, cx = W / 2, cy = H / 2;
      function texts(left) {
        box.querySelector('.g-time b').textContent = left.toFixed(1);
        box.querySelector('.g-time b').style.color = left < 5 ? 'var(--red)' : '';
        box.querySelector('.fw-score').textContent = 'BLOQUÉS ' + score + ' / ' + target + '  (ICE ' + level + ' → ' + Math.min(10, level + 1) + ')';
        var h = box.querySelector('.fw-hp');
        h.textContent = '■■■■■'.slice(0, hp) + '□□□□□'.slice(0, 5 - hp);
        h.style.color = hp <= 2 ? 'var(--red)' : '';
      }
      function spawn() {
        var a = Math.random() * Math.PI * 2, x = cx + Math.cos(a) * W * 0.6, y = cy + Math.sin(a) * H * 0.6;
        x = Math.max(18, Math.min(W - 18, x)); y = Math.max(14, Math.min(H - 14, y));
        var sp = 40 + level * 6 + Math.random() * 15, dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy);
        var p = { x: x, y: y, vx: dx / d * sp, vy: dy / d * sp, hp: level >= 5 && Math.random() < 0.25 ? 2 : 1 };
        p.el = el('div', 'fw-pk' + (p.hp > 1 ? ' armored' : ''), pick(['1C', '55', 'BD', 'E9', '7A', 'FF', '0x', '##']));
        p.el.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          if (over || packets.indexOf(p) < 0) return;
          if (--p.hp > 0) { p.el.classList.remove('armored'); return; }
          packets.splice(packets.indexOf(p), 1); p.el.remove(); score++;
        });
        fw.appendChild(p.el);
        packets.push(p);
      }
      function stop(res) {
        over = true;
        packets.forEach(function (p) { p.el.remove(); }); packets = [];
        banner(res > 0 ? 'ICE RENFORCÉ — NIVEAU ' + Math.min(10, level + 1) : 'NOYAU COMPROMIS', res > 0);
        setTimeout(function () { end(res); }, 1800);
      }
      over = false;
      t0 = performance.now();
      stopper = function () { over = true; packets.forEach(function (p) { p.el.remove(); }); end(0); };
      texts(DUR);
      clearInterval(timer);
      timer = setInterval(function () {
        if (over) return;
        var t = (performance.now() - t0) / 1000, dt = t - last; last = t;
        if (t >= next) { spawn(); next = t + Math.max(0.35, 1.1 - level * 0.07) * (0.7 + Math.random() * 0.6); }
        for (var i = packets.length - 1; i >= 0; i--) {
          var p = packets[i];
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.el.style.transform = 'translate(' + (p.x - 16) + 'px,' + (p.y - 11) + 'px)';
          if (Math.hypot(p.x - cx, p.y - cy) < 24) { packets.splice(i, 1); p.el.remove(); hp--; core.classList.remove('hit'); void core.offsetWidth; core.classList.add('hit'); }
        }
        var left = Math.max(0, DUR - t);
        texts(left);
        if (hp <= 0) stop(-1);
        else if (left <= 0) stop(score >= target ? 1 : -1);
      }, 25);
    };

    game.abort = function () { if (!game.playing) return; if (stopper) stopper(); else { over = true; end(0); } };
  })();

  // ---------- garde du téléphone (inactivité ou « je pars ») ----------
  var lastActivity = Date.now();
  function guardActivity() { lastActivity = Date.now(); if (C.guard.active && Date.now() - C.guard.since > 3000) C.guard.end(); }
  C.guard = {
    active: false, since: 0, panels: null,
    start: function (manual) {
      if (C.guard.active) return;
      C.guard.active = true; C.guard.since = Date.now();
      C.stage.hack(true);
      C.say(C.line('lockdown', 'Périmètre verrouillé. Personne ne touche à ce téléphone.'));
      C.guard.panels = C.lockPanels(C.stage.st.x, C.stage.st.y - 90);
    },
    end: function () {
      if (!C.guard.active) return;
      C.guard.active = false;
      C.guard.panels.end();
      C.stage.hack(false);
      C.say(C.line('welcome', "Re-bienvenue, choom. Personne n'est passé."));
      C.bond(2);
      C.unlock('guard');
    }
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { addEventListener(ev, guardActivity, true); });

  // ---------- Vex, la rivale ----------
  C.vexStart = function () {
    var s = C.stage, st = s.st;
    if (C.vex || st.fighting) return;
    var W = s.W(), S = s.S(), side = st.x < W / 2 ? 1 : -1;
    var v = { x: Math.max(40, Math.min(W - 40, st.x + side * Math.min(260, W * 0.55))), dir: -side, anim: 'idle', animT: 0, mv: null, out: -1, t: 0, step: 0, bubT: 0 };
    var wins = Math.random() < 0.65, vb = $('vexBubble'), vbt = vb.querySelector('.bt');
    var TAUNTS = ["Alors c'est toi, la netrunneuse de ce téléphone ? Ce territoire est à moi.", "Joli téléphone. Dommage qu'il soit mal gardé.", "Vex est de retour, Capri. T'as pas oublié notre dernier combat ?"];
    var VWIN = ['Trop lente, Capri.', "Ce téléphone est à moi, maintenant. ...Pour aujourd'hui.", "Reviens quand t'auras upgradé tes implants."];
    var VLOSE = ["Tch... ce n'est que partie remise !", 'Argh ! Mes implants... je reviendrai !', "Ok, ok, t'as gagné. Cette fois."];
    function vsay(t) { vbt.textContent = t; vb.classList.remove('hidden'); v.bubT = 3.2; }
    function move(to, dur, hop, a) { v.mv = { x0: v.x, x1: to, t0: v.t, d: dur, h: hop }; v.anim = a; v.animT = 0; v.dir = to >= v.x ? 1 : -1; }
    s.engage(v.x);
    var R0 = 3.4, GAP = 1.9, FIN = R0 + GAP * 3;
    function script(t) {
      if (v.step === 0 && t > 0.7) { v.step++; vsay(pick(TAUNTS)); }
      if (v.step === 1 && t > 2.3) { v.step++; s.faceTo(v.x); C.say(C.line('fight.retort', 'Dégage de mon téléphone, Vex.')); }
      for (var k = 0; k < 3; k++) {
        var T = R0 + k * GAP, b = 2 + k * 4, mid = (st.x + v.x) / 2;
        if (v.step === b && t > T) { v.step++; s.dashTo(mid - side * 22 * S); move(mid + side * 22 * S, Math.max(0.08, Math.abs(mid - v.x) / 2200), 0, 'dash'); }
        if (v.step === b + 1 && t > T + 0.25) { v.step++; s.clash(mid); }
        if (v.step === b + 2 && t > T + 0.4) {
          v.step++;
          s.hopTo(mid - side * rr(90, 130) * S);
          move(Math.max(30, Math.min(W - 30, mid + side * rr(90, 130) * S)), 0.5, 60 * S, 'fall');
        }
        if (v.step === b + 3 && t > T + 1.05) { v.step++; s.faceTo(v.x); v.dir = st.x >= v.x ? 1 : -1; }
      }
      if (v.step === 14 && t > FIN) {
        v.step++;
        if (wins) s.dashTo(v.x + side * 60 * S);
        else move(Math.max(30, Math.min(W - 30, st.x - side * 60 * S)), Math.max(0.08, Math.abs(st.x - v.x) / 2200), 0, 'dash');
      }
      if (v.step === 15 && t > FIN + 0.22) {
        v.step++;
        s.clash(wins ? v.x : st.x);
        if (wins) { v.anim = 'dizzy'; v.animT = 0; vsay(pick(VLOSE)); } else s.stun();
      }
      if (wins && v.step === 16 && t > FIN + 1.2) { v.step++; v.out = t; }
      if (!wins && v.step === 16 && t > FIN + 0.6) { v.step++; v.dir = st.x >= v.x ? 1 : -1; v.anim = 'dance'; v.animT = 0; vsay(pick(VWIN)); }
      if (!wins && v.step === 17 && t > FIN + 2.4) { v.step++; v.out = t; }
    }
    C.vex = {
      draw: function (dt) {
        v.t += dt; v.animT += dt;
        var t = v.t;
        if (v.bubT > 0) { v.bubT -= dt; if (v.bubT <= 0) vb.classList.add('hidden'); }
        if (v.out < 0 && s.grabbed()) { v.out = t; st.fighting = false; v.step = 0; }
        if (v.out < 0) script(t);
        var lift = 0;
        if (v.mv) {
          var u = Math.min(1, (t - v.mv.t0) / v.mv.d);
          v.x = v.mv.x0 + (v.mv.x1 - v.mv.x0) * u;
          lift = v.mv.h * 4 * u * (1 - u);
          if (u >= 1) { v.mv = null; v.anim = 'crouch'; v.animT = 0; }
        } else if (v.anim === 'crouch' && v.animT > 0.3) v.anim = 'idle';
        var alpha = t < 0.6 ? (Math.random() < 0.5 ? 0.2 : 0.9) : 1;
        if (v.out >= 0) {
          var uo = (t - v.out) / 1;
          if (uo >= 1) { done(); return; }
          alpha = (1 - uo) * (Math.random() < 0.4 ? 0.2 : 1);
        }
        var a = v.bubT > 0 && v.anim === 'idle' ? 'talk' : v.anim, p = C.pose(a, v.animT), y = s.floor() - lift;
        if (t < 0.6 || v.out >= 0 || a === 'dash' || Math.random() < 0.03) {
          s.drawFig(p, v.x - 5, y, v.dir, '#1EC8FF', null, 0.6 * alpha);
          s.drawFig(p, v.x + 5, y, v.dir, '#FF2BD6', null, 0.6 * alpha);
        }
        s.drawFig(p, v.x, y, v.dir, null, C.VEX, alpha);
        if (!vb.classList.contains('hidden')) s.placeBubble(vb, v.x, y - 222 * S);
      }
    };
    function done() {
      C.vex = null;
      vb.classList.add('hidden');
      st.fighting = false;
      if (v.step < 16) return;
      if (wins) {
        data.rivalWins++; C.save();
        s.dance();
        C.say(C.line('fight.win', 'Et reste dehors !'));
        C.unlock('rivalwin');
        if (data.rivalWins >= 3) C.unlock('rival3');
        C.cred.add(20);
        C.bond(1);
      } else {
        C.say(C.line('fight.lose', "Elle m'a eue... La prochaine fois, je la flatline."));
        C.unlock('rivallose');
      }
    }
  };

  // ---------- secousses (tournis) ----------
  var motionOk = false, shakes = [];
  function askMotion() {
    if (motionOk || !data.cfg.shake || !window.DeviceMotionEvent) return;
    var go = function () {
      motionOk = true;
      addEventListener('devicemotion', function (e) {
        if (!data.cfg.shake) return;
        var a = e.acceleration || e.accelerationIncludingGravity;
        if (!a) return;
        var m = Math.sqrt((a.x || 0) * (a.x || 0) + (a.y || 0) * (a.y || 0) + (a.z || 0) * (a.z || 0)) - (e.acceleration ? 0 : 9.8);
        var now = Date.now();
        if (m > 14) shakes.push(now);
        shakes = shakes.filter(function (t) { return now - t < 1200; });
        if (shakes.length >= 6 && (!C.lastDizzy || now - C.lastDizzy > 15000)) {
          shakes = [];
          C.lastDizzy = now;
          if (C.stage.dizzy()) { C.say(C.line('dizzy', 'Arrête de secouer, j\'ai le tournis !')); C.unlock('dizzy'); }
        }
      });
    };
    if (typeof DeviceMotionEvent.requestPermission === 'function')
      DeviceMotionEvent.requestPermission().then(function (r) { if (r === 'granted') go(); }).catch(function () { });
    else go();
  }

  // ---------- remarques, apparitions, retour après absence ----------
  C.remark = function () {
    var st = C.stage.st;
    if (!data.cfg.remarks || ui.open || st.sleeping || C.stage.busy() || document.hidden) return;
    var mem = Math.random() < 0.4 ? C.memRemark() : null;
    if (!mem && C.cred.level() >= 4 && Math.random() < 0.35) mem = C.line(C.cred.level() >= 8 && Math.random() < 0.5 ? 'remark.cred2' : 'remark.cred1', '');
    C.stage.say(mem || C.line('remark', pick(['Systèmes nominaux. Enfin... presque.', '*bzzt* ... pardon, petit bug.', 'Je surveille le réseau. Rien à signaler.'])));
  };
  function scheduleGlitch() {
    setTimeout(function () {
      if (data.cfg.glitches && !document.hidden && !ui.open && !C.stage.busy() && !C.stage.st.sleeping) C.glitch();
      scheduleGlitch();
    }, rr(8, 20) * 60000);
  }
  function onVisible() {
    if (document.hidden) { data.lastSeen = Date.now(); C.save(); return; }
    var away = Date.now() - (data.lastSeen || Date.now());
    lastActivity = Date.now();
    if (data.cfg.breach && away > 20 * 60000 && !C.guard.active) setTimeout(function () { C.breach(); }, 600);
    C.checkDates();
    C.weather.poll();
  }

  function clock() {
    var d = new Date();
    $('clock').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  // ---------- clavier de l'iPhone : on suit la zone visible ----------
  // iOS ne réduit pas la page quand le clavier s'ouvre : les éléments fixés en bas restent derrière lui.
  // On mesure la hauteur du clavier (--kb) et on remonte la barre de saisie et le panneau d'autant.
  function fitViewport() {
    var vv = window.visualViewport, h = vv ? vv.height : innerHeight, root = document.documentElement;
    if (vv) window.scrollTo(0, 0);
    var kb = vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) : 0;
    if (kb < 80) kb = 0;   // petites variations (barre d'adresse) : pas un clavier
    root.style.setProperty('--vh', h + 'px');
    root.style.setProperty('--kb', kb + 'px');
    root.classList.toggle('kb-open', kb > 0);
  }

  // ---------- démarrage ----------
  function init() {
    panel = $('panel'); log = $('log'); input = $('input');
    $('ver').textContent = 'v' + VERSION;
    fitViewport();
    if (window.visualViewport) { visualViewport.addEventListener('resize', fitViewport); visualViewport.addEventListener('scroll', fitViewport); }
    // le clavier s'ouvre en animation : on remesure pendant qu'il monte / descend
    ['focus', 'blur'].forEach(function (ev) { input.addEventListener(ev, function () { [50, 250, 500].forEach(function (d) { setTimeout(fitViewport, d); }); }); });
    skyline();
    addEventListener('resize', function () { skyline(); fitViewport(); });
    C.stage.init();
    C.stage.hidden = true;   // elle apparaît après la connexion
    C.stage.onTap = function () { ui.toggle(); };
    buildCommands();
    document.querySelectorAll('.tab').forEach(function (t) { t.addEventListener('click', function () { selectTab(+t.dataset.tab); }); });
    document.querySelectorAll('.key[data-step]').forEach(function (k) { k.addEventListener('click', function () { selectTab((curTab + 3 + +k.dataset.step) % 3); }); });
    $('closePanel').addEventListener('click', ui.closePanel);
    $('mic').addEventListener('click', C.startMic);
    $('partyStop').addEventListener('click', function () { C.party.stop(); C.say(C.line('party.off', 'Fin de la fête. Je range les néons.')); });
    $('inputBar').addEventListener('submit', function (e) { e.preventDefault(); var t = input.value; input.value = ''; send(t); });
    input.addEventListener('focus', function () { ui.openPanel(); });
    $('radioChip').addEventListener('click', function () {
      if (radio.playing) radio.stop(); else if (data.cfg.radio) { radio.play(); C.say(C.line('radio.start', 'Radio Night City en ligne : {0}.', radio.current().name)); }
    });
    C.sys('liaison établie. tape « aide » pour voir ce que je sais faire.');
    clock(); setInterval(clock, 10000);

    C.boot(VERSION, function () {
      // premier toucher : débloque le son, la voix et les secousses sur iPhone
      audioCtx(); if (actx && actx.state === 'suspended') actx.resume();
      if (window.speechSynthesis) speechSynthesis.getVoices();
      askMotion();
      // mot de passe (et profil au premier lancement) avant de réveiller Capri
      C.gate(launch);
    });

    function launch() {
      C.stage.hidden = false;
      C.stage.arrive();
      setTimeout(function () {
        var name = data.cfg.memory ? data.userName : '';
        C.say(name && Math.random() < 0.5 ? C.line('online.name', 'Te revoilà, {0}. Capri en ligne.', name) : C.line('online', 'Capri en ligne. Touche-moi si t\'as besoin de moi.'));
      }, 1200);
      setTimeout(C.checkDates, 5000);
      C.weather.poll();
      setInterval(C.weather.poll, 20 * 60000);
      scheduleGlitch();
      // garde automatique après 3 min sans toucher l'écran
      setInterval(function () {
        if (data.cfg.guard && !C.guard.active && !document.hidden && Date.now() - lastActivity > 180000 && !C.stage.busy() && !C.stage.st.sleeping && !C.party.active()) { ui.closePanel(); C.guard.start(false); }
      }, 5000);
      // la rivale passe de temps en temps
      (function vexLater() {
        setTimeout(function () {
          if (data.cfg.rival && !document.hidden && !ui.open && !C.stage.busy() && !C.stage.st.sleeping && !C.guard.active) C.vexStart();
          vexLater();
        }, rr(10, 25) * 60000);
      })();
      document.addEventListener('visibilitychange', onVisible);
      data.lastSeen = Date.now(); C.save();
      C.startBackground();
    }

    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
