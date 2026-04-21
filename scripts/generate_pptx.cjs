/* eslint-disable */
const pptxgen = require("/tmp/node_modules/pptxgenjs");
const path = require("path");

const COLOR = {
  primary: "0E5C8A",
  primaryDark: "0A4566",
  accent: "4FB3BF",
  accentSoft: "B8E0E4",
  bg: "F2F7F9",
  bgAlt: "E8F1F4",
  textDark: "1A2B3C",
  textMute: "6B7785",
  white: "FFFFFF",
  success: "2E7D5B",
  successSoft: "DCEFE5",
  warn: "C77E1E",
  warnSoft: "F7E8D0",
  danger: "B23B3B",
  dangerSoft: "F2D6D6",
  line: "CFDCE2",
  chipFresh: "E5E7E5",
  chipMid: "5E9CB0",
  chipDark: "2A6980",
};

const FONT = "Malgun Gothic";
const FONT_BOLD = "Malgun Gothic";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "Lotusbio TTI AI 품질 스캐너 — 투자자 자료";
pres.author = "Lotusbio";

const TOTAL_PAGES = 6;

const W = 13.333;
const H = 7.5;

// ============================================================
// 공통 헬퍼
// ============================================================
function addHeader(slide, pageNum, totalPages = TOTAL_PAGES) {
  // 좌상단 워드마크
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: W,
    h: 0.05,
    fill: { color: COLOR.primary },
    line: { color: COLOR.primary },
  });
  slide.addText("Lotusbio · TTI AI Scanner", {
    x: 0.4,
    y: 0.18,
    w: 4,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    color: COLOR.textMute,
    bold: false,
  });
  // 우상단 라벨
  slide.addText("INVESTOR DECK · 2026", {
    x: W - 3.5,
    y: 0.18,
    w: 3.1,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    color: COLOR.textMute,
    align: "right",
    charSpacing: 2,
  });
  // 페이지 번호
  slide.addText(`${pageNum} / ${totalPages}`, {
    x: W - 1.0,
    y: H - 0.4,
    w: 0.6,
    h: 0.3,
    fontFace: FONT,
    fontSize: 9,
    color: COLOR.textMute,
    align: "right",
  });
}

function title(slide, text, sub) {
  slide.addText(text, {
    x: 0.5,
    y: 0.55,
    w: W - 1,
    h: 0.6,
    fontFace: FONT_BOLD,
    fontSize: 28,
    bold: true,
    color: COLOR.textDark,
  });
  if (sub) {
    slide.addText(sub, {
      x: 0.5,
      y: 1.15,
      w: W - 1,
      h: 0.35,
      fontFace: FONT,
      fontSize: 13,
      color: COLOR.textMute,
    });
  }
  // accent underline
  slide.addShape("rect", {
    x: 0.5,
    y: 1.55,
    w: 0.6,
    h: 0.06,
    fill: { color: COLOR.accent },
    line: { color: COLOR.accent },
  });
}

// 파이프라인 단계 박스
function pipelineBox(slide, x, y, w, h, opts) {
  const fill = opts.fill || COLOR.bg;
  const fontColor = opts.textColor || COLOR.textDark;
  slide.addShape("roundRect", {
    x, y, w, h,
    rectRadius: 0.12,
    fill: { color: fill },
    line: { color: opts.border || COLOR.line, width: 0.75 },
    shadow: opts.shadow ? { type: "outer", color: "AAAAAA", blur: 8, offset: 2, angle: 90, opacity: 0.3 } : undefined,
  });
  // 아이콘
  if (opts.icon) {
    slide.addText(opts.icon, {
      x, y: y + 0.1, w, h: 0.5,
      fontFace: FONT, fontSize: 22, align: "center", color: fontColor,
    });
  }
  // 헤더
  slide.addText(opts.header, {
    x: x + 0.05, y: y + (opts.icon ? 0.55 : 0.2), w: w - 0.1, h: 0.4,
    fontFace: FONT_BOLD, fontSize: 12, bold: true, align: "center", color: fontColor,
  });
  // 서브텍스트
  if (opts.body) {
    slide.addText(opts.body, {
      x: x + 0.1, y: y + (opts.icon ? 0.95 : 0.6), w: w - 0.2, h: h - (opts.icon ? 1.05 : 0.7),
      fontFace: FONT, fontSize: 9.5, align: "center", color: opts.subColor || COLOR.textMute,
      valign: "top",
    });
  }
}

function arrow(slide, x, y, w) {
  slide.addShape("rightArrow", {
    x, y, w, h: 0.3,
    fill: { color: COLOR.accent },
    line: { color: COLOR.accent },
  });
}

