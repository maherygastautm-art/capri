// Téléphone : messages et appels vocaux / vidéo entre amis uniquement.
// Le relais ntfy.sh (le même que pour les amis) ne sert qu'à transporter les messages et à mettre les deux téléphones
// en relation : chaque envoi est chiffré avec une clé propre à la paire d'amis, puis l'appel passe en direct (WebRTC).
// Format : "T1:" + code ami de l'expéditeur + ":" + id + ":" + n° de morceau + ":" + nb de morceaux + ":" + morceau chiffré
// Contenu : { t: msg|call|answer|decline|busy|cancel|end, id, from, text, video, sdp, at }
var C = window.C || (window.C = {});

(function () {
  var data = C.data, el = C.el, RELAY = 'https://ntfy.sh/';
  var RING_MAX = 45, CHUNK = 3500, KEEP = 300;
  if (!data.tel || typeof data.tel !== 'object') data.tel = {};
  var tel = data.tel;
  if (!tel.threads) tel.threads = {};
  if (!tel.unread) tel.unread = {};
  if (!tel.turn) tel.turn = { url: '', user: '', pass: '' };

  var enc = new TextEncoder();
  function hex(b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function topic(code) { return crypto.subtle.digest('SHA-256', enc.encode('capri-tel|' + clean(code))).then(function (b) { return 'capri-tel-' + hex(b).slice(0, 24); }); }
  function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function clean(c) { return C.friends.clean(c || ''); }
  function me() { return clean(C.friends.myCode()); }
  function friend(code) { code = clean(code); return data.buddies.filter(function (b) { return b.code === code; })[0] || null; }
  function nameOf(code) { var b = friend(code); return b ? C.buddies.name(b) : code; }
  function pairKey(code) { return 'capri-tel|' + [me(), clean(code)].sort().join('|'); }
  var saveTimer = 0;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(C.save, 400); }
  function hhmm(ms) { var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function when(ms) {
    var d = new Date(ms), t = new Date();
    if (d.toDateString() === t.toDateString()) return hhmm(ms);
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
  }
  function ago(sec) {
    if (!sec) return 'jamais vu';
    var m = Math.floor((Date.now() / 1000 - sec) / 60);
    return m < 2 ? 'en ligne récemment' : m < 60 ? 'vu il y a ' + m + ' min' : m < 1440 ? 'vu il y a ' + Math.floor(m / 60) + ' h' : 'vu il y a ' + Math.floor(m / 1440) + ' j';
  }
  function dur(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- sons (synthétisés, style terminal néon) ----------
  var actx = null, loopTimer = 0;
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  // sortie commune : léger écrasement numérique (son « lo-fi ») + compresseur pour que tout tienne sur un haut-parleur de téléphone
  var bus = null, crushBus = null;
  function master(a) {
    if (bus && bus.context === a) return bus;
    var comp = a.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(a.destination);
    bus = a.createGain(); bus.gain.value = 0.9; bus.connect(comp);
    var w = a.createWaveShaper(), n = 512, curve = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; curve[i] = Math.round(x * 12) / 12; }   // 12 paliers : léger grain numérique
    w.curve = curve; crushBus = a.createGain(); crushBus.connect(w); w.connect(bus);
    return bus;
  }
  function dest(a, crushed) { master(a); return crushed ? crushBus : bus; }
  function tone(a, f, t, d, type, vol, f2, crushed, lp) {
    var o = a.createOscillator(), g = a.createGain(), last = g;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    if (lp) {   // filtre qui s'ouvre : [début, fin] en Hz
      var fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 6;
      fl.frequency.setValueAtTime(lp[0], t); fl.frequency.exponentialRampToValueAtTime(lp[1], t + d);
      g.connect(fl); last = fl;
    }
    last.connect(dest(a, crushed)); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(a, t, d, vol, type, f1, f2) {
    var b = a.createBuffer(1, Math.ceil(a.sampleRate * d), a.sampleRate), ch = b.getChannelData(0);
    for (var i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
    var s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; fl.type = type || 'highpass'; fl.Q.value = type === 'bandpass' ? 4 : 1;
    fl.frequency.setValueAtTime(f1 || 2000, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.value = vol;
    s.connect(fl); fl.connect(g); g.connect(dest(a)); s.start(t);
  }
  function thump(a, t, vol) { tone(a, 110, t, 0.22, 'sine', vol, 38); }   // coup de basse numérique
  function stutter(a, t, f, n, gap, vol) { for (var i = 0; i < n; i++) tone(a, f, t + i * gap, gap * 0.55, 'square', vol, null, true); }   // bégaiement glitch
  function chord(a, t, d, fs, vol, lp) { fs.forEach(function (f) { tone(a, f, t, d, 'sawtooth', vol, null, true, lp); }); }
  // une note « numérique » : corps en triangle + pointe en carré écrasé, attaque nette et extinction rapide
  function note(a, f, t, d, vol) { tone(a, f, t, d, 'triangle', vol); tone(a, f, t, d * 0.6, 'square', vol * 0.35, null, true); }
  var SFX = {
    // sonnerie : motif de 4 notes reconnaissable en une seconde (monte, redescend un peu, finit en haut),
    // avec une basse sous la première note et une étincelle aiguë à la fin. Revient toutes les 2 s.
    ring: function (a, t) {
      thump(a, t, 0.3);
      [[659, 0], [988, 0.13], [880, 0.26], [1319, 0.39]].forEach(function (n) { note(a, n[0], t + n[1], n[1] < 0.39 ? 0.12 : 0.3, 0.07); });
      tone(a, 3951, t + 0.42, 0.05, 'square', 0.02, null, true); tone(a, 5274, t + 0.5, 0.04, 'square', 0.015, null, true);
    },
    // tonalité sortante : deux impulsions sourdes et régulières, filtrées (« ça sonne chez l'autre »)
    ringback: function (a, t) {
      [0, 0.5].forEach(function (d) { tone(a, 294, t + d, 0.32, 'sawtooth', 0.06, null, false, [650, 450]); tone(a, 147, t + d, 0.32, 'sine', 0.08); });
    },
    // nouveau message : 3 notes courtes et douces qui montent, moins de 0,4 s au total
    msg: function (a, t) {
      [[1319, 0], [1760, 0.07], [2637, 0.14]].forEach(function (n, i) { tone(a, n[0], t + n[1], i < 2 ? 0.08 : 0.2, 'triangle', 0.07); });
      tone(a, 2637, t + 0.14, 0.05, 'square', 0.015, null, true);
    },
    // message envoyé : un petit tic qui file vers le haut
    sent: function (a, t) { tone(a, 1568, t, 0.06, 'triangle', 0.05, 2349); },
    // connexion : un souffle qui s'ouvre vers le haut, puis un accord qui se pose
    connect: function (a, t) {
      noise(a, t, 0.22, 0.07, 'bandpass', 400, 4500);
      [523, 659, 784].forEach(function (f) { tone(a, f, t + 0.2, 0.34, 'triangle', 0.05); });
      tone(a, 1568, t + 0.2, 0.08, 'square', 0.02, null, true); thump(a, t + 0.2, 0.25);
    },
    // fin d'appel : deux notes qui descendent, petit bégaiement (liaison coupée), souffle qui se referme
    end: function (a, t) {
      note(a, 784, t, 0.12, 0.06); note(a, 523, t + 0.12, 0.2, 0.06);
      stutter(a, t + 0.32, 1046, 2, 0.05, 0.03);
      noise(a, t + 0.3, 0.25, 0.05, 'lowpass', 3500, 250);
    }
  };
  // sons perso : un fichier déposé dans sons/ remplace le son synthétisé du même rôle (voir sons/LISEZMOI.txt)
  var FILES = { ring: 'sonnerie', ringback: 'tonalite', connect: 'connexion', end: 'fin', msg: 'message', sent: 'envoi' };
  var buffers = {}, loading = null, playing = [];
  function loadFiles(a) {
    if (loading) return loading;
    loading = Promise.all(Object.keys(FILES).map(function (k) {
      return fetch('sons/' + FILES[k] + '.mp3', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.arrayBuffer() : null; })
        .then(function (b) { return b && new Promise(function (ok) { a.decodeAudioData(b, function (d) { buffers[k] = d; ok(); }, function () { ok(); }); }); })
        .catch(function () { });
    }));
    return loading;
  }
  function playFile(a, n) {
    var s = a.createBufferSource(), g = a.createGain();
    s.buffer = buffers[n]; g.gain.value = 0.8;
    s.connect(g); g.connect(dest(a)); s.start(a.currentTime + 0.02);
    playing.push(s); s.onended = function () { playing.splice(playing.indexOf(s), 1); };
  }
  var sfx = {
    play: function (n) {
      var a = ac(); if (!a) return;
      loadFiles(a);
      if (buffers[n]) playFile(a, n); else SFX[n](a, a.currentTime + 0.02);
    },
    loop: function (n, period) {
      sfx.stop(); sfx.play(n);
      var a = ac(), p = period || 2400;
      if (a && buffers[n]) p = Math.max(p, (buffers[n].duration + 0.4) * 1000);   // un fichier long n'est pas coupé par la boucle suivante
      loopTimer = setInterval(function () { sfx.play(n); if (n === 'ring' && navigator.vibrate) navigator.vibrate([350, 150, 350]); }, p);
      if (n === 'ring' && navigator.vibrate) navigator.vibrate([350, 150, 350]);
    },
    stop: function () {
      clearInterval(loopTimer); loopTimer = 0;
      playing.slice().forEach(function (s) { try { s.stop(); } catch (e) { } });
      if (navigator.vibrate) navigator.vibrate(0);
    },
    // pour la page de test : quels rôles ont un fichier
    ready: function () { var a = ac(); return a ? loadFiles(a).then(function () { return Object.keys(FILES).reduce(function (o, k) { o[k] = buffers[k] ? FILES[k] + '.mp3' : ''; return o; }, {}); }) : Promise.resolve({}); },
    files: FILES
  };

  // ---------- relais : envoi chiffré, découpé en morceaux si besoin ----------
  function send(code, obj) {
    if (!friend(code)) return Promise.resolve(false);
    obj.from = data.userName || 'Un choom';
    return C.syncCrypto.seal(pairKey(code), JSON.stringify(obj)).then(function (box) {
      var parts = [], id = rid();
      for (var i = 0; i < box.length; i += CHUNK) parts.push(box.slice(i, i + CHUNK));
      return topic(code).then(function (t) {
        return parts.reduce(function (p, part, k) {
          return p.then(function () { return fetch(RELAY + t, { method: 'POST', body: 'T1:' + me() + ':' + id + ':' + k + ':' + parts.length + ':' + part }); });
        }, Promise.resolve());
      });
    }).then(function (r) { return !!r && r.ok; }).catch(function () { return false; });
  }

  var parts = {}, seen = {};
  function onRelay(m) {
    if (!m || m.event !== 'message' || !m.message || seen[m.id]) return;
    seen[m.id] = 1;
    if (m.time > (tel.since || 0)) { tel.since = m.time; saveSoon(); }
    var x = /^T1:([A-Z0-9\-]+):(\w+):(\d+):(\d+):(.+)$/.exec(m.message);
    if (!x || !friend(x[1])) return;   // seulement les amis
    var key = x[1] + ':' + x[2], n = +x[4], p = parts[key] || (parts[key] = { got: 0, list: [], at: m.time });
    if (p.list[+x[3]] == null) { p.list[+x[3]] = x[5]; p.got++; }
    if (p.got < n) return;
    delete parts[key];
    C.syncCrypto.open(pairKey(x[1]), p.list.join('')).then(function (j) {
      if (!j) return;
      try { handle(clean(x[1]), JSON.parse(j), p.at); } catch (e) { }
    });
  }

  var es = null, esRetry = 0;
  function listen() {
    if (es) return;
    topic(me()).then(function (t) {
      if (es) return;
      var since = tel.since || Math.floor(Date.now() / 1000) - 12 * 3600;
      es = new EventSource(RELAY + t + '/sse?since=' + since);
      es.onmessage = function (e) { try { onRelay(JSON.parse(e.data)); } catch (x) { } };
      es.onerror = function () { if (es) es.close(); es = null; clearTimeout(esRetry); esRetry = setTimeout(listen, 5000); };
    });
  }

  // ---------- fils de discussion ----------
  function thread(code) { return tel.threads[code] || (tel.threads[code] = []); }
  function push(code, m) {
    var th = thread(code);
    if (m.id && th.some(function (x) { return x.id === m.id; })) return false;
    th.push(m);
    th.sort(function (a, b) { return a.at - b.at; });
    if (th.length > KEEP) th.splice(0, th.length - KEEP);
    saveSoon();
    return true;
  }
  function unreadTotal() { return Object.keys(tel.unread).reduce(function (s, k) { return s + (friend(k) ? tel.unread[k] || 0 : 0); }, 0); }
  function logCall(c, what) {
    var kind = c.video ? 'vidéo' : 'vocal', txt = {
      done: 'Appel ' + kind + ' · ' + dur(c.t0 ? (Date.now() - c.t0) / 1000 : 0),
      missed: 'Appel ' + kind + ' manqué', declined: 'Appel ' + kind + ' refusé', noanswer: 'Appel ' + kind + ' sans réponse',
      busy: 'Appel ' + kind + ' : occupé', failed: 'Appel ' + kind + ' interrompu'
    }[what];
    push(c.peer, { id: 'call-' + c.id, me: c.dir === 'out', call: what, text: txt, at: c.at || Date.now() });
    if (what === 'missed') { tel.unread[c.peer] = (tel.unread[c.peer] || 0) + 1; }
    refresh();
  }

  function handle(from, o, at) {
    var age = Date.now() / 1000 - at;
    if (o.t === 'msg') {
      if (!push(from, { id: o.id, me: false, text: String(o.text || '').slice(0, 1000), at: o.at || at * 1000 })) return;
      var reading = isOpen() && view.t === 'thread' && view.code === from;
      if (!reading) {
        tel.unread[from] = (tel.unread[from] || 0) + 1;
        if (age < 120) { sfx.play('msg'); toast(nameOf(from), o.text, function () { openPhone(); openThread(from); }); notifySystem('Message de ' + nameOf(from), o.text); }
      } else sfx.play('msg');
      refresh();
    } else if (o.t === 'avatar') {
      var fb = friend(from);
      if (fb && C.avatar && C.avatar.valid(o.img) && (o.v || 0) >= (fb.avatarV || 0)) { fb.avatar = o.img; fb.avatarV = o.v || 0; saveSoon(); refresh(); }
    } else if (o.t === 'call') {
      if (age > RING_MAX) { logCall({ id: o.id, peer: from, video: o.video, dir: 'in', at: o.at || at * 1000 }, 'missed'); return; }
      if (call) { if (call.id !== o.id) send(from, { t: 'busy', id: o.id }); return; }
      incoming(from, o, age);
    } else if (call && call.id === o.id && call.peer === from) {
      if (o.t === 'ringing' && call.dir === 'out') ringing(call);
      else if (o.t === 'answer' && call.dir === 'out' && call.pc) {
        sfx.stop(); setStatus('CONNEXION…');
        call.pc.setRemoteDescription({ type: 'answer', sdp: o.sdp }).catch(function () { finish('failed', 'ÉCHEC DE CONNEXION', 'end'); });
      } else if (o.t === 'decline') finish('declined', 'APPEL REFUSÉ');
      else if (o.t === 'busy') finish('busy', 'OCCUPÉ');
      else if (o.t === 'cancel') finish('missed', 'APPEL MANQUÉ');
      else if (o.t === 'end') finish(call.t0 ? 'done' : 'failed', 'APPEL TERMINÉ');
    } else if (o.t === 'cancel' && !call && age < 600) {
      logCall({ id: o.id, peer: from, video: o.video, dir: 'in', at: o.at || at * 1000 }, 'missed');
    }
  }

  // ---------- appels (WebRTC) ----------
  var call = null, cv = null;
  function iceServers() {
    var s = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
    if (tel.turn.url) s.push({ urls: tel.turn.url, username: tel.turn.user || '', credential: tel.turn.pass || '' });
    return s;
  }
  function gathered(pc) {
    return new Promise(function (ok) {
      if (pc.iceGatheringState === 'complete') return ok();
      var t = setTimeout(ok, 3500);
      pc.addEventListener('icegatheringstatechange', function () { if (pc.iceGatheringState === 'complete') { clearTimeout(t); ok(); } });
    });
  }
  function media(video, facing) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject({ name: 'Insecure' });
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: video ? { facingMode: facing || 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false
    });
  }
  function mediaError(e) {
    var n = e && e.name;
    return n === 'NotAllowedError' ? 'MICRO / CAMÉRA REFUSÉS' : n === 'NotFoundError' ? 'AUCUN MICRO OU CAMÉRA' : n === 'Insecure' ? 'APPELS : HTTPS REQUIS' : 'MICRO / CAMÉRA INDISPONIBLES';
  }
  function makePc(c) {
    var pc = new RTCPeerConnection({ iceServers: iceServers() });
    pc.ontrack = function (e) {
      if (call !== c) return;
      var s = e.streams[0] || new MediaStream([e.track]);
      cv.audio.srcObject = s; cv.audio.play().catch(function () { });
      if (e.track.kind === 'video') { cv.remote.srcObject = s; cv.remote.play().catch(function () { }); cv.box.classList.add('has-video'); }
    };
    pc.onconnectionstatechange = function () {
      if (call !== c) return;
      var st = pc.connectionState;
      if (st === 'connected') { clearTimeout(c.lost); if (!c.t0) active(); else setStatus(''); }
      else if (st === 'disconnected') { setStatus('SIGNAL FAIBLE…'); clearTimeout(c.lost); c.lost = setTimeout(function () { if (call === c) finish(c.t0 ? 'done' : 'failed', 'SIGNAL PERDU', 'end'); }, 10000); }
      else if (st === 'failed') finish(c.t0 ? 'done' : 'failed', c.t0 ? 'SIGNAL PERDU' : 'CONNEXION IMPOSSIBLE', 'end');
    };
    return pc;
  }
  function addLocal(c, s) {
    c.local = s;
    s.getTracks().forEach(function (t) { c.pc.addTrack(t, s); });
    if (s.getVideoTracks().length) { cv.local.srcObject = s; cv.local.play().catch(function () { }); cv.box.classList.add('has-local'); }
  }

  function dial(code, video) {
    if (call) return;
    var b = friend(code);
    if (!b) return;
    if (!window.RTCPeerConnection) { toast('TÉLÉPHONE', 'Ce navigateur ne gère pas les appels.'); return; }
    var c = call = { id: rid(), peer: b.code, video: !!video, dir: 'out', state: 'dialing', at: Date.now() };
    showCall(); setStatus('PRÉPARATION…');
    media(c.video).then(function (s) {
      if (call !== c) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      c.pc = makePc(c); addLocal(c, s); renderActions();
      return c.pc.createOffer().then(function (d) { return c.pc.setLocalDescription(d); }).then(function () { return gathered(c.pc); }).then(function () {
        if (call !== c) return;
        setStatus('APPEL…');
        return send(c.peer, { t: 'call', id: c.id, video: c.video, sdp: c.pc.localDescription.sdp, at: c.at }).then(function (ok) {
          if (call !== c) return;
          if (!ok) { finish(null, 'RELAIS INJOIGNABLE'); return; }
          // l'ami confirme que ça sonne chez lui (« ringing ») ; sans nouvelles, il a sans doute l'appli fermée
          c.wait = setTimeout(function () { if (call === c && !c.rang) { sfx.loop('ringback', 2600); setStatus('EN ATTENTE… APPLI FERMÉE CHEZ ' + nameOf(c.peer).toUpperCase() + ' ?'); } }, 5000);
        });
      });
    }).catch(function (e) { if (call === c) finish(null, mediaError(e)); });
    c.timer = setTimeout(function () { if (call === c && c.state === 'dialing') finish('noanswer', 'PAS DE RÉPONSE', 'cancel'); }, RING_MAX * 1000);
  }
  function ringing(c) {
    if (c.rang || c.state !== 'dialing') return;
    c.rang = true; clearTimeout(c.wait);
    sfx.loop('ringback', 2600); setStatus('ÇA SONNE CHEZ ' + nameOf(c.peer).toUpperCase());
    if (cv) cv.box.classList.add('rang');
  }

  function incoming(from, o, age) {
    var c = call = { id: o.id, peer: from, video: !!o.video, dir: 'in', state: 'ringing', offer: o.sdp, at: o.at || Date.now() };
    var left = Math.max(5, RING_MAX - age);
    showCall(); sfx.loop('ring', 2000);
    send(from, { t: 'ringing', id: c.id });   // l'appelant sait que ça sonne bien ici
    if (document.hidden) notifySystem('Appel ' + (c.video ? 'vidéo' : 'vocal') + ' entrant', nameOf(from) + ' t\'appelle sur Capri.');
    // barre du temps restant avant « appel manqué »
    var ttl = cv.box.querySelector('.call-ttl i');
    ttl.style.transitionDuration = left + 's';
    requestAnimationFrame(function () { requestAnimationFrame(function () { ttl.style.width = '0%'; }); });
    c.timer = setTimeout(function () { if (call === c && c.state === 'ringing') finish('missed', 'APPEL MANQUÉ'); }, left * 1000);
  }
  // sonnerie coupée : l'appel continue de s'afficher, sans son ni vibration
  function silence() { if (call && call.state === 'ringing') { call.silent = true; sfx.stop(); renderActions(); } }
  // refuser en envoyant un message tout prêt
  var QUICK = ['Je te rappelle.', 'Occupé·e, écris-moi.', 'J\'arrive dans 5 min.'];
  function quickReply(text) {
    var c = call;
    if (!c || c.state !== 'ringing') return;
    var m = { id: rid(), me: true, text: text, at: Date.now(), st: 'pending' };
    push(c.peer, m);
    send(c.peer, { t: 'msg', id: m.id, text: text, at: m.at }).then(function (ok) { m.st = ok ? 'sent' : 'fail'; saveSoon(); refresh(); });
    finish('declined', 'MESSAGE ENVOYÉ', 'decline');
  }

  function accept(withVideo) {
    var c = call;
    if (!c || c.state !== 'ringing') return;
    c.state = 'connecting'; clearTimeout(c.timer); sfx.stop(); setStatus('CONNEXION…'); renderActions();
    if (cv) cv.box.classList.add('answered');
    media(c.video && withVideo).then(function (s) {
      if (call !== c) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      c.pc = makePc(c); addLocal(c, s);
      return c.pc.setRemoteDescription({ type: 'offer', sdp: c.offer }).then(function () { return c.pc.createAnswer(); })
        .then(function (d) { return c.pc.setLocalDescription(d); }).then(function () { return gathered(c.pc); }).then(function () {
          if (call !== c) return;
          send(c.peer, { t: 'answer', id: c.id, sdp: c.pc.localDescription.sdp });
          c.timer = setTimeout(function () { if (call === c && !c.t0) finish('failed', 'CONNEXION IMPOSSIBLE', 'end'); }, 25000);
        });
    }).catch(function (e) { if (call === c) finish('declined', mediaError(e), 'decline'); });
  }

  function active() {
    var c = call;
    c.state = 'active'; c.t0 = Date.now(); clearTimeout(c.timer); clearTimeout(c.wait); sfx.stop(); sfx.play('connect');
    if (cv) cv.box.classList.add('live');
    renderActions();
    c.tick = setInterval(function () { if (call === c) cv.time.textContent = dur((Date.now() - c.t0) / 1000); }, 500);
    setStatus('');
  }

  // fin d'appel : prévient l'autre (notify), écrit l'appel dans le fil (what), affiche la raison puis ferme
  function finish(what, reason, notify) {
    var c = call;
    if (!c) return;
    call = null;
    if (notify) send(c.peer, { t: notify, id: c.id, video: c.video });
    clearTimeout(c.timer); clearTimeout(c.lost); clearTimeout(c.wait); clearInterval(c.tick); sfx.stop(); sfx.play('end');
    if (c.local) c.local.getTracks().forEach(function (t) { t.stop(); });
    if (c.pc) try { c.pc.close(); } catch (e) { }
    if (what) logCall(c, what);
    if (!cv) return;
    var box = cv.box, a = cv.actions;
    cv.status.textContent = reason || 'APPEL TERMINÉ';
    box.classList.add('ended');
    cv = null;
    var auto = 0, close = function () { clearTimeout(auto); box.classList.add('gone'); setTimeout(function () { box.remove(); }, 260); };
    // appel sortant qui n'a pas abouti : proposer de rappeler ou d'écrire, comme sur un vrai téléphone
    if (c.dir === 'out' && ['noanswer', 'declined', 'busy'].indexOf(what) >= 0) {
      box.classList.add('retry');
      a.innerHTML = '';
      a.appendChild(btn('ghost', ICON.end, 'FERMER', close));
      a.appendChild(btn('cyan', ICON.msg, 'MESSAGE', function () { close(); openPhone(); openThread(c.peer); }));
      a.appendChild(btn('green', c.video ? ICON.video : ICON.phone, 'RAPPELER', function () { box.remove(); clearTimeout(auto); dial(c.peer, c.video); }));
      auto = setTimeout(close, 9000);
    } else auto = setTimeout(close, 1600);
  }
  function hangup() {
    var c = call;
    if (!c) return;
    if (c.dir === 'in' && c.state === 'ringing') finish('declined', 'APPEL REFUSÉ', 'decline');
    else if (c.state === 'dialing') finish('noanswer', 'APPEL ANNULÉ', 'cancel');
    else finish(c.t0 ? 'done' : 'failed', 'APPEL TERMINÉ', 'end');
  }
  function toggleMute() {
    var t = call && call.local && call.local.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled; renderActions();
  }
  function toggleCam() {
    var t = call && call.local && call.local.getVideoTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled; cv.box.classList.toggle('cam-off', !t.enabled); renderActions();
  }
  function flipCam() {
    var c = call, old = c && c.local && c.local.getVideoTracks()[0];
    if (!old) return;
    c.facing = c.facing === 'environment' ? 'user' : 'environment';
    navigator.mediaDevices.getUserMedia({ video: { facingMode: c.facing, width: { ideal: 640 }, height: { ideal: 480 } } }).then(function (s) {
      var nt = s.getVideoTracks()[0], sender = c.pc.getSenders().filter(function (x) { return x.track && x.track.kind === 'video'; })[0];
      if (call !== c || !sender) { nt.stop(); return; }
      sender.replaceTrack(nt); c.local.removeTrack(old); old.stop(); c.local.addTrack(nt);
      cv.local.srcObject = c.local; cv.box.classList.toggle('mirror', c.facing === 'user');
    }).catch(function () { });
  }

  // ---------- écran d'appel ----------
  var ICON = {
    phone: '<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
    video: '<svg viewBox="0 0 24 24"><path d="M3 6h12a1 1 0 0 1 1 1v3.5l5-3.5v10l-5-3.5V17a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/></svg>',
    msg: '<svg viewBox="0 0 24 24"><path d="M3 4h18v12H8l-5 4z"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-7 9h2a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.9V22h-2v-3.1A7 7 0 0 1 5 12z"/></svg>',
    flip: '<svg viewBox="0 0 24 24"><path d="M4 7h11l-3-3 1.4-1.4L19 8l-5.6 5.4L12 12l3-3H4zm16 10H9l3 3-1.4 1.4L5 16l5.6-5.4L12 12l-3 3h11z"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zm12.5-16.5 4 4L22 6l-4-4z"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-5v16l-5-5H4zm12.6.4L18 8l2 2 2-2 1.4 1.4-2 2 2 2L22 14.8l-2-2-2 2-1.4-1.4 2-2z"/></svg>',
    end: '<svg viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.1.3-4.6.7v3.1c0 .4-.2.7-.6.9-.9.4-1.8 1-2.5 1.7-.2.2-.4.3-.7.3s-.5-.1-.7-.3L.3 12.9a1 1 0 0 1 0-1.4C3.4 8.6 7.5 7 12 7s8.6 1.6 11.7 4.5c.4.4.4 1 0 1.4l-2.5 2.5c-.2.2-.4.3-.7.3s-.5-.1-.7-.3c-.7-.7-1.6-1.3-2.5-1.7-.4-.2-.6-.5-.6-.9V9.7C15.1 9.3 13.6 9 12 9z"/></svg>'
  };
  // photo de profil de l'ami (ou la mienne) si elle existe, sinon l'initiale
  function avatar(code, cls) {
    var mine = code === me(), b = mine ? null : friend(code), n = mine ? (data.userName || 'MOI') : nameOf(code);
    var img = mine ? data.avatar && data.avatar.img : b && b.avatar;
    if (img && C.avatar && C.avatar.valid(img)) return '<span class="tel-av has-img ' + (cls || '') + '"><img alt="" src="' + img + '"></span>';
    return '<span class="tel-av ' + (cls || '') + '" data-skin="' + esc(b && b.skin || '') + '"><b>' + esc((n[0] || '?').toUpperCase()) + '</b></span>';
  }
  function showCall() {
    var c = call;
    if (cv) cv.box.remove();
    var b = friend(c.peer) || {};
    var box = el('div', 'callscr ' + (c.dir === 'in' ? 'incoming' : 'outgoing') + (c.video ? ' is-video' : ''),
      '<video class="call-remote" playsinline autoplay muted></video><video class="call-local mirror" playsinline autoplay muted></video><audio autoplay></audio>' +
      '<div class="call-top"><div class="call-kind"></div><div class="call-ttl"><i></i></div></div>' +
      '<div class="call-card"><div class="call-ring"><i class="rg"></i><i class="rg"></i>' + avatar(c.peer, 'big') + '</div>' +
      '<div class="call-name"></div><div class="call-info mono"></div><div class="call-status"></div>' +
      '<div class="call-eq"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="call-time mono"></div></div>' +
      '<div class="call-bottom"><div class="call-quick"></div><div class="call-actions"></div></div>');
    box.querySelector('.call-kind').innerHTML = (c.video ? ICON.video : ICON.phone) + '<span>' + (c.dir === 'in' ? 'ENTRANT' : 'SORTANT') + ' · ' + (c.video ? 'APPEL VIDÉO' : 'APPEL VOCAL') + ' // CAPRI.NET</span>';
    box.querySelector('.call-name').textContent = nameOf(c.peer).toUpperCase();
    box.querySelector('.call-info').textContent = c.peer + ' · NIV. ' + (b.lvl || 1) + ' · CHIFFRÉ';
    if (c.dir === 'in') QUICK.forEach(function (q) {
      var k = el('button', 'qr'); k.type = 'button'; k.textContent = q; k.addEventListener('click', function () { quickReply(q); });
      box.querySelector('.call-quick').appendChild(k);
    });
    document.body.appendChild(box);
    cv = { box: box, remote: box.querySelector('.call-remote'), local: box.querySelector('.call-local'), audio: box.querySelector('audio'),
      status: box.querySelector('.call-status'), time: box.querySelector('.call-time'), actions: box.querySelector('.call-actions') };
    setStatus(c.dir === 'in' ? (c.video ? 'T\'APPELLE EN VIDÉO' : 'T\'APPELLE') : 'APPEL…');
    renderActions();
  }
  function setStatus(t) { if (cv) cv.status.textContent = t; }
  function btn(cls, icon, label, fn) {
    var b = el('button', 'cb ' + cls, icon + '<span>' + label + '</span>');
    b.type = 'button'; b.addEventListener('click', fn); return b;
  }
  function renderActions() {
    var c = call;
    if (!cv || !c) return;
    var a = cv.actions;
    a.innerHTML = '';
    if (c.dir === 'in' && c.state === 'ringing') {
      a.appendChild(btn('red', ICON.end, 'REFUSER', hangup));
      if (!c.silent) a.appendChild(btn('ghost small', ICON.mute, 'SILENCE', silence));
      if (c.video) a.appendChild(btn('cyan', ICON.phone, 'SANS VIDÉO', function () { accept(false); }));
      a.appendChild(btn('green', c.video ? ICON.video : ICON.phone, 'RÉPONDRE', function () { accept(true); }));
      return;
    }
    var mic = c.local && c.local.getAudioTracks()[0], cam = c.local && c.local.getVideoTracks()[0];
    if (c.state === 'active' || c.state === 'dialing') {
      a.appendChild(btn('ghost' + (mic && !mic.enabled ? ' off' : ''), ICON.mic, mic && !mic.enabled ? 'MICRO COUPÉ' : 'MICRO', toggleMute));
      if (cam) {
        a.appendChild(btn('ghost' + (!cam.enabled ? ' off' : ''), ICON.video, cam.enabled ? 'CAMÉRA' : 'CAMÉRA COUPÉE', toggleCam));
        a.appendChild(btn('ghost', ICON.flip, 'RETOURNER', flipCam));
      }
    }
    a.appendChild(btn('red', ICON.end, c.state === 'dialing' ? 'ANNULER' : 'RACCROCHER', hangup));
  }

  // ---------- notifications ----------
  function toast(title, text, onTap) {
    var t = el('div', 'tel-toast', '<span class="tt-i">' + ICON.msg + '</span><div><b></b><span></span></div>');
    t.querySelector('b').textContent = title.toUpperCase();
    t.querySelector('div span').textContent = String(text || '').slice(0, 90);
    t.addEventListener('click', function () { t.remove(); if (onTap) onTap(); });
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, 5000);
  }
  function notifySystem(title, body) {
    if (!document.hidden || !window.Notification || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
    navigator.serviceWorker.ready.then(function (reg) { reg.showNotification('Capri — ' + title, { body: body, icon: 'icons/icon-192.png', tag: 'capri-tel', renotify: true }); }).catch(function () { });
  }

  // ---------- écran du téléphone : MESSAGES / CONTACTS ----------
  var root = null, badge = null, view = { t: 'msg' };
  function isOpen() { return !!root && !root.classList.contains('hidden'); }
  function build() {
    var b = el('button', 'telbtn', ICON.phone + '<i class="tel-badge hidden"></i>');
    b.type = 'button'; b.id = 'telBtn'; b.setAttribute('aria-label', 'Téléphone');
    b.addEventListener('click', function () { if (isOpen()) closePhone(); else openPhone(); });
    var top = document.getElementById('top');
    top.insertBefore(b, top.firstChild);
    badge = b.querySelector('.tel-badge');

    root = el('section', 'tel hidden',
      '<div class="tel-frame"><div class="tel-head"><span class="tel-ico">' + ICON.phone + '</span><span class="tel-title">TÉLÉPHONE</span>' +
      '<button class="tel-x key" type="button" aria-label="Fermer">✕</button></div>' +
      '<nav class="tel-tabs"><button type="button" data-t="msg">MESSAGES</button><button type="button" data-t="con">CONTACTS</button></nav>' +
      '<div class="tel-body"></div><div class="tel-foot mono"></div></div>');
    root.id = 'tel';
    document.body.appendChild(root);
    root.querySelector('.tel-x').addEventListener('click', closePhone);
    root.querySelectorAll('.tel-tabs button').forEach(function (t) { t.addEventListener('click', function () { view = { t: t.dataset.t }; render(); }); });
  }
  function openPhone() {
    if (C.ui) C.ui.closePanel();
    root.classList.remove('hidden');
    ac();
    if (window.Notification && Notification.permission === 'default') Notification.requestPermission().catch(function () { });
    render();
  }
  function closePhone() { root.classList.add('hidden'); view = { t: view.t === 'thread' ? 'msg' : view.t }; }
  function openThread(code) { view = { t: 'thread', code: code }; tel.unread[code] = 0; saveSoon(); render(); }
  function refresh() {
    var n = unreadTotal();
    if (badge) { badge.textContent = n > 9 ? '9+' : n; badge.classList.toggle('hidden', !n); }
    if (isOpen() && !(view.t === 'thread' && root.contains(document.activeElement) && document.activeElement.tagName === 'INPUT')) render();
    else if (isOpen() && view.t === 'thread') renderThreadList();
  }

  function render() {
    if (!root) return;
    root.querySelectorAll('.tel-tabs button').forEach(function (t) { t.classList.toggle('on', t.dataset.t === (view.t === 'thread' ? 'msg' : view.t)); });
    var body = root.querySelector('.tel-body'), foot = root.querySelector('.tel-foot');
    body.innerHTML = ''; body.className = 'tel-body ' + view.t;
    foot.textContent = 'TON CODE AMI : ' + C.friends.myCode();
    if (view.t === 'thread' && friend(view.code)) renderThread(body);
    else if (view.t === 'con') renderContacts(body);
    else { view = { t: 'msg' }; renderMessages(body); }
    var n = unreadTotal();
    badge.textContent = n > 9 ? '9+' : n; badge.classList.toggle('hidden', !n);
  }

  function renderMessages(body) {
    var codes = Object.keys(tel.threads).filter(function (k) { return friend(k) && tel.threads[k].length; });
    codes.sort(function (a, b) { return last(b).at - last(a).at; });
    if (!codes.length) { body.appendChild(el('div', 'tel-empty', 'Aucun message pour l\'instant.<br>Va dans <b>CONTACTS</b> pour écrire ou appeler un ami.')); return; }
    codes.forEach(function (code) {
      var m = last(code), un = tel.unread[code] || 0;
      var r = el('button', 'tel-row' + (un ? ' unread' : ''), avatar(code) + '<div class="tr-main"><div class="tr-name"></div><div class="tr-sub"></div></div><div class="tr-side"><span class="tr-time mono"></span>' + (un ? '<i class="tr-un">' + un + '</i>' : '') + '</div>');
      r.type = 'button';
      r.querySelector('.tr-name').textContent = nameOf(code).toUpperCase();
      r.querySelector('.tr-sub').textContent = (m.call ? '☎ ' : m.me ? 'Toi : ' : '') + m.text;
      if (m.call === 'missed') r.querySelector('.tr-sub').classList.add('missed');
      r.querySelector('.tr-time').textContent = when(m.at);
      r.addEventListener('click', function () { openThread(code); });
      body.appendChild(r);
    });
  }
  function last(code) { var th = tel.threads[code]; return th[th.length - 1]; }

  function renderContacts(body) {
    var list = data.buddies.slice().sort(function (a, b) { return nameOf(a.code).localeCompare(nameOf(b.code)); });
    // ma fiche : ma photo de profil, que mes amis voient dans leurs contacts et leurs appels
    var mine = el('button', 'tel-row me', avatar(me()) + '<div class="tr-main"><div class="tr-name"></div><div class="tr-sub">MON PROFIL · touche pour changer ta photo</div></div><span class="tel-ic">' + ICON.edit + '</span>');
    mine.type = 'button';
    mine.querySelector('.tr-name').textContent = (data.userName || 'MOI').toUpperCase();
    mine.addEventListener('click', function () { C.avatar.pick(render); });
    body.appendChild(mine);
    if (!list.length) {
      body.appendChild(el('div', 'tel-empty', 'Pas encore d\'amis dans ton répertoire.<br>Donne ton code ami, ou tape dans le chat : « ami AMI-XXXX-XXXX ».'));
    }
    list.forEach(function (b) {
      var r = el('div', 'tel-row contact', avatar(b.code) + '<div class="tr-main"><div class="tr-name"></div><div class="tr-sub"></div></div><div class="tr-acts"></div>');
      r.querySelector('.tr-name').textContent = nameOf(b.code).toUpperCase();
      r.querySelector('.tr-sub').textContent = 'NIV. ' + (b.lvl || 1) + ' · ' + ago(b.seen);
      var acts = r.querySelector('.tr-acts');
      [[ICON.msg, 'Message', function () { openThread(b.code); }], [ICON.phone, 'Appel vocal', function () { dial(b.code, false); }], [ICON.video, 'Appel vidéo', function () { dial(b.code, true); }]].forEach(function (x) {
        var k = el('button', 'tel-ic', x[0]); k.type = 'button'; k.setAttribute('aria-label', x[1] + ' à ' + nameOf(b.code)); k.addEventListener('click', x[2]); acts.appendChild(k);
      });
      body.appendChild(r);
    });
    // réseau : un relais TURN aide quand les deux téléphones n'arrivent pas à se joindre (4G, réseaux d'entreprise)
    var net = el('details', 'tel-net', '<summary>RÉSEAU DES APPELS (avancé)</summary><p>Sans serveur TURN, certains appels en 4G peuvent échouer. Renseigne-en un si besoin.</p>' +
      '<input data-k="url" placeholder="turn:serveur:3478"><input data-k="user" placeholder="identifiant"><input data-k="pass" type="password" placeholder="mot de passe">');
    net.querySelectorAll('input').forEach(function (i) {
      i.value = tel.turn[i.dataset.k] || '';
      i.addEventListener('change', function () { tel.turn[i.dataset.k] = i.value.trim(); C.save(); });
    });
    body.appendChild(net);
  }

  function renderThread(body) {
    var code = view.code;
    var head = el('div', 'th-head', '<button class="th-back key" type="button" aria-label="Retour">‹</button>' + avatar(code) + '<div class="th-name"></div><div class="tr-acts"></div>');
    head.querySelector('.th-name').textContent = nameOf(code).toUpperCase();
    head.querySelector('.th-back').addEventListener('click', function () { view = { t: 'msg' }; render(); });
    [[ICON.phone, 'Appel vocal', false], [ICON.video, 'Appel vidéo', true]].forEach(function (x) {
      var k = el('button', 'tel-ic', x[0]); k.type = 'button'; k.setAttribute('aria-label', x[1]); k.addEventListener('click', function () { dial(code, x[2]); }); head.querySelector('.tr-acts').appendChild(k);
    });
    body.appendChild(head);
    body.appendChild(el('div', 'th-list'));
    var form = el('form', 'th-form', '<input type="text" maxlength="1000" enterkeyhint="send" placeholder="Message..." autocomplete="off"><button type="submit">ENVOYER</button>');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var i = form.querySelector('input'), text = i.value.trim();
      if (!text) return;
      i.value = '';
      var m = { id: rid(), me: true, text: text, at: Date.now(), st: 'pending' };
      push(code, m); sfx.play('sent'); renderThreadList();
      send(code, { t: 'msg', id: m.id, text: text, at: m.at }).then(function (ok) { m.st = ok ? 'sent' : 'fail'; saveSoon(); renderThreadList(); });
    });
    body.appendChild(form);
    renderThreadList();
  }
  function renderThreadList() {
    var list = root && root.querySelector('.th-list');
    if (!list) return;
    var code = view.code;
    tel.unread[code] = 0;
    list.innerHTML = '';
    var th = tel.threads[code] || [];
    if (!th.length) list.appendChild(el('div', 'tel-empty', 'Début de la conversation avec ' + esc(nameOf(code)) + '.'));
    th.forEach(function (m) {
      if (m.call) { var s = el('div', 'tm call' + (m.call === 'missed' ? ' missed' : '')); s.textContent = '☎ ' + m.text + ' · ' + when(m.at); list.appendChild(s); return; }
      var b = el('div', 'tm ' + (m.me ? 'me' : 'them'), '<div class="tm-t"></div><div class="tm-meta mono"></div>');
      b.querySelector('.tm-t').textContent = m.text;
      b.querySelector('.tm-meta').textContent = hhmm(m.at) + (m.me ? (m.st === 'fail' ? ' · NON ENVOYÉ' : m.st === 'pending' ? ' · …' : ' · ✓') : '');
      if (m.st === 'fail') b.classList.add('fail');
      list.appendChild(b);
    });
    list.scrollTop = list.scrollHeight;
  }

  // ma photo de profil part chez chaque ami qui n'a pas encore la dernière version (nouvel ami compris)
  var avatarBusy = false, avatarLast = 0;
  function syncAvatars(force) {
    var av = data.avatar;
    if (!av || !av.small || avatarBusy || (!force && Date.now() - avatarLast < 60000)) return;
    if (!data.avatarSent || typeof data.avatarSent !== 'object') data.avatarSent = {};
    var todo = data.buddies.filter(function (b) { return data.avatarSent[b.code] !== av.v; });
    if (!todo.length) return;
    avatarBusy = true; avatarLast = Date.now();
    todo.reduce(function (p, b) {
      return p.then(function () { return send(b.code, { t: 'avatar', img: av.small, v: av.v }).then(function (ok) { if (ok) data.avatarSent[b.code] = av.v; }); });
    }, Promise.resolve()).then(function () { avatarBusy = false; saveSoon(); });
  }

  C.phone = {
    open: openPhone, dial: dial, thread: openThread, sfx: sfx,
    start: function () { listen(); refresh(); var a = ac(); if (a) loadFiles(a); setTimeout(function () { syncAvatars(true); }, 6000); setInterval(syncAvatars, 120000); },
    avatarChanged: function () { syncAvatars(true); refresh(); }
  };

  function init() {
    build();
    // démarre après la connexion (mot de passe), en même temps que les relevés d'amis
    var bg = C.startBackground;
    C.startBackground = function () { if (bg) bg.apply(this, arguments); C.phone.start(); };
    document.addEventListener('visibilitychange', function () { if (!document.hidden && !es) listen(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
