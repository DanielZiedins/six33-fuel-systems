// SIX33 Fuel Systems — shared script for generated pages (journal, privacy, 404).
// Same rules as the homepage: anonymous counts only, production host only,
// never under automation, ?notrack opts out. Inline forms post to /api/waitlist,
// so the server-side bot guard and welcome email apply.
(function () {
  var SUPABASE_URL = 'https://vmpkiwfvnlzraabtjkig.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcGtpd2Z2bmx6cmFhYnRqa2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjMwNzUsImV4cCI6MjA5MjA5OTA3NX0.Yh3reeJYrV1cG6jFIhFHm6apQqclol64D79cq9euy5E';
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (_) {} }
  };
  var params = new URLSearchParams(location.search);
  if (params.has('notrack')) store.set('six33_notrack', '1');
  var TRACKING = /^(www\.)?six33fuel\.com$/.test(location.hostname) && !navigator.webdriver && !store.get('six33_notrack');
  function track(name, label, ref) {
    if (!TRACKING) return;
    try {
      fetch(SUPABASE_URL + '/rest/v1/rpc/six33_fuel_track', {
        method: 'POST', keepalive: true,
        headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_name: name, p_label: label || null, p_path: location.pathname, p_ref: ref || null })
      }).catch(function () {});
    } catch (_) {}
  }
  window.six33Track = track;
  var extRef = null;
  try { if (document.referrer) { var r = new URL(document.referrer); if (r.hostname !== location.hostname) extRef = r.hostname; } } catch (_) {}
  track('pageview', null, extRef);
  // A human signal crawlers don't produce: real scrolling, or staying a while.
  var engaged = false;
  function markEngaged(why) { if (engaged) return; engaged = true; track('engaged', why); }
  addEventListener('scroll', function () { if (scrollY > innerHeight * 0.4) markEngaged('scroll'); }, { passive: true });
  setTimeout(function () { if (document.visibilityState === 'visible') markEngaged('time'); }, 15000);
  var REF_RE = /^[A-Za-z0-9]{4,12}$/;
  var inbound = params.get('ref');
  if (inbound && REF_RE.test(inbound)) { store.set('six33_inbound_ref', inbound.toUpperCase()); track('ref_landing', inbound.toUpperCase()); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (/^https?:/.test(a.getAttribute('href')) && a.hostname !== location.hostname) track('outbound', a.hostname);
    else if (a.hasAttribute('data-cta')) track('cta', a.getAttribute('data-cta'));
  });
  var loadedAt = Date.now();
  var EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;
  Array.prototype.forEach.call(document.querySelectorAll('form[data-join]'), function (form) {
    var box = form.closest('.join'), msg = box.querySelector('.msg'), share = box.querySelector('.share'), btn = form.querySelector('button');
    function say(text, kind) { msg.textContent = text; msg.className = 'msg ' + (kind || ''); }
    function showShare(code) {
      if (!code || !share) return;
      share.querySelector('input').value = 'https://www.six33fuel.com/?ref=' + code;
      share.classList.add('show');
    }
    var mine = store.get('six33_my_ref');
    if (mine && REF_RE.test(mine)) { form.hidden = true; say("✓ You're on the list. Bring your people with your link:", 'ok'); showShare(mine); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (form.email.value || '').trim().toLowerCase();
      if (!EMAIL_RE.test(email)) { say("That email doesn't look right — mind checking it?", 'err'); form.email.focus(); return; }
      btn.disabled = true; say('Joining…');
      var credited = store.get('six33_inbound_ref');
      var meta = { section: 'journal', referrer: (document.referrer || '').slice(0, 300), landing_path: location.pathname,
                   tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '') };
      if (store.get('six33_system')) meta.system_interest = store.get('six33_system');
      fetch('/api/waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, name: null, source: form.getAttribute('data-join'),
          elapsedMs: Date.now() - loadedAt, trap: form.website.value || null, ref: credited, meta: meta })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          if (!res.ok || !d.ok) throw new Error(d.error || 'Something went wrong. Try again, or email hello@thykingdom.net.');
          return d;
        });
      }).then(function (d) {
        if (d.ref_code) { store.set('six33_my_ref', d.ref_code); store.del('six33_inbound_ref'); }
        track('signup', d.is_new === false ? 'returning' : 'new', credited);
        form.hidden = true;
        say(d.is_new === false ? "✓ You're already on the list. Bring your people with your link:" : "✓ You're on the list — check your inbox. Bring your people with your link:", 'ok');
        showShare(d.ref_code);
      }).catch(function (err) {
        say(/fetch|network|load failed/i.test(err.message) ? 'Something went wrong. Try again, or email hello@thykingdom.net.' : err.message, 'err');
        btn.disabled = false;
      });
    });
    var copy = box.querySelector('[data-copy]');
    if (copy) copy.addEventListener('click', function () {
      var input = share.querySelector('input');
      (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject())
        .then(function () { copy.textContent = 'Copied ✓'; track('share', 'copy'); })
        .catch(function () { input.select(); });
    });
  });
})();