// ============================================================
// SLIDE 1 — 표지
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.white };

  // 좌측 색 블록 (gradient 느낌으로 두 박스)
  s.addShape("rect", {
    x: 0, y: 0, w: 4.6, h: H,
    fill: { color: COLOR.primary },
    line: { color: COLOR.primary },
  });
  s.addShape("rect", {
    x: 4.6, y: 0, w: 0.15, h: H,
    fill: { color: COLOR.accent },
    line: { color: COLOR.accent },
  });

  // 좌측 라벨
  s.addText("INVESTOR DECK · 2026", {
    x: 0.6, y: 1.0, w: 4, h: 0.3,
    fontFace: FONT, fontSize: 11, color: COLOR.accentSoft, charSpacing: 4,
  });

  // 메인 타이틀
  s.addText("TTI AI", {
    x: 0.6, y: 1.5, w: 4, h: 1.2,
    fontFace: FONT_BOLD, fontSize: 60, bold: true, color: COLOR.white,
  });
  s.addText("품질 스캐너", {
    x: 0.6, y: 2.6, w: 4, h: 0.9,
    fontFace: FONT_BOLD, fontSize: 38, bold: true, color: COLOR.white,
  });

  // 부제
  s.addText("스마트폰 카메라로 식품 신선도를\n1초 안에 판별합니다.", {
    x: 0.6, y: 3.7, w: 4, h: 1.0,
    fontFace: FONT, fontSize: 14, color: COLOR.accentSoft,
  });

  // 구분선
  s.addShape("rect", {
    x: 0.6, y: 5.0, w: 0.6, h: 0.04,
    fill: { color: COLOR.accent }, line: { color: COLOR.accent },
  });

  // 회사
  s.addText("Lotusbio Inc.", {
    x: 0.6, y: 5.2, w: 4, h: 0.4,
    fontFace: FONT_BOLD, fontSize: 16, bold: true, color: COLOR.white,
  });
  s.addText("www.lotusbio.co.kr", {
    x: 0.6, y: 5.6, w: 4, h: 0.3,
    fontFace: FONT, fontSize: 11, color: COLOR.accentSoft,
  });

  // ===== 우측: 칩 시각화 =====
  s.addText("Time-Temperature Indicator × On-device AI", {
    x: 5.2, y: 1.0, w: 8, h: 0.4,
    fontFace: FONT, fontSize: 12, color: COLOR.textMute, charSpacing: 2,
  });
  s.addText("색이 변하는 칩, 카메라가 읽는 신선도", {
    x: 5.2, y: 1.4, w: 8, h: 0.6,
    fontFace: FONT_BOLD, fontSize: 22, bold: true, color: COLOR.textDark,
  });

  // 3개 원형 칩
  const chips = [
    { color: COLOR.chipFresh, label: "Fresh", sub: "0–3 days", tone: COLOR.success },
    { color: COLOR.chipMid, label: "Good", sub: "3–7 days", tone: COLOR.warn },
    { color: COLOR.chipDark, label: "Expired", sub: "7+ days", tone: COLOR.danger },
  ];
  const chipY = 2.6;
  const chipSize = 1.6;
  const chipStartX = 5.6;
  const chipGap = 0.5;
  chips.forEach((c, i) => {
    const cx = chipStartX + i * (chipSize + chipGap);
    // 칩 그림자
    s.addShape("ellipse", {
      x: cx + 0.05, y: chipY + 0.08, w: chipSize, h: chipSize,
      fill: { color: "DDDDDD" },
      line: { color: "DDDDDD" },
    });
    // 본 칩
    s.addShape("ellipse", {
      x: cx, y: chipY, w: chipSize, h: chipSize,
      fill: { color: c.color },
      line: { color: COLOR.white, width: 2 },
    });
    // 칩 안 라벨
    s.addText(c.label, {
      x: cx, y: chipY + chipSize + 0.15, w: chipSize, h: 0.35,
      fontFace: FONT_BOLD, fontSize: 13, bold: true, align: "center", color: COLOR.textDark,
    });
    s.addText(c.sub, {
      x: cx, y: chipY + chipSize + 0.5, w: chipSize, h: 0.3,
      fontFace: FONT, fontSize: 10, align: "center", color: c.tone,
    });
  });

  // 우측 하단 임팩트 카드 3개
  const impactY = 5.2;
  const impactCards = [
    { num: "<1s", label: "판정 속도", icon: "⚡" },
    { num: "0원", label: "건당 추론 비용", icon: "💰" },
    { num: "100%", label: "온디바이스 처리", icon: "🔒" },
  ];
  const cardW = 2.4;
  const cardGap = 0.25;
  const cardStartX = 5.4;
  impactCards.forEach((c, i) => {
    const cx = cardStartX + i * (cardW + cardGap);
    s.addShape("roundRect", {
      x: cx, y: impactY, w: cardW, h: 1.4,
      rectRadius: 0.1,
      fill: { color: COLOR.bg },
      line: { color: COLOR.line, width: 0.5 },
    });
    s.addText(c.icon, {
      x: cx, y: impactY + 0.1, w: cardW, h: 0.4,
      fontFace: FONT, fontSize: 18, align: "center",
    });
    s.addText(c.num, {
      x: cx, y: impactY + 0.5, w: cardW, h: 0.5,
      fontFace: FONT_BOLD, fontSize: 22, bold: true, align: "center", color: COLOR.primary,
    });
    s.addText(c.label, {
      x: cx, y: impactY + 1.0, w: cardW, h: 0.35,
      fontFace: FONT, fontSize: 10, align: "center", color: COLOR.textMute,
    });
  });

  s.addText(`1 / ${TOTAL_PAGES}`, {
    x: W - 1.0, y: H - 0.4, w: 0.6, h: 0.3,
    fontFace: FONT, fontSize: 9, color: COLOR.white, align: "right",
  });
}

