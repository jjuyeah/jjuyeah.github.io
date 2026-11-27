# jjuyeah.github.io

개인 홈페이지 (https://jjuyeah.github.io). 기존 Google Sites(sites.google.com/view/jjuyeah)에서 이전.

빌드 과정 없는 순수 HTML/CSS/JS 사이트입니다. `main` 브랜치에 push하면 GitHub Pages가 그대로 배포합니다.

## 구조

```
index.html               # 뼈대: 상단 메뉴, 프로필 사이드바, 섹션 틀(제목만)
sections/                # ← 섹션별 내용. 평소에는 여기만 수정
  about.html
  education.html
  experience.html
  publications.html
  projects.html
  teaching.html
assets/js/main.js        # sections/*.html 불러오기, 메뉴 스크롤/강조
assets/css/style.css     # 스타일 (색상은 맨 위 :root 변수에서 변경, 다크 모드 자동 지원)
assets/img/              # 프로필 사진, 파비콘
files/                   # CV 등 PDF 파일 (예: files/cv.pdf)
404.html                 # 없는 주소로 들어왔을 때 페이지
.nojekyll                # Jekyll 처리 끄기 (정적 파일 그대로 배포)
```

## 내용 수정

- **섹션 내용**: `sections/<이름>.html` 을 수정합니다. 각 파일 맨 위 주석에 작성 형식이 적혀 있습니다.
- **논문 추가**: `sections/publications.html` 의 해당 연도 `<ul class="pubs">` 안에 기존 `<li>` 하나를 복사해서 수정. 본인 이름은 `<b>Juyeob Lee</b>`, 교신저자 `*`, 공동 1저자 `#`.
- **아직 채우지 않은 링크**: `data-todo` 로 검색 → 실제 URL로 바꾸고 `data-todo` 삭제.
- **섹션 추가/삭제/순서 변경**: `index.html` 의 `<section id="..." data-src="sections/....html">` 와 상단 메뉴(`nav-links`)를 함께 수정.
- **프로필(사진·이름·이메일·Scholar)**: `index.html` 의 `<aside class="sidebar">`. 사진 파일은 `assets/img/profile.jpg` (정사각형 권장).

## 로컬 미리보기

섹션 파일을 `fetch` 로 불러오기 때문에 **`index.html` 을 더블클릭해서 열면 내용이 안 보입니다** (브라우저 보안 정책).
저장소 폴더에서 간단한 서버를 띄워서 확인하세요:

```
python -m http.server 8000
# 브라우저에서 http://localhost:8000
```

VS Code를 쓰면 Live Server 확장으로 열어도 됩니다.

## 배포 설정 (최초 1회)

GitHub 저장소 → Settings → Pages → Source: **Deploy from a branch**, Branch: **main / (root)**.
