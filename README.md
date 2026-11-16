# wooSak! — 흑백 인터랙티브 아트 아카이브

미디어 아트, 앰비언트 사운드, 이미지를 전시하는 반응형 웹사이트입니다. 순수 HTML/CSS/JavaScript로 제작했으며, 공개 사이트는 서버나 외부 서비스 없이 **GitHub Pages**에서 동작합니다. 외부 폰트·라이브러리는 사용하지 않습니다. 유튜브 작품은 YouTube 썸네일과 내장 플레이어를 불러옵니다.

## 로컬에서 실행

Node.js 22 이상이 필요합니다. 설치할 외부 패키지는 없습니다.

```sh
npm run dev
```

브라우저에서 **http://127.0.0.1:3000**을 여세요. 포트를 바꾸려면 `PORT=3001 npm run dev`로 실행합니다.

- 포인터에 반응하는 Canvas 파형과 일시 정지 버튼
- Media art / Ambient sound / Visual studies 필터
- 작품 상세 창, 이미지·영상·오디오 플레이어
- 사용자가 켠 뒤에만 재생되는 생성형 앰비언트 사운드
- 모바일 레이아웃, 키보드 포커스, Escape로 창 닫기, 모션 감소 설정 지원

기본 작품은 제공된 유튜브 영상 두 개입니다. 기존 샘플은 제거되어 목록이 비어도 다시 표시되지 않습니다. 영상 제목은 확인하지 못해 `Video 01`, `Video 02`로 임시 지정했습니다. `public/content/works.json`의 `title`을 실제 작품명으로 바꾸면 됩니다.

유튜브 작품은 `youtubeId`에 영상 ID를 저장하며 파일 업로드가 필요하지 않습니다. 제목·설명·연도·순서는 `works.json`에서 수정하세요. 유튜브 작품 삭제는 해당 항목을 목록에서 제거하면 됩니다. 플레이어는 작품을 열 때 로드되고, 창을 닫으면 재생도 중단됩니다. 임베드가 제한된 영상은 상세 창의 YouTube 링크로 감상할 수 있습니다.

## 작품 추가 / 삭제

1. 로컬 서버를 실행합니다.
2. Selected works 오른쪽 **작품 등록**을 누릅니다.
3. 파일, 제목, 분류, 연도, 설명을 입력합니다.
4. `public/media/`에 원본 파일이, `public/content/works.json`에 목록이 저장됩니다.
5. 변경 파일을 GitHub에 커밋·푸시하면 자동으로 배포됩니다.

```sh
git add public/media public/content/works.json
git commit -m "Add new artwork"
git push
```

지원 형식: JPG, PNG, WEBP, GIF, MP4, WEBM, MP3, WAV, OGG, M4A, FLAC. 로컬 등록기는 파일당 **50MB**로 제한합니다. 영상·음성 코덱 재생 지원은 브라우저마다 다르므로 공개 전 확인하세요. 큰 미디어는 웹용으로 압축한 뒤 등록하는 편이 좋습니다.

삭제는 로컬 작품 상세 창 아래 **이 작품 삭제**를 두 번 눌러 확인합니다. 실제 파일도 삭제되므로 백업이 필요하면 먼저 복사하세요. 삭제 사항도 커밋·푸시해야 공개 사이트에 반영됩니다.

공개 GitHub Pages에는 업로드·삭제 버튼이 표시되지 않습니다. 로컬 등록기는 개발 편의를 위한 도구이며 `127.0.0.1`에만 바인딩합니다. GitHub Pages에서는 Node 서버를 실행하지 않습니다.

## GitHub Pages 배포

1. GitHub에 저장소를 만들고 이 프로젝트를 `main` 브랜치로 푸시합니다.
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. **Actions → Deploy artwork archive to GitHub Pages → Run workflow**를 실행합니다. 이후 `main`에 푸시할 때마다 자동으로 검증·빌드·배포됩니다.
4. 워크플로의 배포 결과에서 사이트 URL을 확인합니다.

저장소의 기본 브랜치가 `main`이 아니라면 `.github/workflows/deploy.yml`의 `branches`를 맞추세요. 저장소의 Pages 사용 가능 여부와 Actions 권한은 GitHub 설정에 따릅니다.

모든 사이트 자원과 작품 경로가 상대 경로이므로 `https://계정.github.io/저장소명/`과 사용자 도메인 모두 지원합니다. URL에 저장소 이름을 하드코딩할 필요가 없습니다. 페이지 이동은 해시 링크를 사용하므로 별도의 SPA 라우팅 설정도 필요 없습니다.

배포 설정은 [GitHub 공식 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)를 따릅니다.

## 수정할 곳

| 파일 | 용도 |
| --- | --- |
| `public/index.html` | wooSak! 이름, 소개, 제목, 메타 설명 |
| `public/style.css` | 색상, 타이포그래피, 여백, 반응형 레이아웃 |
| `public/art.js` | 생성형 아트와 포인터 반응 |
| `public/sound.js` | 앰비언트 사운드 합성 |
| `public/app.js` | 샘플 작품, 필터, 상세 보기, 로컬 등록 화면 |
| `public/content/works.json` | 등록한 작품 목록 — Git에 포함 |
| `public/media/` | 업로드한 작품 파일 — Git에 포함 |
| `server.js` | 로컬 미리보기·작품 등록 서버 |
| `.github/workflows/deploy.yml` | GitHub Pages 자동 배포 |

작품 목록의 순서를 바꾸려면 `works.json` 배열의 항목 순서를 바꾸면 됩니다. 제목·설명도 이 파일에서 수정할 수 있습니다. 미디어 파일명과 `id`는 유지하세요.

## 검증 및 정적 빌드

```sh
npm test
npm run check
npm run build
```

빌드는 작품 메타데이터와 실제 파일 존재 여부를 확인한 뒤 `public/`을 `dist/`로 복사합니다. 임시 업로드 파일과 로컬 서버 코드는 배포하지 않습니다. `dist/`는 자동 생성되므로 Git에 넣지 않습니다.

테스트는 네트워크 포트를 열지 않고 실제 요청 핸들러와 파일 스트림을 실행해 저장·삭제·동시 업로드·미디어 구간 요청·잘못된 입력·외부 출처 차단을 검증합니다.