// ============================================================
// SLIDE 2 — 현재 데모 아키텍처
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.white };
  addHeader(s, 2);
  title(s, "현재 데모 — Web 기반 PoC 아키텍처",
    "빠른 시장 검증을 위한 브라우저 단일 페이지(SPA) 구조 · 현재 동작 중");

  // 5단계 파이프라인
  const stages = [
    {
      icon: "📱",
      header: "Mobile\nBrowser",
      body: "PWA · iOS / Android\nReact + Vite",
      fill: COLOR.bg,
    },
    {
      icon: "📷",
      header: "Camera\nStream",
      body: "getUserMedia\nMediaStream API\nTorch / Exposure",
      fill: COLOR.bg,
    },
    {
      icon: "🧠",
      header: "1차 Gate\n(AI)",
      body: "MobileNet v1\nTensorFlow.js\n지시계 vs 일반 사물",
      fill: COLOR.accentSoft,
      border: COLOR.accent,
    },
    {
      icon: "🎨",
      header: "RGB\nSampling",
      body: "원형 ROI 샘플링\n평균 RGB · σ\nHSV 채도",
      fill: COLOR.bg,
    },
    {
      icon: "✅",
      header: "Range\nClassifier",
      body: "Fresh / Good /\nExpired / Unsupported",
      fill: COLOR.primary,
      textColor: COLOR.white,
      subColor: COLOR.accentSoft,
    },
  ];

  const pY = 2.2;
  const pH = 2.0;
  const gap = 0.25;
  const arrowW = 0.35;
  const totalArrowsW = arrowW * (stages.length - 1) + gap * (stages.length - 1) * 2;
  const boxW = (W - 1.0 - totalArrowsW) / stages.length;
  let cursor = 0.5;
  stages.forEach((st, i) => {
    pipelineBox(s, cursor, pY, boxW, pH, {
      icon: st.icon,
      header: st.header,
      body: st.body,
      fill: st.fill,
      border: st.border,
      textColor: st.textColor,
      subColor: st.subColor,
      shadow: true,
    });
    cursor += boxW;
    if (i < stages.length - 1) {
      arrow(s, cursor + gap, pY + pH / 2 - 0.15, arrowW);
      cursor += arrowW + gap * 2;
    }
  });

  // 상단 라벨
  s.addText("FRONTEND ONLY · 서버 추론 없음 · 인터넷 연결 없이도 정적 파일만 있으면 동작", {
    x: 0.5, y: 1.85, w: W - 1, h: 0.3,
    fontFace: FONT, fontSize: 10.5, color: COLOR.textMute, italic: true, charSpacing: 1,
  });

  // 하단 좌측 — 검증 완료
  s.addShape("roundRect", {
    x: 0.5, y: 4.7, w: 6.0, h: 2.2,
    rectRadius: 0.1,
    fill: { color: COLOR.successSoft },
    line: { color: COLOR.success, width: 1 },
  });
  s.addText("✓  PoC 검증 완료", {
    x: 0.7, y: 4.85, w: 5.6, h: 0.4,
    fontFace: FONT_BOLD, fontSize: 14, bold: true, color: COLOR.success,
  });
  const wins = [
    "• 색상 분류 정확도 90%+ (정상 조명·정렬 기준)",
    "• AI 1차 게이트로 비-칩 객체 사전 필터링",
    "• 실시간 진단 패널 + 자동 캡처 + 토치 보정",
    "• 별도 설치 없이 URL만으로 사용자 테스트 가능",
  ];
  wins.forEach((w, i) => {
    s.addText(w, {
      x: 0.8, y: 5.3 + i * 0.35, w: 5.5, h: 0.3,
      fontFace: FONT, fontSize: 11, color: COLOR.textDark,
    });
  });

  // 하단 우측 — 한계
  s.addShape("roundRect", {
    x: 6.8, y: 4.7, w: 6.0, h: 2.2,
    rectRadius: 0.1,
    fill: { color: COLOR.warnSoft },
    line: { color: COLOR.warn, width: 1 },
  });
  s.addText("△  Web 환경의 구조적 한계", {
    x: 7.0, y: 4.85, w: 5.6, h: 0.4,
    fontFace: FONT_BOLD, fontSize: 14, bold: true, color: COLOR.warn,
  });
  const limits = [
    "• 모델 크기 5MB 이하 권장 → 정확도 상한",
    "• 카메라 노출/플래시 제어 제한적 (브라우저 의존)",
    "• 백그라운드 동작·푸시·위젯 불가",
    "• iOS Safari WebGL 호환성 이슈 잔존",
  ];
  limits.forEach((w, i) => {
    s.addText(w, {
      x: 7.1, y: 5.3 + i * 0.35, w: 5.5, h: 0.3,
      fontFace: FONT, fontSize: 11, color: COLOR.textDark,
    });
  });
}

