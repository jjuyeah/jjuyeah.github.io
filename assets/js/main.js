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
      .then(function (html) {
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
