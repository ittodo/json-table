# JsonTable 데모 가이드 (KO)

이 문서는 데모 앱(./demo)을 사용하여 JSON ↔ CSV/Table 워크플로를 빠르게 체험하고 검증하는 방법을 설명합니다.

## 빠른 시작
- 설치: `npm install`
- 개발 서버: `npm run dev` → 브라우저에서 `http://localhost:5173/demo/index.html`
- 데모 빌드/프리뷰: `npm run preview:demo` → `http://localhost:5179`

## 화면 구성
- JSON Editor: JsonTable 초기 UI의 텍스트 영역(좌측). `init(..., { initialJson })`으로 초기 JSON 로딩 가능.
- Header 패널(우측): 현재 헤더 목록(한 줄 = 한 컬럼). JSON 에디터 높이와 동기화됨.
- 컨트롤 바: Generate Header / Generate CSV / Upload CSV / Download CSV + 옵션(List Strategy, Fixed K, Gap Mode).
- CSV Preview(Table): 헤더/로우를 테이블로 렌더링하고 셀 편집 가능(오버레이 인풋 기반).

## 주요 컨트롤
- Generate Header
  - `Flatten.buildHeaderFromJson(json, { listStrategy, fixedListMax })`로 헤더를 생성합니다.
  - 리스트 컬럼에 대해 +1 인덱스를 추가합니다(예: `items[0]..items[N]`가 보이면 `items[N+1]`도 생성).
  - 이전 헤더가 있으면 루트 유지 규칙으로 일부 컬럼을 보존합니다.

- Generate CSV
- 현재 JSON과 생성된 헤더로 로우를 생성 후 테이블에 렌더링합니다.
- 항상 마지막에 빈 로우를 1개 추가하여 즉시 입력/추가가 가능하게 합니다.

- Upload CSV
- CSV를 업로드하면 `Csv.parseCsvText`(papaparse 기반)로 파싱합니다.
- 첫 행을 헤더로 사용하고, 리스트 컬럼은 +1 인덱스를 확장합니다.
- 로우 폭을 헤더에 맞춰 정규화하고, JSON으로도 즉시 반영합니다(unflatten).

- Download CSV
- 현재 JSON을 기준으로 헤더/로우를 구성하여 CSV를 다운로드합니다.
- 옵션: BOM(true), 개행(CRLF)로 광범위한 호환성을 확보합니다.

## 옵션 의미
- List Strategy
  - `dynamic`: JSON에서 발견된 리스트 길이만큼 컬럼 생성(데이터에 따라 가변).
  - `fixed`: 고정 개수(`Fixed K`)만큼 리스트 컬럼 생성. 데이터가 비어도 해당 인덱스 컬럼은 유지.
- Fixed K
  - `fixed` 전략일 때 리스트 인덱스 최대값(K−1). 예: K=3 → `items[0]..items[2]` 항상 생성.
- Gap Mode
  - `break`: 중간 인덱스가 비면 그 지점에서 끊고 연속 구간만 복원.
  - `sparse`: 중간이 비어도 인덱스를 유지하며 희소 배열로 복원.

## 테이블 편집
- 셀 클릭/Enter/F2로 편집 시작(오버레이 인풋 등장).
- 이동: 화살표키, Tab/Shift+Tab, Enter(다음 행). 열 포커스 시 헤더/셀에 하이라이트가 표시됩니다.
- 편집 커밋 시 JSON으로 즉시 반영되며, 마지막 행에 입력이 생기면 자동으로 새 빈 행이 추가됩니다.

## 헤더 편집
- Header 패널의 텍스트 영역에서 직접 경로를 편집할 수 있습니다(한 줄=한 컬럼). 비어있는 줄은 플레이스홀더가 자동 부여됩니다.
- 테이블 헤더 셀도 직접 편집 가능(컬럼명/경로 변경 시 Header 패널에 반영).

## 경로 규칙(요약)
- 경로 예: `items[0].id`, `user.name`, `stats.hp`
- 배열 인덱스는 `root[i].tail` 형태로 확장되며, 데모는 각 리스트 그룹에 대해 +1 인덱스를 추가해 다음 항목 추가를 용이하게 합니다.

## 샘플 데이터
- CSV: `demo/sample.csv` (따옴표/콤마 이스케이프 예시 포함)
- JSON: `demo/sample.json` (예: `items[*].effects[*]`, `items[*].materials[*]`와 같은 현실적인 중첩 리스트 포함)
- CSV 업로드 또는 JSON 에디터에 붙여넣기 후 Generate Header/CSV로 확인하세요.

## 문제 해결 팁
- 마지막 행이 잘리는 문제: 데모는 셀 최소 높이/오버레이 정렬/스크롤 여유를 반영하여 해결했습니다. 환경에 따라 높이/여유를 CSS에서 조정 가능합니다.
- CSV 구분자: papaparse의 자동 감지에 의존하되, 필요 시 코드에서 `sep`를 지정해 강제할 수 있습니다.
- 헤더 폭 불일치: 업로드 후 로우는 헤더 길이에 맞춰 잘라내거나 빈 셀로 패딩됩니다.

## 공개 API(요약)
- `Flatten.buildHeaderFromJson(json, { listStrategy, fixedListMax })`
- `Flatten.flattenToRow(object, header)` / `Flatten.unflattenFromRow(header, row, gapMode)`
- `Csv.toCsv(header, rows, { sep, bom, newline })`
- `Csv.parseCsvText(text, { sep, hasHeader, skipEmptyLines })`
- `init(container, options).getCsv(opts)`

## 한계 및 계획
- 대용량 가상 스크롤/워커 스트리밍, 멀티셀 붙여넣기, 타입 포매터/파서/검증기 UI는 순차적으로 확장 예정입니다.