// ============================================================
// SLIDE 3 — Native App 아키텍처 + 왜 Native
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.white };
  addHeader(s, 3);
  title(s, "Phase 2 — Native App 아키텍처",
    "Android 우선 개발 → iOS 확대 · 100% 온디바이스 추론");

  // 상단: 아키텍처 파이프라인
  const stages = [
    { icon: "📷", header: "Camera2 /\nAVFoundation", body: "정밀 노출/포커스/RAW", fill: COLOR.bg },
    { icon: "🛠", header: "Pre-process", body: "Perspective +\nWhite Balance\n(OpenCV mobile)", fill: COLOR.bg },
    { icon: "🎯", header: "Detection", body: "YOLOv10n\n칩 위치·회전·크기", fill: COLOR.accentSoft, border: COLOR.accent },
    { icon: "🧠", header: "Classification", body: "EfficientFormer-L1\nint8 quantized 8MB", fill: COLOR.accentSoft, border: COLOR.accent },
    { icon: "💾", header: "Result + Log", body: "신선도 0–10 score\nSQLite local cache", fill: COLOR.primary, textColor: COLOR.white, subColor: COLOR.accentSoft },
  ];

  const pY = 2.0;
  const pH = 1.7;
  const gap = 0.2;
  const arrowW = 0.3;
  const totalArrowsW = arrowW * (stages.length - 1) + gap * (stages.length - 1) * 2;
  const boxW = (W - 1.0 - totalArrowsW) / stages.length;
  let cursor = 0.5;
  stages.forEach((st, i) => {
    pipelineBox(s, cursor, pY, boxW, pH, {
      icon: st.icon, header: st.header, body: st.body,
      fill: st.fill, border: st.border, textColor: st.textColor, subColor: st.subColor,
      shadow: true,
    });
    cursor += boxW;
    if (i < stages.length - 1) {
      arrow(s, cursor + gap, pY + pH / 2 - 0.15, arrowW);
      cursor += arrowW + gap * 2;
    }
  });

  // Optional cloud fallback (점선 박스)
  s.addShape("roundRect", {
    x: 0.5, y: 3.85, w: W - 1, h: 0.5,
    rectRadius: 0.06,
    fill: { color: "FAFAFA" },
    line: { color: COLOR.textMute, width: 0.75, dashType: "dash" },
  });
  s.addText("Optional · 신뢰도 < 0.7 일 때만 → Cloud Vision LLM Fallback (GPT-4V / Gemini Vision) — 신규 칩 제형 대응 + 데이터 수집", {
    x: 0.7, y: 3.9, w: W - 1.4, h: 0.4,
    fontFace: FONT, fontSize: 10.5, color: COLOR.textMute, italic: true,
  });

  // ===== 하단: 왜 Native인가 — 6열 비교표 =====
  s.addText("왜 Native App이 필요한가 — Web 한계  vs  Native 강점", {
    x: 0.5, y: 4.55, w: W - 1, h: 0.4,
    fontFace: FONT_BOLD, fontSize: 14, bold: true, color: COLOR.textDark,
  });

  const comparisons = [
    ["오프라인 불가", "✓ 완전 오프라인 동작"],
    ["카메라 제어 제한적", "✓ Camera2 정밀 노출·플래시"],
    ["모델 크기 5MB 제약", "✓ 50MB+ 고정밀 모델 탑재"],
    ["백그라운드 불가", "✓ 푸시 · 위젯 · 백그라운드 스캔"],
    ["데이터 외부 전송 우려", "✓ 온디바이스 = 프라이버시"],
    ["단일 화면 UX", "✓ 이력 · 바코드 · 재고 연동"],
  ];

  const tableY = 5.05;
  const rowH = 0.35;
  const colW = (W - 1.0) / 2;
  // 헤더
  s.addShape("rect", {
    x: 0.5, y: tableY, w: colW, h: rowH,
    fill: { color: COLOR.warn }, line: { color: COLOR.warn },
  });
  s.addText("Web 데모의 한계", {
    x: 0.5, y: tableY, w: colW, h: rowH,
    fontFace: FONT_BOLD, fontSize: 11, bold: true, color: COLOR.white, align: "center", valign: "middle",
  });
  s.addShape("rect", {
    x: 0.5 + colW, y: tableY, w: colW, h: rowH,
    fill: { color: COLOR.success }, line: { color: COLOR.success },
  });
  s.addText("Native App의 강점", {
    x: 0.5 + colW, y: tableY, w: colW, h: rowH,
    fontFace: FONT_BOLD, fontSize: 11, bold: true, color: COLOR.white, align: "center", valign: "middle",
  });

  comparisons.forEach((row, i) => {
    const yy = tableY + rowH + i * rowH;
    const altBg = i % 2 === 0 ? COLOR.bg : COLOR.white;
    s.addShape("rect", {
      x: 0.5, y: yy, w: colW, h: rowH,
      fill: { color: altBg }, line: { color: COLOR.line, width: 0.5 },
    });
    s.addText(row[0], {
      x: 0.7, y: yy, w: colW - 0.2, h: rowH,
      fontFace: FONT, fontSize: 10.5, color: COLOR.textDark, valign: "middle",
    });
    s.addShape("rect", {
      x: 0.5 + colW, y: yy, w: colW, h: rowH,
      fill: { color: i % 2 === 0 ? COLOR.successSoft : COLOR.white }, line: { color: COLOR.line, width: 0.5 },
    });
    s.addText(row[1], {
      x: 0.7 + colW, y: yy, w: colW - 0.2, h: rowH,
      fontFace: FONT, fontSize: 10.5, color: COLOR.success, valign: "middle", bold: true,
    });
  });
}

