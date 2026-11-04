// Cerveau : réglages + sauvegarde, personnalité, souvenirs, succès, compréhension des messages (100 % local)
var C = window.C || (window.C = {});

(function () {
  // ---------- sauvegarde (localStorage) ----------
  var KEY = 'capri.v1';
  var DEFAULTS = {
    cfg: { voice: false, wander: true, remarks: true, glitches: true, breach: true, personality: true, memory: true, anniversaries: true,
      achievements: true, radio: true, party: true, weather: true, rival: true, shake: true, guard: true, visits: true },
    trust: 5, messages: 0, breachWins: 0, rivalWins: 0, unlocked: {},
    userName: '', favGame: '', project: '', birthday: '', firstMet: '', lastCelebrated: '', likes: [], dislikes: [],
    city: '', lat: 0, lon: 0, station: 0, lastSeen: 0,
    lastName: '', age: '', country: '', profileDone: false, passHash: '', passSalt: '', askPassword: true, contacts: {},
    cred: 0, skin: 'classique', lastDaily: '', notes: [], voiceName: '', voiceFx: 'normale', syncOn: false, syncCode: '', syncStamp: 0, syncHash: '', friendCode: '', lastVisit: 0,
    buddies: [], requests: [], asked: [], ice: 1, onMap: false, hackable: true, lastBroadcast: 0, hacksWon: 0, hacksBlocked: 0, iceStamp: 0
  };
  var data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }
  if (!data) data = {};
  for (var k in DEFAULTS) if (data[k] === undefined) data[k] = JSON.parse(JSON.stringify(DEFAULTS[k]));
  for (k in DEFAULTS.cfg) if (data.cfg[k] === undefined) data.cfg[k] = DEFAULTS.cfg[k];
  if (!data.firstMet) data.firstMet = new Date().toISOString().slice(0, 10);
  C.data = data;
  C.save = function () { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { } };
  C.cfg = function (key, v) { if (v !== undefined) { data.cfg[key] = v; C.save(); } return data.cfg[key]; };
  C.resetAll = function () { try { localStorage.removeItem(KEY); } catch (e) { } location.reload(); };
  C.save();

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function fmt(s, args) { return s.replace(/\{(\d)\}/g, function (m, i) { return args[i] != null ? args[i] : m; }); }
  C.pick = pick;

  // ---------- personnalité ----------
  C.tier = function () { return data.trust < 25 ? 0 : data.trust < 60 ? 1 : 2; };
  C.tierName = function () { return ['méfiante', 'complice', 'attachée'][C.tier()]; };
  // réplique de la personnalité (ou la réplique neutre si elle est coupée)
  C.line = function (key, normal) {
    var args = Array.prototype.slice.call(arguments, 2), s = normal;
    var L = C.LINES[key];
    if (data.cfg.personality && L) { var opts = L[Math.min(C.tier(), L.length - 1)]; s = pick(opts); }
    return fmt(s, args);
  };
  C.hasLine = function (key) { return data.cfg.personality && !!C.LINES[key]; };
  C.bond = function (d) {
    data.trust = Math.max(0, Math.min(100, data.trust + d));
    C.save();
    if (data.trust >= 25) C.unlock('trust25');
    if (data.trust >= 60) C.unlock('trust60');
  };

  // ---------- succès ----------
  C.unlock = function (id) {
    if (!data.cfg.achievements || data.unlocked[id]) return;
    var def = C.ACH.filter(function (a) { return a[0] === id; })[0];
    if (!def) return;
    data.unlocked[id] = new Date().toISOString().slice(0, 10);
    C.save();
    C.achPopup(def[1], def[2]);
  };
  C.achSummary = function () {
    var n = C.ACH.filter(function (a) { return data.unlocked[a[0]]; }).length;
    return ['Succès : ' + n + ' / ' + C.ACH.length].concat(C.ACH.map(function (a) { return (data.unlocked[a[0]] ? '✔ ' + a[1] + ' — ' + a[2] : '▢ ' + a[1] + ' — ???'); }));
  };

  // ---------- souvenirs ----------
  var MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  var MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function title(s) { s = s.replace(/^[\s.!?,"«»]+|[\s.!?,"«»]+$/g, ''); return s ? s[0].toUpperCase() + s.slice(1) : s; }
  function learned() { C.save(); C.unlock('memory'); C.bond(1); }

  function tryLearn(n, raw) {
    if (!data.cfg.memory) return null;
    var m = raw.match(/(?:je m['’ ]?appelle|mon pr[ée]nom (?:c['’ ]?est|est)|appelle[- ]moi|tu peux m['’ ]?appeler)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]{1,20})/i);
    if (m) { data.userName = title(m[1]); learned(); return C.line('mem.name', 'Enchantée, {0}. Je retiens.', data.userName); }
    m = n.match(/^(?:mon )?jeu (?:prefere|favori) (?:c est|est|ce serait) (.+)$/);
    if (m) { data.favGame = title(m[1]); learned(); return C.line('mem.game', '{0} ? Noté. Bon goût.', data.favGame); }
    m = n.match(/^je (?:travaille|bosse|code) (?:sur|a) (.+)$/);
    if (m) {
      if (m[1] === 'toi' || m[1] === 'capri') return C.line('mem.onme', 'Sur moi ? Fais-moi belle, alors.');
      data.project = title(m[1].replace(/^(un|une|le|la|les|mon|ma|mes) /, ''));
      learned();
      return C.line('mem.project', '{0}. Je te demanderai où t\'en es.', data.project);
    }
    m = n.match(new RegExp('(?:mon anniv(?:ersaire)?|je suis nee?|ma date de naissance)(?: c est| est| le| ce)* (?:le )?(\\d{1,2})(?:er)? (\\d{1,2}|' + MONTHS.join('|') + ')\\b'));
    if (m) {
      var d = +m[1], mo = isNaN(+m[2]) ? MONTHS.indexOf(m[2]) + 1 : +m[2];
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
        data.birthday = ('0' + d).slice(-2) + '/' + ('0' + mo).slice(-2);
        learned();
        return C.line('mem.birthday', "Le {0}. C'est gravé dans ma mémoire.", d + ' ' + MONTHS_FR[mo - 1]);
      }
    }
    m = n.match(/^(?:ma ville (?:c est|est)|j habite (?:a|au|en|aux)|je vis (?:a|au|en|aux)) (.+)$/);
    if (m) { var city = title(m[1]); C.weather.setCity(city); return C.line('mem.city', '{0}. Je surveille ton ciel, maintenant.', city); }
    m = n.match(/^j (?:aime|adore|kiffe) (?:bien |trop |beaucoup )?(.+)$/);
    if (m) {
      if (data.likes.indexOf(m[1]) < 0) data.likes.push(m[1]);
      data.likes = data.likes.slice(-20);
      data.dislikes = data.dislikes.filter(function (x) { return x !== m[1]; });
      learned();
      return C.line('mem.like', "T'aimes {0}. Je retiens.", m[1]);
    }
    m = n.match(/^je (?:deteste|hais|supporte pas|n aime pas|aime pas) (.+)$/);
    if (m) {
      if (data.dislikes.indexOf(m[1]) < 0) data.dislikes.push(m[1]);
      data.dislikes = data.dislikes.slice(-20);
      data.likes = data.likes.filter(function (x) { return x !== m[1]; });
      learned();
      return C.line('mem.dislike', 'Pas fan de {0}. Noté.', m[1]);
    }
    if (/(comment je m appelle|c est quoi mon (nom|prenom)|tu te souviens de moi|qu est ce que tu sais sur moi|tu sais quoi sur moi|tu connais mon nom|tu te rappelles de moi)/.test(n)) return recall();
    return null;
  }

  function recall() {
    var p = [];
    if (data.userName) p.push("tu t'appelles " + data.userName);
    if (data.favGame) p.push("ton jeu préféré, c'est " + data.favGame);
    if (data.project) p.push('tu bosses sur ' + data.project);
    if (data.birthday) p.push("ton anniversaire, c'est le " + data.birthday);
    if (data.city) p.push('tu vis à ' + data.city);
    if (data.likes.length) p.push("t'aimes " + data.likes.slice(-3).join(', '));
    if (data.dislikes.length) p.push('tu supportes pas ' + data.dislikes[data.dislikes.length - 1]);
    if (!p.length) return C.line('mem.empty', "Je sais rien de toi pour l'instant. Dis-moi « je m'appelle ... » pour commencer.");
    return C.line('mem.recall', 'Voilà ce que je sais : {0}.', p.join(', '));
  }

  C.memRemark = function () {
    if (!data.cfg.memory) return null;
    var o = [];
    if (data.favGame) o.push(C.line('mem.r.fav', 'Toujours accro à {0} ?', data.favGame));
    if (data.project) o.push(C.line('mem.r.project', 'Alors, ça avance, {0} ?', data.project));
    if (data.likes.length) o.push(C.line('mem.r.like', "Au fait, t'aimes toujours {0} ?", pick(data.likes)));
    if (data.dislikes.length) o.push(C.line('mem.r.dislike', 'Je repensais à ton truc contre {0}. Je te comprends.', pick(data.dislikes)));
    if (data.userName) o.push(C.line('mem.r.name', "{0}... t'as bu de l'eau aujourd'hui ?", data.userName));
    return o.length ? pick(o) : null;
  };

  // anniversaire de l'utilisateur et de la rencontre (une fois par jour)
  C.checkDates = function () {
    if (!data.cfg.anniversaries) return;
    var now = new Date(), key = now.toISOString().slice(0, 10);
    if (data.lastCelebrated === key) return;
    var dm = ('0' + now.getDate()).slice(-2) + '/' + ('0' + (now.getMonth() + 1)).slice(-2);
    if (data.cfg.memory && data.birthday === dm) {
      data.lastCelebrated = key; C.save();
      C.celebrate(C.line('birthday', "Joyeux anniversaire, {0} ! Je te fais la fête.", data.userName || 'choom'));
      C.unlock('birthday');
      return;
    }
    var met = data.firstMet.split('-');
    if (+met[1] === now.getMonth() + 1 && +met[2] === now.getDate() && now.getFullYear() > +met[0]) {
      var y = now.getFullYear() - +met[0];
      data.lastCelebrated = key; C.save();
      C.celebrate(C.line('metday', "Ça fait {0} qu'on se connaît. Joyeux anniversaire de rencontre !", y + (y > 1 ? ' ans' : ' an')));
      C.unlock('met');
    }
  };

  // ---------- compréhension des messages ----------
  C.norm = function (s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  };

  var pending = null, prefix = '';
  function reply(t) { C.reply(prefix + t); prefix = ''; }
  function P(key) { var normal = Array.prototype.slice.call(arguments, 1); return C.line(key, pick(normal)); }
  function ask(q, onYes) { pending = onYes; reply(q); }

  function open(url) { window.open(url, '_blank'); }
  function google(q) { open('https://www.google.com/search?q=' + encodeURIComponent(q)); }

  // ---------- mini IA : répond aux questions avec le web (sans compte) ----------
  // Sources de secours de l'IA : DuckDuckGo puis Wikipédia.
  // done({ text, src, url }) ou done(null) si rien de fiable.
  function topic(q) {
    var s = q.toLowerCase().replace(/[’']/g, ' ').replace(/[?!.]+/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/^((hey|dis|ok) )?capri,? /, '');
    s = s.replace(/^(dis moi |explique moi |explique |sais tu |tu sais |est ce que tu sais )/, '');
    s = s.replace(/^(c est quoi|c etait quoi|c était quoi|qu est ce que c est que|qu est ce que c est|qu est ce qu|qu est ce que|qui est|qui était|qui etait|qui sont|que veut dire|que signifie|définition de|definition de|définis|definis|parle moi de|quel est|quelle est|quels sont|quelles sont|où se trouve|ou se trouve|où est|ou est)\s+/, '');
    s = s.replace(/^(le|la|les|l|un|une|des|du|de|d)\s+/, '');
    return s.trim() || q;
  }
  // mots importants de la question (sans accents ni petits mots) : pour chercher et vérifier que la réponse en parle
  var STOP = /^(a|au|aux|de|des|du|d|le|la|les|l|un|une|et|ou|en|est|sont|il|elle|ils|elles|on|y|ce|ces|cet|cette|qui|que|quoi|qu|quel|quelle|quels|quelles|combien|comment|pourquoi|quand|dans|sur|pour|par|avec|ont|fait|faire|ai|as|mon|ma|mes|ton|ta|tes|son|sa|ses)$/;
  function keywords(q) { return C.norm(q).split(' ').filter(function (w) { return w.length > 1 && !STOP.test(w); }); }
  function relevant(q, a) {
    var hay = C.norm(a.title + ' ' + a.text), kw = keywords(q);
    if (!kw.length) return true;
    return kw.some(function (w) { return hay.indexOf(w.length > 5 ? w.slice(0, w.length - 1) : w) >= 0; });
  }
  function brief(t) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    var parts = t.match(/[^.!?]+[.!?]+(\s|$)/g) || [t], out = '';
    for (var i = 0; i < parts.length && i < 2; i++) { if (out && (out + parts[i]).length > 320) break; out += parts[i]; }
    out = out.trim() || t;
    return out.length > 340 ? out.slice(0, 337) + '...' : out;
  }
  function getJson(url) {
    var ctl = window.AbortController ? new AbortController() : null;
    if (ctl) setTimeout(function () { ctl.abort(); }, 7000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function fromDdg(q) {
    return getJson('https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&kl=fr-fr&q=' + encodeURIComponent(q))
      .then(function (d) {
        if (d.Answer && typeof d.Answer === 'string') return { text: brief(d.Answer), src: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' + encodeURIComponent(q) };
        if (d.AbstractText) return { text: brief(d.AbstractText), src: d.AbstractSource || 'DuckDuckGo', url: d.AbstractURL };
        if (d.Definition) return { text: brief(d.Definition), src: d.DefinitionSource || 'DuckDuckGo', url: d.DefinitionURL };
        return null;
      });
  }
  // Wikipédia : d'abord avec la phrase, puis avec les seuls mots importants si la première page ne parle pas du sujet
  function fromWiki(q) { return wiki(q); }
  function fromWikiKw(q) { var k = keywords(q).join(' '); return k && k !== q ? wiki(k) : Promise.resolve(null); }
  function wiki(q) {
    return getJson('https://fr.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=' + encodeURIComponent(q))
      .then(function (d) {
        var hit = d.query && d.query.search && d.query.search[0];
        if (!hit) return null;
        return getJson('https://fr.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(hit.title.replace(/ /g, '_'))).then(function (s) {
          if (!s.extract || s.type === 'disambiguation') return null;
          return { title: hit.title, text: brief(s.extract), src: 'Wikipédia', url: s.content_urls && s.content_urls.desktop ? s.content_urls.desktop.page : 'https://fr.wikipedia.org/wiki/' + encodeURIComponent(hit.title) };
        });
      });
  }
  // ---------- vraie IA : Pollinations.ai (gratuit, sans compte ni clé, 1 réponse / 45 s par connexion) ----------
  // done(texte) ou done(null) si l'IA ne répond pas ; wait(secondes) prévient quand il faut patienter
  var aiHistory = [];
  function aiSystem() {
    var p = "Tu es Capri, une IA de compagnie au style cyberpunk (Night City), dans une petite appli. " +
      "Tu tutoies, tu réponds en français, de façon juste, directe et naturelle, en 1 à 3 phrases courtes, sans markdown. " +
      "Si tu ne sais pas, dis-le simplement. Ne mentionne jamais Google, ni le modèle ou l'entreprise derrière toi.";
    if (data.userName) p += " La personne s'appelle " + data.userName + ".";
    return p;
  }
  C.ai = function (text, done, wait) {
    var msgs = [{ role: 'system', content: aiSystem() }].concat(aiHistory.slice(-6), [{ role: 'user', content: text }]), tries = 0;
    (function go() {
      var ctl = window.AbortController ? new AbortController() : null;
      if (ctl) setTimeout(function () { ctl.abort(); }, 30000);
      fetch('https://text.pollinations.ai/openai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'openai', messages: msgs }), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (d) {
          var e = d && d.error, after = JSON.stringify(e || '').match(/after (\d+)\s*s/i);
          // limite gratuite : on patiente puis on réessaie une fois
          if (e && /FREE_LIMIT|limit/i.test(JSON.stringify(e)) && tries++ < 1) {
            var sec = Math.min(50, Math.max(2, after ? parseInt(after[1], 10) + 1 : 46));
            if (wait) wait(sec);
            setTimeout(go, sec * 1000); return;
          }
          var out = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
          if (!out) { done(null); return; }
          out = String(out).replace(/[*_#`]+/g, '').trim();
          aiHistory.push({ role: 'user', content: text }, { role: 'assistant', content: out });
          if (aiHistory.length > 12) aiHistory = aiHistory.slice(-12);
          done(out);
        }, function () { done(null); });
    })();
  };

  C.webAnswer = function (question, done) {
    var q = topic(question), srcs = [fromDdg, fromWiki, fromWikiKw], i = 0;
    (function next() {
      if (i >= srcs.length) { done(null); return; }
      srcs[i++](q).then(function (a) { if (a && a.text && relevant(q, { title: a.title || '', text: a.text })) done(a); else next(); }, next);
    })();
  };

  C.handle = function (raw) {
    var text = raw.trim();
    if (!text) return;
    var n = C.norm(text);
    var polite = /\b(s il te plait|s il vous plait|stp|svp|merci)\b/.test(n);
    prefix = '';
    data.messages++;
    if (data.messages >= 1) C.unlock('chat1');
    if (data.messages >= 100) C.unlock('chat100');
    if (data.messages >= 500) C.unlock('chat500');
    var h = new Date().getHours();
    if (h >= 3 && h < 5) C.unlock('night');
    C.bond(polite ? 2 : 1);
    if (C.cred) C.cred.add(2);
    if (data.cfg.personality && C.tier() === 0) {
      if (polite) { if (Math.random() < 0.4) prefix = C.line('polite', ''); }
      else if (/^(lance|ouvre|ferme|cherche|viens|danse|dors|bouge|fais|mets)\b/.test(n) && Math.random() < 0.3) prefix = C.line('order', '');
    }
    n = n.replace(/^((hey|he|ok|dis|eh|yo) )?capri\b ?/, '').trim();
    n = n.replace(/^(s il te plait|stp|svp|peux tu|tu peux|pourrais tu|est ce que tu peux) /, '').trim();
    n = n.replace(/ (s il te plait|stp|svp|merci|capri)$/, '').trim();

    if (pending) {
      var a = pending; pending = null;
      if (/^(oui|ouais|ouai|yes|ok|vas y|go|d accord|carrement|bien sur|oui vas y)$/.test(n)) { a(); return; }
      if (/^(non|nan|no|nope|laisse tomber|annule|pas la peine)$/.test(n)) { reply('Ok, laisse tomber.'); return; }
    }
    if (!n) { C.stage.wave(); reply(P('call', 'Oui ?', "Je t'écoute.")); return; }
    if (tryLocal(n, text)) return;

    // pas une commande : c'est l'IA qui répond (secours : résumé DuckDuckGo / Wikipédia)
    C.stage.talkFor(1.5);
    C.ai(text, function (a) {
      if (a) { reply(a); return; }
      C.webAnswer(text, function (w) {
        if (w) reply(w.text);
        else { C.showError(); reply(P('aidown', "Mon module d'IA ne répond pas, et je trouve rien de fiable. Réessaie dans une minute.")); }
      });
    }, function (sec) { reply(P('aiwait', 'Je reprends mon souffle... réponse dans {0} s.').replace('{0}', sec)); });
  };

  function tryCalc(raw) {
    var s = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/[?!.\s]+$/, '');
    var m = s.match(/^(?:capri[ ,]*)?(?:combien (?:font|fait|ca fait)|ca fait combien|calcule[rz]?|calcul|c est combien)\s*:?\s*(.+)$/);
    var explicit = !!m;
    if (m) s = m[1];
    s = s.replace(/\bdivise(e)? par\b|\bsur\b/g, '/').replace(/\bfois\b|\bmultiplie(e)? par\b|(\d)\s*x\s*(?=[\d(])/g, function (a, b, c) { return (c || '') + '*'; })
      .replace(/\bplus\b/g, '+').replace(/\bmoins\b/g, '-').replace(/\bpuissance\b/g, '^').replace(/\bau carre\b/g, '^2').replace(/,/g, '.').replace(/\s+/g, '');
    if (!/^[\d.+\-*/^()]+$/.test(s)) return null;
    if (!explicit && !/\d[+\-*/^]/.test(s)) return null;
    var i = 0;
    function expr() { var v = term(); while (s[i] === '+' || s[i] === '-') { var o = s[i++], r = term(); v = o === '+' ? v + r : v - r; } return v; }
    function term() { var v = pow(); while (s[i] === '*' || s[i] === '/') { var o = s[i++], r = pow(); v = o === '*' ? v * r : v / r; } return v; }
    function pow() { var b = un(); if (s[i] === '^') { i++; return Math.pow(b, pow()); } return b; }
    function un() {
      if (s[i] === '-') { i++; return -un(); }
      if (s[i] === '(') { i++; var v = expr(); if (s[i] !== ')') throw 0; i++; return v; }
      var st = i; while (i < s.length && /[\d.]/.test(s[i])) i++;
      if (st === i) throw 0;
      return parseFloat(s.slice(st, i));
    }
    try { var v = expr(); return i === s.length ? v : null; } catch (e) { return null; }
  }

  var NUMW = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, quinze: 15, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
  var timers = [];
  function tryTimer(n) {
    if (/^(annule|arrete|stop|supprime)( le| les| mon| mes)? (minuteur|minuteurs|timer|timers|rappel|rappels|alarme)$/.test(n)) {
      var c = timers.length; timers.forEach(clearTimeout); timers = [];
      reply(c ? 'Minuteur annulé.' : "Il n'y a aucun minuteur en cours.");
      return true;
    }
    if (!/\b(minuteur|timer|chrono|rappelle|rappel|previens|alarme)\b/.test(n)) return false;
    var m = n.match(new RegExp('\\b(\\d+|' + Object.keys(NUMW).join('|') + ')\\s*(secondes?|sec|s|minutes?|mins?|mn|heures?|h)\\b(?:\\s+(?:de|d|que|pour|a|qu)\\s+(.+))?'));
    if (!m) { reply('Dis-moi la durée, par exemple « minuteur 5 minutes ».'); return true; }
    var amount = isNaN(+m[1]) ? NUMW[m[1]] : +m[1], unit = m[2];
    var sec = unit[0] === 'h' ? amount * 3600 : unit[0] === 'm' ? amount * 60 : amount;
    if (sec <= 0 || sec > 86400) { reply('Choisis une durée entre 1 seconde et 24 heures.'); return true; }
    var what = m[3] || '';
    var id = setTimeout(function () {
      timers = timers.filter(function (x) { return x !== id; });
      try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { }
      C.beep();
      C.stage.come();
      C.reply(what ? 'Rappel : ' + what + ' !' : 'Bip bip ! Le minuteur est terminé.');
    }, sec * 1000);
    timers.push(id);
    var dur = amount + ' ' + (unit[0] === 'h' ? (amount > 1 ? 'heures' : 'heure') : unit[0] === 'm' ? (amount > 1 ? 'minutes' : 'minute') : (amount > 1 ? 'secondes' : 'seconde'));
    reply((what ? 'Ok, je te rappelle dans ' + dur + ' : ' + what + '.' : 'Minuteur lancé pour ' + dur + '.') + ' Garde l\'appli ouverte.');
    return true;
  }

  // ---------- messages : « {appli} {destinataire} {message} » (l'utilisateur appuie lui-même sur Envoyer) ----------
  var APPS = 'discord|whatsapp|telegram|sms|messenger|mail|email|e-mail|signal|instagram|insta|snapchat|snap';
  function go(url) { if (/^https?:/.test(url)) window.open(url, '_blank'); else location.href = url; }
  function copy(t) { try { navigator.clipboard.writeText(t); } catch (e) { } }
  function contactOf(name) {
    var k = Object.keys(data.contacts).filter(function (x) { return C.norm(x) === C.norm(name); })[0];
    return k ? data.contacts[k] : null;
  }
  function tryMessage(raw) {
    var n = C.norm(raw), m, t = raw.trim();
    if (/^(mes contacts|contacts|liste des contacts|carnet)$/.test(n)) {
      var keys = Object.keys(data.contacts);
      if (!keys.length) { reply('Ton carnet est vide. Ajoute quelqu\'un : « contact Léo +33612345678 ».'); return true; }
      keys.forEach(function (k) { C.sys(k + ' = ' + data.contacts[k]); });
      reply(keys.length + ' contact(s) dans ton carnet.');
      return true;
    }
    m = t.match(/^(?:supprime|efface|retire)\s+(?:le\s+)?contact\s+(\S+)$/i);
    if (m) {
      var key = Object.keys(data.contacts).filter(function (x) { return C.norm(x) === C.norm(m[1]); })[0];
      if (!key) { reply('Pas de « ' + m[1] + ' » dans ton carnet.'); return true; }
      delete data.contacts[key]; C.save();
      reply(key + ' supprimé du carnet.');
      return true;
    }
    m = t.match(/^(?:(?:ajoute|enregistre|nouveau)\s+(?:le\s+|un\s+)?)?contact\s+(\S+)\s+(\+?[\d\s.\-]{6,}|\S+@\S+|@\S+)$/i);
    if (m) {
      var val = m[2].trim();
      if (val.indexOf('@') < 0) val = val.replace(/[\s.\-]/g, '');
      Object.keys(data.contacts).forEach(function (x) { if (C.norm(x) === C.norm(m[1])) delete data.contacts[x]; });
      data.contacts[m[1]] = val; C.save();
      reply(C.line('contact.saved', '{0} ajouté au carnet ({1}).', m[1], val));
      return true;
    }
    m = t.match(new RegExp('^(' + APPS + ')\\s+(\\S+)\\s+([\\s\\S]+)$', 'i'));
    if (!m) return false;
    var app = m[1].toLowerCase(), to = m[2], msg = m[3].trim(), who = to.replace(/^@/, '');
    var contact = contactOf(to) || (to.indexOf('@') >= 0 || /^\+?\d{6,}$/.test(to) ? to : null);
    var digits = contact ? contact.replace(/\D/g, '') : '', txt = encodeURIComponent(msg);
    if (app === 'whatsapp') {
      go(digits.length >= 6 ? 'https://wa.me/' + digits + '?text=' + txt : 'https://wa.me/?text=' + txt);
      reply(digits.length >= 6 ? C.line('msg.ready', 'Message pour {0} prêt dans {1}. Appuie sur Envoyer.', who, 'WhatsApp')
        : 'Message prêt dans WhatsApp : choisis ' + who + ' dans la liste, puis Envoyer. (« contact ' + who + ' +33... » pour ouvrir direct sa conversation.)');
    } else if (app === 'sms') {
      if (digits.length < 6) { reply('Il me faut le numéro de ' + who + ' : « contact ' + who + ' +33612345678 ».'); return true; }
      go('sms:' + (contact.charAt(0) === '+' ? '+' : '') + digits + '&body=' + txt);
      reply(C.line('msg.ready', 'Message pour {0} prêt dans {1}. Appuie sur Envoyer.', who, 'Messages'));
    } else if (app === 'telegram') {
      copy(msg);
      var user = (contact && contact.charAt(0) === '@') ? contact : (to.charAt(0) === '@' ? to : null);
      go(user ? 'https://t.me/' + user.slice(1) : 'https://t.me/share/url?url=%20&text=' + txt);
      reply('Telegram ouvert pour ' + who + '. Le message est aussi copié : colle-le si besoin, puis Envoyer.');
    } else if (/^(mail|email|e-mail)$/.test(app)) {
      if (!contact || contact.indexOf('@') < 0) { reply('Il me faut l\'adresse de ' + who + ' : « contact ' + who + ' nom@mail.com ».'); return true; }
      go('mailto:' + contact + '?body=' + txt);
      reply(C.line('msg.ready', 'Message pour {0} prêt dans {1}. Appuie sur Envoyer.', who, 'Mail'));
    } else {
      copy(msg);
      var label = { insta: 'Instagram', instagram: 'Instagram', snap: 'Snapchat', snapchat: 'Snapchat', discord: 'Discord', messenger: 'Messenger', signal: 'Signal' }[app];
      var url = { discord: 'https://discord.com/channels/@me', messenger: 'https://www.messenger.com/', instagram: 'https://www.instagram.com/direct/inbox/', insta: 'https://www.instagram.com/direct/inbox/',
        snapchat: 'https://www.snapchat.com/', snap: 'https://www.snapchat.com/', signal: 'sgnl://' }[app];
      go(url);
      reply(C.line('msg.copied', '{1} ouvert. J\'ai copié ton message : ouvre la conversation de {0}, colle-le et envoie.', who, label));
    }
    return true;
  }

  function tryLocal(n, raw) {
    var m, s = C.stage;

    if (tryMessage(raw)) return true;
    if (C.tryNew && C.tryNew(n, raw, reply, ask, P)) return true;

    if (/^(aide|help|commandes|tu sais faire quoi|que sais tu faire|qu est ce que tu sais faire)$/.test(n)) {
      reply('Dis-moi par exemple « mets de la musique », « mode fête », « jeu », « météo », « combat » ou « je m\'appelle ... ». Tout est dans l\'onglet COMMANDES.');
      return true;
    }
    if (/^(au revoir|bye|quitte|quitte toi|ferme toi|eteins toi|deconnecte toi|a plus|ciao)$/.test(n)) { reply(P('bye', 'À plus, choom.')); return true; }

    var calc = tryCalc(raw);
    if (calc != null) {
      var v = !isFinite(calc) ? '... une division par zéro. Bien essayé' : (Math.round(calc * 1e6) / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 6 });
      reply(C.line('calc', 'Ça fait {0}.', v));
      return true;
    }
    if (tryTimer(n)) return true;

    if (/^((on )?(joue|jouer|jouons)( a un jeu| avec moi| a quelque chose)?|(un |le |lance le |lance un |on fait un )?(mini ?jeu|jeu)( de hack(ing)?)?|partie)$/.test(n)) {
      reply(P('game', 'Breach Protocol. Reproduis la séquence avant la fin du chrono.'));
      C.game.start();
      return true;
    }
    if (/^(mes )?(succes|trophees|achievements)$/.test(n)) {
      if (!data.cfg.achievements) { reply('Les succès sont désactivés dans les paramètres.'); return true; }
      C.achSummary().forEach(function (l) { C.sys(l); });
      reply(P('ach.list', 'Voilà ton tableau de chasse.'));
      return true;
    }
    if (/^oublie (tout|moi|ce que tu sais( sur moi)?)$/.test(n)) {
      ask(P('mem.forget?', "J'efface tout ce que je sais sur toi ? (oui / non)"), function () {
        data.userName = data.favGame = data.project = data.birthday = ''; data.likes = []; data.dislikes = []; C.save();
        reply(P('mem.forgot', 'Effacé. On repart de zéro.'));
      });
      return true;
    }
    var learned = tryLearn(n, raw);
    if (learned) { reply(learned); return true; }

    // radio
    var stn = C.radio.find(n);
    if (/^((mets|met|lance|allume|joue|passe)( moi)? (de la |la |un peu de |du )?(musique|radio|son|zik|synthwave)( cyberpunk| synthwave| de night city)?|radio( night city)?)$/.test(n) || (stn >= 0 && /^(mets|met|lance|passe|joue)\b/.test(n))) {
      if (!data.cfg.radio) { reply('La radio est coupée dans les paramètres.'); return true; }
      C.radio.play(stn);
      reply(C.line('radio.start', 'Radio Night City en ligne : {0}.', C.radio.current().name));
      return true;
    }
    if (/^(change de station|station suivante|autre station|change de musique|autre musique|zappe|musique suivante|suivante|next)$/.test(n) && C.radio.playing) {
      C.radio.next();
      reply(C.line('radio.switch', 'On passe sur {0}.', C.radio.current().name));
      return true;
    }
    if (/^((coupe|arrete|stop|eteins|stoppe)( la| le)? (radio|musique|zik|son)|stop radio|pause)$/.test(n)) { C.radio.stop(); reply(P('radio.stop', 'Radio coupée.')); return true; }
    if (/(quelle musique|c est quoi (cette|la) (musique|chanson)|quel (morceau|titre)|c est quoi ce son)/.test(n)) {
      reply(C.radio.playing && C.radio.track ? 'Sur ' + C.radio.current().name + ' : ' + C.radio.track + '.' : 'Aucune radio en cours. Dis « mets de la musique ».');
      return true;
    }

    // fête
    if (/^((stop|arrete|fin de|coupe)( la| le mode)? fete|fin de la fete)$/.test(n)) { C.party.stop(); reply(P('party.off', 'Fin de la fête.')); return true; }
    if (/^(mode fete|fais la fete|c est la fete|party|on fait la fete|fete|teuf)$/.test(n)) {
      if (!data.cfg.party) { reply('Le mode fête est désactivé dans les paramètres.'); return true; }
      C.ui.closePanel();
      C.party.start(0, true);
      return true;
    }

    // météo
    m = n.match(/^(la )?(meteo|quel temps)( (il )?(fait il|va t il faire|va faire|fait))?( (a|au|en|sur|de))? ?(.*)$/);
    if (m) {
      if (data.cfg.weather) C.weather.ask(m[8].trim());
      else { google('météo ' + m[8]); reply('Voilà la météo.'); }
      return true;
    }
    if (/^(fais pleuvoir|pluie de neons|pluie|fais neiger|neige de neons|orage)$/.test(n)) {
      C.ui.closePanel();
      C.rain(n.indexOf('neige') >= 0 ? 'snow' : n === 'orage' ? 'storm' : 'rain', 30);
      C.unlock('rainneon');
      reply(P('rain.demo', 'Pluie acide sur Night City.'));
      return true;
    }

    // rivale, breach, garde, easter egg
    if (/^(combat|bagarre|duel|fight|appelle (ta )?rivale|rivale|vex)$/.test(n)) {
      if (!data.cfg.rival) { reply('Les visites de la rivale sont désactivées dans les paramètres.'); return true; }
      reply(P('fight.call', "Vex ? Qu'elle vienne."));
      C.ui.closePanel();
      setTimeout(function () { C.vexStart(); }, 1200);
      return true;
    }
    if (/^(breach|breach protocol|hack)$/.test(n)) { reply(P('breach', 'Breach Protocol lancé.')); C.ui.closePanel(); C.breach(); return true; }
    if (/\b(je pars|je m en vais|j y vais|je reviens|je m absente|brb|afk|je sors|je vais (manger|dormir|me doucher|aux toilettes|faire une pause))\b/.test(n)) {
      if (!data.cfg.guard) { reply("Ok, à tout à l'heure !"); return true; }
      reply(P('leave', 'Je verrouille le périmètre. Personne ne passe.'));
      setTimeout(function () { C.ui.closePanel(); C.guard.start(true); }, 1600);
      return true;
    }
    if (/(wake up samurai|reveille toi samourai|debout samourai)/.test(n)) {
      reply(C.LINES.samurai[0][0]);
      C.ui.closePanel();
      C.glitch('> WAKE UP, SAMURAI  //  NIGHT CITY', function () { s.dance(); });
      C.unlock('samurai');
      return true;
    }

    // recherche / sites / traduction
    m = n.match(/^(cherche|recherche|search|google)( moi)? (.+) sur youtube$/) || n.match(/^youtube (.+)$/);
    if (m) { var q = m[3] || m[1]; open('https://www.youtube.com/results?search_query=' + encodeURIComponent(q)); reply('Je cherche « ' + q + ' » sur YouTube.'); return true; }
    m = n.match(/^(cherche|recherche|search|google)( moi)? (.+?)( sur (google|internet|le web|le net))?$/);
    if (m) { google(m[3]); reply(C.line('search', 'Recherche lancée : « {0} ».', m[3])); return true; }
    m = raw.trim().match(/tradui[st]?\s+(.+?)\s+en\s+(\S+)\s*\??$/i);
    if (m) {
      var lang = C.LANGS[C.norm(m[2])] || 'en';
      open('https://translate.google.com/?sl=auto&tl=' + lang + '&op=translate&text=' + encodeURIComponent(m[1].replace(/^["«»' ]+|["«»' ]+$/g, '')));
      reply('Je te traduis ça.');
      return true;
    }
    m = n.match(/^(lance|lancer|ouvre|ouvrir|demarre|va sur|open)( moi)? (le |la |l |les |site |appli |application )?(.+)$/);
    if (m) {
      var target = m[4].replace(/ /g, ''), url = C.SITES[target];
      var um = raw.match(/(https?:\/\/\S+|\b[\w-]+(\.[\w-]+)*\.(com|fr|net|org|io|tv|gg|ai|dev|app|be|ch|ca)(\/\S*)?)/i);
      if (!url && um) url = /^http/i.test(um[0]) ? um[0] : 'https://' + um[0];
      if (url) { open(url); reply(C.line('open', "Ok, j'ouvre {0}.", m[4])); }
      else reply("Sur iPhone, je peux pas lancer d'applis. Mais je peux ouvrir des sites : « ouvre youtube », « ouvre twitch »...");
      return true;
    }

    if (n.indexOf('quelle heure') >= 0 || n === 'heure' || n === 'l heure') {
      var now = new Date();
      reply(C.line('time', 'Il est {0}.', now.getHours() + 'h' + ('0' + now.getMinutes()).slice(-2)));
      return true;
    }
    if (n.indexOf('quel jour') >= 0 || n.indexOf('quelle date') >= 0 || n === 'date' || n === 'la date') {
      reply('On est le ' + new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '.');
      return true;
    }

    // Capri elle-même
    if (/^(dors|dodo|endors toi|repose toi|va dormir|fais dodo|mode veille|veille)$/.test(n)) { s.setSleep(true); reply(P('sleep', 'Mode veille... réveille-moi si besoin.')); return true; }
    if (/^(reveille toi|reveille|debout|reveil|bouge)$/.test(n)) { s.setSleep(false); reply(P('wake', 'Je suis là ! Systèmes en ligne.')); return true; }
    if (/^danse/.test(n)) { s.dance(); reply(P('dance', 'Regarde ça !')); return true; }
    if (/^(fais un )?(eclair|flash|zap|sprint|cours)$/.test(n)) { s.dashRandom(); reply(P('dash', 'Zap !')); return true; }
    if (/^(viens|viens ici|viens la|approche|ici|au pied|reviens)$/.test(n)) { s.come(); reply(P('come', "J'arrive !")); return true; }
    if (/^(salut|bonjour|coucou|hello|yo|hey|bonsoir|wesh|slt)$/.test(n)) {
      s.wave();
      var hl = P('hello', 'Salut, choom !', 'Yo ! Besoin de quelque chose ?');
      reply(data.userName && data.cfg.memory && Math.random() < 0.5 ? hl.replace(/[.!]?$/, ', ' + data.userName + '.') : hl);
      return true;
    }
    if (/(blague|fais moi rire|un truc drole)/.test(n)) { reply(C.line('joke', pick(C.JOKES))); return true; }

    for (var i = 0; i < C.SMALLTALK.length; i++) {
      var st = C.SMALLTALK[i];
      if (!st[0].test(n)) continue;
      var key = st[1], normal = st.slice(2);
      if (key === 'insult') C.bond(-8);
      else if (key === 'praise' || key === 'love') C.bond(2);
      if (!normal.length && !C.hasLine(key)) continue;
      reply(normal.length ? C.line(key, pick(normal)) : C.line(key, ''));
      if (key === 'praise' && (C.tier() > 0 || !data.cfg.personality)) s.dance();
      return true;
    }
    return false;
  }
})();
