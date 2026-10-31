// Accès : mot de passe + profil au premier lancement, mot de passe à chaque ouverture, et mode admin (paramètres)
var C = window.C || (window.C = {});

(function () {
  var ADMIN_CODE = 'Capricorn2077@';
  var data = C.data, el = C.el;
  C.ADMIN_CODE = ADMIN_CODE;

  // empreinte SHA-256 salée (jamais le mot de passe en clair)
  function hash(salt, pw) {
    var txt = salt + '|' + pw;
    if (window.crypto && crypto.subtle && window.TextEncoder)
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      });
    var h = 2166136261;   // secours (page ouverte hors https)
    for (var i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return Promise.resolve('f' + h.toString(16));
  }
  function setPassword(pw) {
    data.passSalt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    return hash(data.passSalt, pw).then(function (h) { data.passHash = h; C.save(); });
  }
  function checkPassword(pw) { return hash(data.passSalt, pw).then(function (h) { return data.passHash && h === data.passHash; }); }

  // applique le profil (aussi utilisé par le mode admin)
  function applyProfile(f, last, age, city, country) {
    f = f.trim();
    if (f) data.userName = f[0].toUpperCase() + f.slice(1);
    data.lastName = last.trim(); data.age = age.trim(); data.country = country.trim();
    var c = city.trim();
    if (c && c !== data.city) { data.city = c; data.lat = data.lon = 0; if (C.weather) C.weather.setCity(c); }
    else if (!c) data.city = '';
    C.save();
  }

  function field(label, type, value, attrs) {
    return '<label class="gf"><span>' + label + '</span><input type="' + type + '" value="' + (value || '').replace(/"/g, '&quot;') + '" ' + (attrs || '') + '></label>';
  }

  function panel(cls) {
    var w = el('div', 'gate ' + (cls || ''), '<div class="gp"><div class="gk">NAVI_ARASAKA // CAPRI.EXE // ACCÈS NEURAL</div><h1></h1><p class="gs"></p><div class="gb"></div><div class="ge"></div></div>');
    document.body.appendChild(w);
    return w;
  }
  function flicker(node) {
    C.loop(function (t) {
      if (t > 0.35) { node.style.opacity = 1; node.style.transform = ''; return true; }
      node.style.opacity = Math.random() < 0.5 ? 0.3 : 1;
      node.style.transform = 'translateX(' + Math.round(Math.random() * 12 - 6) + 'px)';
    });
  }
  function close(w, done) {
    var p = w.querySelector('.gp'), closed = false;
    function finish() { if (closed) return; closed = true; w.remove(); if (done) done(); }
    w.style.pointerEvents = 'none';
    setTimeout(finish, 600);   // secours si l'animation ne tourne pas
    C.loop(function (t) {
      var u = t / 0.35;
      if (closed) return true;
      if (u >= 1) { finish(); return true; }
      p.style.transform = 'scale(' + (u < 0.6 ? 1 : Math.max(0, 1 - (u - 0.6) / 0.4)) + ',' + Math.max(0.015, 1 - u * 1.6) + ')';
    });
  }

  // ---------- connexion ----------
  C.gate = function (done) {
    if (data.passHash && data.profileDone && !data.askPassword) { done(); return; }
    var w = panel(), h = w.querySelector('h1'), sub = w.querySelector('.gs'), body = w.querySelector('.gb'), err = w.querySelector('.ge');
    var p = w.querySelector('.gp');
    flicker(p);
    function fail(m) { err.textContent = '> ' + m; flicker(p); }
    function onSubmit(fn) {
      var f = body.querySelector('form');
      f.addEventListener('submit', function (e) { e.preventDefault(); fn(); });
      setTimeout(function () { var i = f.querySelector('input'); if (i) i.focus(); }, 50);
    }

    function create() {
      h.textContent = 'CRÉER TON ACCÈS';
      sub.textContent = 'Première connexion. Choisis un mot de passe : je te le demanderai à chaque fois.';
      body.innerHTML = '<form>' + field('MOT DE PASSE (4 caractères minimum)', 'password', '', 'autocomplete="new-password"') + field('CONFIRMATION', 'password', '', 'autocomplete="new-password"') +
        '<div class="gbtns"><button class="btn" type="submit">VALIDER</button></div></form>';
      err.textContent = '';
      onSubmit(function () {
        var i = body.querySelectorAll('input');
        if (i[0].value.length < 4) return fail('trop court. 4 caractères minimum.');
        if (i[0].value !== i[1].value) return fail('les deux mots de passe ne correspondent pas.');
        setPassword(i[0].value).then(function () { err.textContent = ''; if (data.profileDone) close(w, done); else profile(); });
      });
    }

    function profile() {
      h.textContent = 'IDENTIFICATION';
      sub.textContent = 'Dis-moi qui tu es, que je te parle comme il faut. Seul le prénom est obligatoire. Tout reste sur ce téléphone.';
      body.innerHTML = '<form>' + field('PRÉNOM *', 'text', data.userName, 'autocomplete="given-name"') +
        '<div class="g2">' + field('NOM (facultatif)', 'text', data.lastName, 'autocomplete="family-name"') + field('ÂGE (facultatif)', 'number', data.age, 'inputmode="numeric" min="1" max="120"') + '</div>' +
        '<div class="g2">' + field('VILLE (facultatif)', 'text', data.city, 'autocomplete="address-level2"') + field('PAYS (facultatif)', 'text', data.country, 'autocomplete="country-name"') + '</div>' +
        '<div class="gbtns"><button class="btn" type="submit">CONNEXION</button></div></form>';
      err.textContent = '';
      onSubmit(function () {
        var i = body.querySelectorAll('input');
        if (!i[0].value.trim()) return fail('il me faut au moins ton prénom.');
        if (i[2].value && (+i[2].value < 1 || +i[2].value > 120)) return fail("l'âge doit être un nombre.");
        applyProfile(i[0].value, i[1].value, i[2].value, i[3].value, i[4].value);
        data.profileDone = true; C.save();
        close(w, done);
      });
    }

    function enter() {
      var fails = 0;
      h.textContent = 'CONNEXION';
      sub.textContent = (data.userName ? 'Re-bonjour, ' + data.userName + '. ' : '') + 'Entre ton mot de passe pour réveiller Capri.';
      body.innerHTML = '<form>' + field('MOT DE PASSE', 'password', '', 'autocomplete="current-password"') +
        '<div class="gbtns"><button class="btn ghost" type="button">OUBLIÉ</button><button class="btn" type="submit">CONNEXION</button></div></form>';
      body.querySelector('.ghost').addEventListener('click', function () {
        if (confirm('Réinitialiser Capri ? Sa mémoire (profil, souvenirs, confiance, succès) sera effacée et tu pourras créer un nouveau mot de passe.')) C.resetAll();
      });
      onSubmit(function () {
        var i = body.querySelector('input');
        checkPassword(i.value).then(function (ok) {
          if (ok) { close(w, done); return; }
          fails++; i.value = '';
          fail(fails < 3 ? 'ACCÈS REFUSÉ. ICE actif.' : 'ACCÈS REFUSÉ. Mot de passe oublié ? Touche OUBLIÉ.');
        });
      });
    }

    if (!data.passHash) create(); else if (!data.profileDone) profile(); else enter();
  };

  // ---------- mode admin : paramètres de Capri sur cet appareil ----------
  C.admin = function () {
    if (document.querySelector('.gate.admin')) return;
    var w = panel('admin'), p = w.querySelector('.gp');
    w.querySelector('.gk').textContent = 'ROOT ACCESS // CAPRI.EXE';
    w.querySelector('h1').textContent = 'MODE ADMIN';
    w.querySelector('.gs').remove();
    var err = w.querySelector('.ge'), body = w.querySelector('.gb');
    function ok(m) { err.style.color = 'var(--cyan)'; err.textContent = '> ' + m; }
    function ko(m) { err.style.color = 'var(--red)'; err.textContent = '> ' + m; }
    var x = el('button', 'key gx', 'FERMER');
    x.addEventListener('click', function () { close(w); });
    p.appendChild(x);
    var tabs = ['PROFIL', 'SÉCURITÉ', 'CAPRI', 'ACTIONS'];
    body.innerHTML = '<nav class="gtabs">' + tabs.map(function (t, i) { return '<button type="button" data-i="' + i + '">' + t + '</button>'; }).join('') + '</nav><div class="gpage"></div>';
    var page = body.querySelector('.gpage');

    function profileTab() {
      var book = Object.keys(data.contacts).map(function (k) { return k + ' = ' + data.contacts[k]; }).join('\n');
      page.innerHTML = '<div class="section">Profil de l\'utilisateur</div><form class="fp">' + field('PRÉNOM', 'text', data.userName) + '<div class="g2">' + field('NOM', 'text', data.lastName) + field('ÂGE', 'number', data.age, 'inputmode="numeric"') + '</div>' +
        '<div class="g2">' + field('VILLE', 'text', data.city) + field('PAYS', 'text', data.country) + '</div><div class="gbtns"><button class="btn" type="submit">ENREGISTRER</button></div></form>' +
        '<div class="section">Carnet de contacts (un par ligne : Nom = numéro ou e-mail)</div><textarea class="gbook"></textarea><div class="gbtns"><button class="btn sb" type="button">ENREGISTRER LE CARNET</button></div>';
      page.querySelector('.gbook').value = book;
      page.querySelector('.fp').addEventListener('submit', function (e) {
        e.preventDefault();
        var i = page.querySelectorAll('.fp input');
        if (!i[0].value.trim()) return ko('le prénom est obligatoire.');
        applyProfile(i[0].value, i[1].value, i[2].value, i[3].value, i[4].value);
        data.profileDone = true; C.save();
        ok('profil enregistré.');
      });
      page.querySelector('.sb').addEventListener('click', function () {
        var d = {};
        page.querySelector('.gbook').value.split('\n').forEach(function (l) {
          var i = l.indexOf('=');
          if (i > 0 && l.slice(0, i).trim() && l.slice(i + 1).trim()) d[l.slice(0, i).trim()] = l.slice(i + 1).trim();
        });
        data.contacts = d; C.save();
        ok(Object.keys(d).length + ' contact(s) enregistré(s).');
      });
    }

    function securityTab() {
      page.innerHTML = '<div class="section">Changer le mot de passe</div><form class="fs">' + field('NOUVEAU MOT DE PASSE', 'password', '', 'autocomplete="new-password"') + field('CONFIRMATION', 'password', '', 'autocomplete="new-password"') +
        '<div class="gbtns"><button class="btn" type="submit">CHANGER</button></div></form><div class="section">Connexion</div><div class="row tg"><div class="lb">Demander le mot de passe à chaque ouverture</div><div class="rt"></div></div>';
      var tg = page.querySelector('.tg'), rt = tg.querySelector('.rt');
      function show() { rt.textContent = data.askPassword ? 'ON' : 'OFF'; rt.style.color = data.askPassword ? 'var(--cyan)' : 'var(--red-text)'; }
      show();
      tg.addEventListener('click', function () { data.askPassword = !data.askPassword; C.save(); show(); ok('mot de passe à l\'ouverture : ' + (data.askPassword ? 'ON' : 'OFF') + '.'); });
      page.querySelector('.fs').addEventListener('submit', function (e) {
        e.preventDefault();
        var i = page.querySelectorAll('.fs input');
        if (i[0].value.length < 4) return ko('4 caractères minimum.');
        if (i[0].value !== i[1].value) return ko('les deux mots de passe ne correspondent pas.');
        setPassword(i[0].value).then(function () { i[0].value = i[1].value = ''; ok('mot de passe changé.'); });
      });
    }

    function capriTab() {
      page.innerHTML = '<div class="section">Confiance de Capri</div><div class="gval"></div><input class="grange" type="range" min="0" max="100" step="1">' +
        '<div class="section">Mémoire et succès</div><div class="gbtns wrap"><button class="btn a1" type="button">EFFACER LES SOUVENIRS</button><button class="btn a2" type="button">RÉINITIALISER LES SUCCÈS</button><button class="btn a3" type="button">DÉBLOQUER TOUS LES SUCCÈS</button></div>' +
        '<div class="section">Réinitialisation complète</div><div class="gbtns wrap"><button class="btn a4" type="button">TOUT EFFACER</button></div>';
      var r = page.querySelector('.grange'), v = page.querySelector('.gval');
      r.value = data.trust;
      function show() { v.textContent = data.trust + ' / 100 — ' + C.tierName().toUpperCase(); }
      show();
      r.addEventListener('input', function () { data.trust = +r.value; show(); });
      r.addEventListener('change', function () { C.save(); C.bond(0); ok('confiance réglée à ' + data.trust + '.'); });
      page.querySelector('.a1').addEventListener('click', function () { data.favGame = data.project = data.birthday = ''; data.likes = []; data.dislikes = []; C.save(); ok('souvenirs effacés (le profil est gardé).'); });
      page.querySelector('.a2').addEventListener('click', function () { data.unlocked = {}; data.messages = data.breachWins = data.rivalWins = 0; C.save(); ok('succès et compteurs remis à zéro.'); });
      page.querySelector('.a3').addEventListener('click', function () { var d = new Date().toISOString().slice(0, 10); C.ACH.forEach(function (a) { if (!data.unlocked[a[0]]) data.unlocked[a[0]] = d; }); C.save(); ok(C.ACH.length + ' succès débloqués.'); });
      page.querySelector('.a4').addEventListener('click', function () { if (confirm('Effacer toute la mémoire de Capri (profil, mot de passe, souvenirs, confiance, succès, contacts) ?')) C.resetAll(); });
    }

    function actionsTab() {
      var acts = [['MODE FÊTE', function () { if (C.party.active()) C.party.stop(); else C.party.start(0, true); }], ['APPARITION BUGGÉE', function () { C.glitch(); }],
        ['BREACH', function () { C.breach(); }], ['COMBAT VEX', function () { C.vexStart(); }], ['PLUIE DE NÉONS', function () { C.rain('rain', 25); }],
        ['ORAGE', function () { C.rain('storm', 25); }], ['GARDE', function () { C.guard.start(true); }], ['RADIO', function () { if (C.radio.playing) C.radio.stop(); else C.radio.play(); }],
        ['DANSE', function () { C.stage.dance(); }]];
      page.innerHTML = '<div class="section">Déclencher (ferme l\'écran admin)</div><div class="gbtns wrap acts"></div>';
      acts.forEach(function (a) {
        var b = el('button', 'btn', a[0]);
        b.type = 'button';
        b.addEventListener('click', function () { close(w, function () { C.ui.closePanel(); a[1](); }); });
        page.querySelector('.acts').appendChild(b);
      });
    }

    var builders = [profileTab, securityTab, capriTab, actionsTab];
    function select(i) {
      body.querySelectorAll('.gtabs button').forEach(function (b, k) { b.classList.toggle('on', k === i); });
      err.textContent = '';
      builders[i]();
    }
    body.querySelectorAll('.gtabs button').forEach(function (b) { b.addEventListener('click', function () { select(+b.dataset.i); }); });
    select(0);
    flicker(p);
  };
})();