// ============================================================
// SLIDE 4 — AI 모델 비교 + 로드맵
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.white };
  addHeader(s, 4);
  title(s, "AI 모델 — 현재 vs Phase 2 로드맵",
    "ImageNet 사전학습 → TTI 전용 데이터셋 fine-tuning → 모바일 양자화");

  // 좌우 카드 비교
  const cardY = 2.0;
  const cardH = 3.7;
  const cardW = 6.05;
  const leftX = 0.5;
  const rightX = W - 0.5 - cardW;

  // ▶ 좌측 카드 — 현재 (회색 톤)
  s.addShape("roundRect", {
    x: leftX, y: cardY, w: cardW, h: cardH,
    rectRadius: 0.15,
    fill: { color: COLOR.bg },
    line: { color: COLOR.line, width: 1 },
  });
  // 헤더 띠
  s.addShape("rect", {
    x: leftX, y: cardY, w: cardW, h: 0.5,
    fill: { color: COLOR.textMute }, line: { color: COLOR.textMute },
  });
  s.addText("PHASE 1 — 현재 (Web PoC)", {
    x: leftX + 0.2, y: cardY + 0.05, w: cardW - 0.4, h: 0.4,
    fontFace: FONT_BOLD, fontSize: 11, bold: true, color: COLOR.white, charSpacing: 2,
  });
  s.addText("RGB Range + MobileNet Gate", {
    x: leftX + 0.3, y: cardY + 0.6, w: cardW - 0.6, h: 0.5,
    fontFace: FONT_BOLD, fontSize: 18, bold: true, color: COLOR.textDark,
  });
  // 모델 스펙
  const leftSpecs = [
    ["Backbone", "MobileNet v1 (TFJS, 16MB)"],
    ["사전학습", "ImageNet only — TTI 학습 없음"],
    ["분류 방식", "색상 RGB 임계값 룰 기반"],
    ["출력", "3단계 분류 (Fresh/Good/Expired)"],
  ];
  leftSpecs.forEach((row, i) => {
    const yy = cardY + 1.15 + i * 0.32;
    s.addText(row[0], {
      x: leftX + 0.3, y: yy, w: 1.4, h: 0.3,
      fontFace: FONT, fontSize: 10, color: COLOR.textMute,
    });
    s.addText(row[1], {
      x: leftX + 1.7, y: yy, w: cardW - 1.9, h: 0.3,
      fontFace: FONT_BOLD, fontSize: 10.5, bold: true, color: COLOR.textDark,
    });
  });
  // 한계
  s.addShape("rect", {
    x: leftX + 0.3, y: cardY + 2.55, w: cardW - 0.6, h: 0.02,
    fill: { color: COLOR.line }, line: { color: COLOR.line },
  });
  s.addText("△ 한계", {
    x: leftX + 0.3, y: cardY + 2.65, w: cardW - 0.6, h: 0.3,
    fontFace: FONT_BOLD, fontSize: 11, bold: true, color: COLOR.warn,
  });
  const leftLimits = [
    "× 조명 변화에 취약 (실내·형광·자연광 편차)",
    "× 각도/원근/거리 보정 없음",
    "× 신규 칩 제형 추가 시 룰 재작성 필요",
    "× 3단계 분류만 가능 (연속값 불가)",
  ];
  leftLimits.forEach((t, i) => {
    s.addText(t, {
      x: leftX + 0.3, y: cardY + 3.0 + i * 0.18, w: cardW - 0.6, h: 0.2,
      fontFace: FONT, fontSize: 9.5, color: COLOR.textDark,
    });
  });

  // ▶ 우측 카드 — Phase 2 (Primary 톤)
  s.addShape("roundRect", {
    x: rightX, y: cardY, w: cardW, h: cardH,
    rectRadius: 0.15,
    fill: { color: COLOR.bgAlt },
    line: { color: COLOR.primary, width: 1.5 },
    shadow: { type: "outer", color: COLOR.primary, blur: 12, offset: 3, angle: 90, opacity: 0.2 },
  });
  s.addShape("rect", {
    x: rightX, y: cardY, w: cardW, h: 0.5,
    fill: { color: COLOR.primary }, line: { color: COLOR.primary },
  });
  s.addText("PHASE 2 — Native App (목표)", {
    x: rightX + 0.2, y: cardY + 0.05, w: cardW - 0.4, h: 0.4,
    fontFace: FONT_BOLD, fontSize: 11, bold: true, color: COLOR.white, charSpacing: 2,
  });
  s.addText("전용 학습 CNN + Detection Pipeline", {
    x: rightX + 0.3, y: cardY + 0.6, w: cardW - 0.6, h: 0.5,
    fontFace: FONT_BOLD, fontSize: 18, bold: true, color: COLOR.primary,
  });

  const rightSpecs = [
    ["Detection", "YOLOv10n (5MB) — 칩 위치·회전·크기"],
    ["Classification", "EfficientFormer-L1 / MobileViT-S (8MB int8)"],
    ["사전학습", "ImageNet → TTI 10K+ 자체 데이터셋 fine-tune"],
    ["보정", "OpenCV — Perspective + WB + Auto-exposure"],
    ["출력", "신선도 0–10 연속 score (회귀)"],
    ["Fallback (선택)", "Cloud Vision LLM — 신규 케이스만"],
  ];
  rightSpecs.forEach((row, i) => {
    const yy = cardY + 1.15 + i * 0.3;
    s.addText(row[0], {
      x: rightX + 0.3, y: yy, w: 1.6, h: 0.28,
      fontFace: FONT, fontSize: 10, color: COLOR.textMute,
    });
    s.addText(row[1], {
      x: rightX + 1.9, y: yy, w: cardW - 2.1, h: 0.28,
      fontFace: FONT_BOLD, fontSize: 10.5, bold: true, color: COLOR.textDark,
    });
  });

  // 강점 배지
  s.addShape("rect", {
    x: rightX + 0.3, y: cardY + 3.0, w: cardW - 0.6, h: 0.02,
    fill: { color: COLOR.line }, line: { color: COLOR.line },
  });
  const benefits = [
    { txt: "정확도 +15%", color: COLOR.success },
    { txt: "오프라인", color: COLOR.primary },
    { txt: "프라이버시", color: COLOR.primary },
    { txt: "신모델 확장", color: COLOR.accent },
  ];
  benefits.forEach((b, i) => {
    const bx = rightX + 0.3 + i * 1.4;
    s.addShape("roundRect", {
      x: bx, y: cardY + 3.15, w: 1.3, h: 0.35,
      rectRadius: 0.17,
      fill: { color: b.color }, line: { color: b.color },
    });
    s.addText(b.txt, {
      x: bx, y: cardY + 3.15, w: 1.3, h: 0.35,
      fontFace: FONT_BOLD, fontSize: 10, bold: true, color: COLOR.white,
      align: "center", valign: "middle",
    });
  });

  // ===== 하단 로드맵 타임라인 =====
  const tlY = 6.1;
  s.addText("개발 로드맵", {
    x: 0.5, y: tlY - 0.3, w: 4, h: 0.3,
    fontFace: FONT_BOLD, fontSize: 12, bold: true, color: COLOR.textDark,
  });

  const milestones = [
    { q: "Q2 '26", label: "TTI 데이터 수집\n10K+ 라벨링", color: COLOR.accent },
    { q: "Q3 '26", label: "모델 학습 +\n양자화 (int8)", color: COLOR.accent },
    { q: "Q4 '26", label: "Android Beta\n출시", color: COLOR.primary },
    { q: "Q1 '27", label: "iOS 출시 +\nB2B 파일럿", color: COLOR.primary },
  ];

  // 라인
  s.addShape("rect", {
    x: 1.2, y: tlY + 0.25, w: W - 2.4, h: 0.04,
    fill: { color: COLOR.line }, line: { color: COLOR.line },
  });

  const stepW = (W - 2.4) / (milestones.length - 1);
  milestones.forEach((m, i) => {
    const cx = 1.2 + i * stepW;
    // 점
    s.addShape("ellipse", {
      x: cx - 0.13, y: tlY + 0.14, w: 0.26, h: 0.26,
      fill: { color: m.color }, line: { color: COLOR.white, width: 2 },
    });
    s.addText(m.q, {
      x: cx - 0.7, y: tlY - 0.15, w: 1.4, h: 0.3,
      fontFace: FONT_BOLD, fontSize: 10, bold: true, align: "center", color: m.color,
    });
    s.addText(m.label, {
      x: cx - 1.0, y: tlY + 0.5, w: 2.0, h: 0.6,
      fontFace: FONT, fontSize: 9.5, align: "center", color: COLOR.textDark,
    });
  });
}

