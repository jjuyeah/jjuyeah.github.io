// ============================================================
// 1) sections/*.html 을 불러와 각 <section data-src="..."> 에 넣기
// 2) 상단 메뉴: 클릭 시 부드럽게 스크롤 + 현재 보고 있는 섹션 강조
// ============================================================

(function () {
  var topbar = document.querySelector('.topbar');
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));

  document.getElementById('year').textContent = new Date().getFullYear();

  // ---------- 1) 섹션 파일 불러오기 ----------
  function loadSection(section) {
    var src = section.getAttribute('data-src');
    return fetch(src, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
        return res.text();
      })
      .then(function (text) {
        var html = /\.bib$/i.test(src) ? renderPublications(parseBibtex(text), section) : text;
        section.insertAdjacentHTML('beforeend', html);
      })
      .catch(function (err) {
        var hint = location.protocol === 'file:'
          ? ' 파일을 더블클릭해서 열면 불러올 수 없습니다. 폴더에서 <code>python -m http.server</code> 실행 후 http://localhost:8000 으로 여세요.'
          : '';
        section.insertAdjacentHTML('beforeend',
          '<p class="load-error">Failed to load <code>' + src + '</code> (' + err.message + ').' + hint + '</p>');
      });
  }

  var sectionsToLoad = Array.prototype.slice.call(document.querySelectorAll('section[data-src]'));
  Promise.all(sectionsToLoad.map(loadSection)).then(function () {
    // 내용이 들어와 높이가 바뀌었으므로, 주소에 #섹션 이 있으면 그 위치로 다시 이동
    if (location.hash) {
      var target = document.querySelector(location.hash);
      if (target) scrollToSection(target, 'auto');
    }
    updateActive();
  });

  // ---------- BibTeX → 논문 목록 ----------

  // 아주 작은 BibTeX 파서: @type{key, field = {value} | "value" | number, ...}
  function parseBibtex(text) {
    // 줄 맨 앞이 % 인 줄은 주석으로 보고 제거
    text = text.replace(/^[ \t]*%.*$/gm, '');
    var entries = [];
    var i = 0;
    while ((i = text.indexOf('@', i)) !== -1) {
      var m = /^@(\w+)\s*([{(])/.exec(text.slice(i));
      if (!m) { i++; continue; }
      var type = m[1].toLowerCase();
      var open = m[2], close = open === '{' ? '}' : ')';
      var pos = i + m[0].length;
      var depth = 1, start = pos;
      while (pos < text.length && depth > 0) {
        var c = text[pos];
        if (c === open) depth++;
        else if (c === close) depth--;
        pos++;
      }
      var body = text.slice(start, pos - 1);
      i = pos;
      if (type === 'comment' || type === 'string' || type === 'preamble') continue;

      var comma = body.indexOf(',');
      var entry = { type: type, key: body.slice(0, comma).trim(), fields: {} };
      var rest = body.slice(comma + 1);
      var fre = /\s*([\w-]+)\s*=\s*/g, fm;
      while ((fm = fre.exec(rest))) {
        var name = fm[1].toLowerCase();
        var p = fre.lastIndex, value = '';
        if (rest[p] === '{') {
          var d = 1, s = ++p;
          while (p < rest.length && d > 0) { if (rest[p] === '{') d++; else if (rest[p] === '}') d--; p++; }
          value = rest.slice(s, p - 1);
        } else if (rest[p] === '"') {
          var e = rest.indexOf('"', p + 1);
          value = rest.slice(p + 1, e);
          p = e + 1;
        } else {
          var mm = /^[^,\s}]+/.exec(rest.slice(p));
          value = mm ? mm[0] : '';
          p += value.length;
        }
        entry.fields[name] = value.replace(/\s+/g, ' ').trim();
        var nextComma = rest.indexOf(',', p);
        fre.lastIndex = nextComma === -1 ? rest.length : nextComma + 1;
      }
      entries.push(entry);
    }
    return entries;
  }

  // LaTeX 표기 → 일반 텍스트 (자주 쓰는 것만)
  var ACCENTS = { '"': '̈', "'": '́', '`': '̀', '^': '̂', '~': '̃', 'c': '̧', 'v': '̌', '=': '̄', '.': '̇', 'u': '̆', 'H': '̋' };
  function latexToText(s) {
    return (s || '')
      .replace(/\\(["'`^~=.]|[cvuH](?=[\s{]))\s*\{?\s*([A-Za-z])\}?/g, function (_, a, ch) {
        return ACCENTS[a] ? (ch + ACCENTS[a]).normalize('NFC') : ch;
      })
      .replace(/\\ss\b\s*/g, 'ß')
      .replace(/\\([&%$#_{}])/g, '$1')
      .replace(/---/g, '—')
      .replace(/--/g, '–')
      .replace(/[{}]/g, '')
      .replace(/~/g, ' ')
      .trim();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function safeUrl(u) {
    u = latexToText(u);
    return /^(https?:|mailto:)/i.test(u) || /^[\w./-]+$/.test(u) ? u : '';
  }

  // "Last, First" / "First Last" → "First Last"
  function splitNames(s) {
    if (!s) return [];
    return latexToText(s).split(/\s+and\s+/i).map(function (n) {
      n = n.trim();
      var parts = n.split(',');
      return parts.length >= 2 ? (parts.slice(1).join(',').trim() + ' ' + parts[0].trim()) : n;
    }).filter(Boolean);
  }

  function nameKey(n) { return n.toLowerCase().replace(/[^a-zÀ-￿]/g, ''); }

  function renderPublications(entries, section) {
    var self = (section.getAttribute('data-self') || '').split('|').map(function (s) { return nameKey(s); });

    // 연도별로 묶기 (같은 연도 안에서는 파일 순서 유지)
    // status = {accepted} 인 논문은 연도 대신 맨 위 [Accepted] 그룹으로
    var ACCEPTED = 'Accepted';
    var byYear = {}, years = [];
    entries.forEach(function (e) {
      var accepted = /^\s*accepted\s*$/i.test(e.fields.status || '');
      var y = accepted ? ACCEPTED : (e.fields.year || 'Other').trim();
      if (!byYear[y]) { byYear[y] = []; years.push(y); }
      byYear[y].push(e);
    });
    years.sort(function (a, b) {
      if (a === ACCEPTED || b === ACCEPTED) return a === ACCEPTED ? -1 : 1;
      return (parseInt(b, 10) || 0) - (parseInt(a, 10) || 0);
    });

    var out = ['<p class="note">(* = (co-)corresponding author, # = equally contributions)</p>'];
    years.forEach(function (y) {
      out.push('<h3 class="year">[' + escapeHtml(y) + ']</h3>', '<ul class="pubs">');
      byYear[y].forEach(function (e) { out.push(renderEntry(e.fields, self)); });
      out.push('</ul>');
    });
    return out.join('\n');
  }

  function renderEntry(f, self) {
    var title = escapeHtml(latexToText(f.title));
    var url = safeUrl(f.url || '');
    var corr = splitNames(f.corresponding).map(nameKey);
    var equal = splitNames(f.equal).map(nameKey);

    var authors = splitNames(f.author).map(function (n) {
      var k = nameKey(n);
      var label = escapeHtml(n) + (equal.indexOf(k) !== -1 ? '#' : '') + (corr.indexOf(k) !== -1 ? '*' : '');
      return self.indexOf(k) !== -1 ? '<b>' + label + '</b>' : label;
    }).join(', ');

    var venue = latexToText(f.venue || f.journal || f.booktitle || '');
    if (f.index) venue += ' (' + latexToText(f.index) + ')';

    var html = '<li>';
    html += url
      ? '<a class="pub-title" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + title + '</a>'
      : '<span class="pub-title">' + title + '</span>';
    if (f.title_ko) html += '<p class="pub-title-ko">(' + escapeHtml(latexToText(f.title_ko)) + ')</p>';
    html += '<p class="pub-authors">' + authors + '</p>';
    if (venue) html += '<p class="pub-venue">' + escapeHtml(venue) + '</p>';
    var dataset = safeUrl(f.dataset || '');
    if (dataset) html += '<p class="pub-links"><a href="' + escapeHtml(dataset) + '" target="_blank" rel="noopener">[Dataset]</a></p>';
    return html + '</li>';
  }

  // ---------- 2) 메뉴 스크롤 + 현재 섹션 강조 ----------
  function scrollToSection(target, behavior) {
    var y = target.getBoundingClientRect().top + window.pageYOffset - topbar.offsetHeight - 16;
    window.scrollTo({ top: y, behavior: behavior || 'smooth' });
  }

  var navSections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });

  links.forEach(function (a, i) {
    a.addEventListener('click', function (e) {
      var target = navSections[i];
      if (!target) return;
      e.preventDefault();
      scrollToSection(target);
      history.replaceState(null, '', a.getAttribute('href'));
    });
  });

  function updateActive() {
    var offset = topbar.offsetHeight + 40;
    var current = 0;
    navSections.forEach(function (s, i) {
      if (s && s.getBoundingClientRect().top - offset <= 0) current = i;
    });
    // 페이지 맨 아래에 도달하면 마지막 섹션 강조
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 2) {
      current = navSections.length - 1;
    }
    links.forEach(function (a, i) { a.classList.toggle('active', i === current); });
  }

  window.addEventListener('scroll', updateActive, { passive: true });
  window.addEventListener('resize', updateActive);
  updateActive();
})();