// ============================================================
// SLIDE 5 — 데이터셋 · Active Learning · 정확도 한계 (투자 어필)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.white };
  addHeader(s, 5);
  title(s, "왜 지속적인 투자가 필요한가",
    "AI 정확도의 핵심은 모델이 아니라 데이터 — 한 번 만들고 끝나는 사업이 아닙니다");

  // ===== 상단 좌측: 데이터셋 확보 카드 =====
  const topY = 2.0;
  const topH = 2.55;
  const halfW = 6.05;

  s.addShape("roundRect", {
    x: 0.5, y: topY, w: halfW, h: topH,
    rectRadius: 0.15,
    fill: { color: COLOR.bgAlt },
    line: { color: COLOR.primary, width: 1.2 },
  });
  s.addShape("rect", {
    x: 0.5, y: topY, w: halfW, h: 0.5,
    fill: { color: COLOR.primary }, line: { color: COLOR.primary },
  });
  s.addText("STEP 1 — 데이터셋 확보 (가장 큰 자본 집행)", {
    x: 0.7, y: topY + 0.05, w: halfW - 0.4, h: 0.4,
    fontFace: FONT_BOLD, fontSize: 11, bold: true, color: COLOR.white, charSpacing: 1,
  });

  // 큰 숫자 카드 3개
  const dataCards = [
    { num: "30,000+", label: "라벨링 사진", sub: "조명·각도·배경·\n포장재·부분 변색" },
    { num: "6 개월", label: "수집·라벨링 기간", sub: "전문 라벨러 +\n식품공학 검수" },
    { num: "₩4 억+", label: "추정 데이터 비용", sub: "라벨링 외주 +\n현장 촬영 + 검수" },
  ];
  const dcW = (halfW - 0.6) / 3;
  dataCards.forEach((c, i) => {
    const cx = 0.7 + i * dcW;
    s.addShape("rect", {
      x: cx + 0.05, y: topY + 0.7, w: dcW - 0.1, h: 1.7,
      fill: { color: COLOR.white }, line: { color: COLOR.line, width: 0.5 },
    });
    s.addText(c.num, {
      x: cx + 0.05, y: topY + 0.8, w: dcW - 0.1, h: 0.55,
      fontFace: FONT_BOLD, fontSize: 22, bold: true, align: "center", color: COLOR.primary,
    });
    s.addText(c.label, {
      x: cx + 0.05, y: topY + 1.35, w: dcW - 0.1, h: 0.3,
      fontFace: FONT_BOLD, fontSize: 10.5, bold: true, align: "center", color: COLOR.textDark,
    });
    s.addText(c.sub, {
      x: cx + 0.1, y: topY + 1.65, w: dcW - 0.2, h: 0.7,
      fontFace: FONT, fontSize: 9, align: "center", color: COLOR.textMute, valign: "top",
    });
  });

  // ===== 상단 우측: Active Learning 카드 =====
  const rightX = W - 0.5 - halfW;
  s.addShape("roundRect", {
    x: rightX, y: topY, w: halfW, h: topH,
    rectRadius: 0.15,
    fill: { color: COLOR.successSoft },
    line: { color: COLOR.success, width: 1.2 },
  });
  s.addShape("rect", {
    x: rightX, y: topY, w: halfW, h: 0.5,
    fill: { color: COLOR.success }, line: { color: COLOR.success },
  });
  s.addText("STEP 2 — Active Learning 사이클 (지속 운영비)", {
    x: rightX + 0.2, y: topY + 0.05, w: halfW - 0.4, h: 0.4,
    fontFace: FONT_BOLD, fontSize: 11, bold: true, color: COLOR.white, charSpacing: 1,
  });

  // 순환 다이어그램 — 4단계 시계방향
  const cycleLabels = ["사용자 촬영\n수집", "낮은 신뢰도\n샘플 추출", "재라벨링 +\n재학습", "신모델\nOTA 배포"];
  const cycleColors = [COLOR.accent, COLOR.warn, COLOR.primary, COLOR.success];
  const ccx = rightX + halfW / 2;
  const ccy = topY + 1.4;
  const cR = 0.85;
  const positions = [
    { x: ccx, y: ccy - cR },          // top
    { x: ccx + cR, y: ccy },          // right
    { x: ccx, y: ccy + cR },          // bottom
    { x: ccx - cR, y: ccy },          // left
  ];
  // 중앙
  s.addShape("ellipse", {
    x: ccx - 0.45, y: ccy - 0.3, w: 0.9, h: 0.6,
    fill: { color: COLOR.success }, line: { color: COLOR.white, width: 1.5 },
  });
  s.addText("REPEAT\n매 분기", {
    x: ccx - 0.5, y: ccy - 0.28, w: 1.0, h: 0.55,
    fontFace: FONT_BOLD, fontSize: 9.5, bold: true, align: "center", color: COLOR.white, valign: "middle",
  });
  positions.forEach((p, i) => {
    s.addShape("ellipse", {
      x: p.x - 0.42, y: p.y - 0.3, w: 0.84, h: 0.55,
      fill: { color: cycleColors[i] }, line: { color: COLOR.white, width: 1.5 },
    });
    s.addText(cycleLabels[i], {
      x: p.x - 0.55, y: p.y - 0.32, w: 1.1, h: 0.55,
      fontFace: FONT_BOLD, fontSize: 8.5, bold: true, align: "center", color: COLOR.white, valign: "middle",
    });
  });

  // 우측 하단 비용 라인
  s.addText("운영 비용 — 분기당 ₩6,000만+ (재라벨링 + 컴퓨팅 + 모델 배포)", {
    x: rightX + 0.2, y: topY + topH - 0.4, w: halfW - 0.4, h: 0.3,
    fontFace: FONT_BOLD, fontSize: 10, bold: true, align: "center", color: COLOR.success,
  });

  // ===== 하단: 100% 정확도 불가 — 솔직성 카드 =====
  const botY = 4.85;
  const botH = 2.0;
  s.addShape("roundRect", {
    x: 0.5, y: botY, w: W - 1, h: botH,
    rectRadius: 0.15,
    fill: { color: COLOR.warnSoft },
    line: { color: COLOR.warn, width: 1.2 },
  });
  s.addShape("rect", {
    x: 0.5, y: botY, w: W - 1, h: 0.5,
    fill: { color: COLOR.warn }, line: { color: COLOR.warn },
  });
  s.addText("STEP 3 — 정확도 100%는 물리적으로 불가능합니다 (현실적 기대치 공유)", {
    x: 0.7, y: botY + 0.05, w: W - 1.4, h: 0.4,
    fontFace: FONT_BOLD, fontSize: 11, bold: true, color: COLOR.white, charSpacing: 1,
  });

  // 좌측: 5가지 한계 요인
  s.addText("절대 통제할 수 없는 5가지 변수", {
    x: 0.7, y: botY + 0.6, w: 6.0, h: 0.3,
    fontFace: FONT_BOLD, fontSize: 11, bold: true, color: COLOR.textDark,
  });
  const factors = [
    "📷  카메라 센서 편차 (기종마다 색감 다름)",
    "💡  조명 환경 (LED·형광등·자연광·그늘)",
    "📦  포장재 반사·결로·비닐 광택",
    "🧪  칩 자체의 제조 편차 · 온도 이력",
    "👆  사용자 촬영 각도 · 손가락 가림",
  ];
  factors.forEach((f, i) => {
    s.addText(f, {
      x: 0.85, y: botY + 0.95 + i * 0.18, w: 5.8, h: 0.2,
      fontFace: FONT, fontSize: 10, color: COLOR.textDark,
    });
  });

  // 우측: 목표치 박스 + 면책
  const tgtX = 7.0;
  s.addText("실현 가능한 목표 정확도", {
    x: tgtX, y: botY + 0.6, w: 5.8, h: 0.3,
    fontFace: FONT_BOLD, fontSize: 11, bold: true, color: COLOR.textDark,
  });
  // 두 개의 큰 숫자
  const targets = [
    { num: "≥ 95%", label: "Beta 출시 시점", color: COLOR.warn },
    { num: "≥ 98%", label: "1년 운영 후 (Active Learning)", color: COLOR.success },
  ];
  targets.forEach((t, i) => {
    const tx = tgtX + i * 2.9;
    s.addShape("rect", {
      x: tx, y: botY + 0.95, w: 2.7, h: 0.6,
      fill: { color: COLOR.white }, line: { color: t.color, width: 1.5 },
    });
    s.addText(t.num, {
      x: tx + 0.05, y: botY + 1.0, w: 1.0, h: 0.5,
      fontFace: FONT_BOLD, fontSize: 18, bold: true, align: "center", color: t.color, valign: "middle",
    });
    s.addText(t.label, {
      x: tx + 1.0, y: botY + 1.0, w: 1.6, h: 0.5,
      fontFace: FONT, fontSize: 9.5, color: COLOR.textDark, valign: "middle",
    });
  });
  s.addText("100% 보장형 의료/안전 인증 도구가 아닌 \"보조 판정 도구\"로 포지셔닝 — 식약처 식품 보조표시 가이드라인 준용", {
    x: tgtX, y: botY + 1.62, w: 5.8, h: 0.32,
    fontFace: FONT, fontSize: 9, italic: true, color: COLOR.textMute,
  });
}

// ============================================================
// SLIDE 6 — 영문 약어 / 용어 설명집
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.white };
  addHeader(s, 6);
  title(s, "용어 · 약어 설명",
    "본 자료에 사용된 주요 기술 용어 정리");

  // 4개 카테고리 × 카테고리별 용어 카드
  const sections = [
    {
      title: "AI · Model",
      color: COLOR.primary,
      items: [
        ["CNN", "Convolutional Neural Network — 이미지 인식의 표준 신경망 구조"],
        ["YOLO", "You Only Look Once — 실시간 객체 검출 모델 (위치·크기 한 번에 예측)"],
        ["ResNet / EfficientFormer / MobileViT", "이미지 분류용 딥러닝 백본 모델 (점점 가볍고 정확해진 세대별 진화)"],
        ["MobileNet", "Google이 만든 모바일용 경량 CNN, 16MB 수준"],
        ["LLM", "Large Language Model — GPT-4V, Gemini 등 대형 멀티모달 모델"],
      ],
    },
    {
      title: "Training · Deployment",
      color: COLOR.accent,
      items: [
        ["ImageNet", "1,400만 장 사진 데이터셋 — 대부분의 비전 모델 사전학습 표준"],
        ["Fine-tuning", "사전학습 모델을 자사 데이터로 추가 학습하여 도메인에 적응시키는 기법"],
        ["Quantization (int8)", "32-bit 모델을 8-bit로 압축 → 모델 크기 1/4, 속도 2~4배 향상"],
        ["Active Learning", "사용자 데이터에서 어려운 샘플만 골라 재학습하는 효율적 학습 사이클"],
        ["OTA", "Over-the-Air — 앱 업데이트 없이 모델 파일만 무선 배포"],
      ],
    },
    {
      title: "Vision · Camera",
      color: COLOR.success,
      items: [
        ["TTI", "Time-Temperature Indicator — 온도·시간에 따라 색이 변하는 식품 신선도 칩"],
        ["ROI", "Region of Interest — 분석 대상 영역 (앱의 점선 원 안쪽)"],
        ["WB", "White Balance — 광원에 따라 달라지는 색감을 보정"],
        ["Perspective Correction", "비스듬히 찍힌 칩을 정원으로 펴는 원근 보정"],
        ["OpenCV", "오픈소스 컴퓨터비전 라이브러리 — 모바일 영상 전처리 표준"],
      ],
    },
    {
      title: "Platform · App",
      color: COLOR.warn,
      items: [
        ["PoC", "Proof of Concept — 기술 개념 검증용 시제품 (현재 데모)"],
        ["PWA", "Progressive Web App — 설치 가능한 웹 기반 앱"],
        ["TFJS / TFLite / Core ML", "TensorFlow.js (브라우저) / TensorFlow Lite (Android) / Core ML (iOS) 추론 엔진"],
        ["Camera2 / AVFoundation", "Android · iOS의 카메라 정밀 제어 공식 API"],
        ["SDK", "Software Development Kit — 외부 개발자가 쓸 수 있게 만든 기능 묶음"],
      ],
    },
  ];

  // 2x2 그리드
  const gridX = 0.5;
  const gridY = 1.85;
  const gridW = (W - 1.0 - 0.3) / 2;   // 0.3 gap between columns
  const gridH = (H - gridY - 0.6 - 0.2) / 2; // 0.2 gap between rows
  const colGap = 0.3;
  const rowGap = 0.2;

  sections.forEach((sec, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = gridX + col * (gridW + colGap);
    const y = gridY + row * (gridH + rowGap);

    // 카드 배경
    s.addShape("roundRect", {
      x, y, w: gridW, h: gridH,
      rectRadius: 0.1,
      fill: { color: COLOR.white },
      line: { color: COLOR.line, width: 0.75 },
    });
    // 좌측 색 띠
    s.addShape("rect", {
      x, y, w: 0.12, h: gridH,
      fill: { color: sec.color }, line: { color: sec.color },
    });
    // 카테고리 헤더
    s.addText(sec.title, {
      x: x + 0.3, y: y + 0.15, w: gridW - 0.4, h: 0.32,
      fontFace: FONT_BOLD, fontSize: 13, bold: true, color: sec.color, charSpacing: 1,
    });
    // 항목
    const itemY = y + 0.55;
    const itemH = (gridH - 0.7) / sec.items.length;
    sec.items.forEach((it, j) => {
      const iy = itemY + j * itemH;
      // 약어 (좌)
      s.addText(it[0], {
        x: x + 0.3, y: iy, w: 2.6, h: itemH - 0.02,
        fontFace: FONT_BOLD, fontSize: 10, bold: true, color: COLOR.textDark, valign: "top",
      });
      // 설명 (우)
      s.addText(it[1], {
        x: x + 2.95, y: iy, w: gridW - 3.1, h: itemH - 0.02,
        fontFace: FONT, fontSize: 9, color: COLOR.textMute, valign: "top",
      });
    });
  });
}

// ============================================================
// 저장
// ============================================================
const outPath = path.resolve(__dirname, "../exports/lotusbio_tti_demo.pptx");
pres.writeFile({ fileName: outPath }).then((f) => {
  console.log("✓ saved:", f);
});
