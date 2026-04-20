/**
 * 칩(지시계) vs 일반 사물 1차 게이트.
 *
 * MobileNet v1 (alpha 0.25, 224) 의 ImageNet 분류 결과를 활용한다.
 * - 일반 사물(병/캔/컵/박스/과일/전자기기 등)이 일정 확률 이상 식별되면
 *   "지시계 아님" 으로 게이트한다.
 * - 지시계 자체는 ImageNet 클래스에 없어 보통 top-1 확률이 낮으므로,
 *   확신이 낮은 경우(혹은 사람/배경)는 통과시켜 RGB 분류에 맡긴다.
 *
 * 모델 파일은 `public/models/mobilenet/` 에 번들되어 오프라인에서 동작한다.
 *
 * tfjs/mobilenet 은 동적 import 로 분리하여 초기 번들에서 제외한다.
 */

type Mobilenet = import("@tensorflow-models/mobilenet").MobileNet;

let modelPromise: Promise<Mobilenet> | null = null;

function modelUrl(): string {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return `${base}/models/mobilenet/model.json`;
}

export async function loadChipGate(): Promise<Mobilenet> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await import("@tensorflow/tfjs");
      const mobilenet = await import("@tensorflow-models/mobilenet");
      return mobilenet.load({ version: 1, alpha: 0.25, modelUrl: modelUrl() });
    })().catch((err) => {
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

export function preloadChipGate(): void {
  void loadChipGate().catch((err) => {
    console.warn("[chipGate] preload failed", err);
  });
}

const COMMON_OBJECT_DENYLIST: ReadonlySet<string> = new Set(
  [
    "water bottle",
    "wine bottle",
    "beer bottle",
    "pop bottle, soda bottle",
    "pill bottle",
    "perfume, essence",
    "lotion",
    "soap dispenser",
    "milk can",
    "beer can",
    "tin can",
    "cup",
    "coffee mug",
    "measuring cup",
    "pitcher, ewer",
    "water jug",
    "bowl",
    "mixing bowl",
    "soup bowl",
    "plate",
    "tray",
    "packet",
    "envelope",
    "carton",
    "crate",
    "shopping basket",
    "plastic bag",
    "shopping cart",
    "vase",
    "candle, taper, wax light",
    "lighter, light, igniter, ignitor",
    "fountain pen",
    "ballpoint, ballpoint pen, ballpen, Biro",
    "rubber eraser, rubber, pencil eraser",
    "lipstick, lip rouge",
    "matchstick",
    "Band Aid",
    "syringe",
    "thimble",
    "remote control, remote",
    "cellular telephone, cellular phone, cellphone, cell, mobile phone",
    "iPod",
    "computer keyboard, keypad",
    "mouse, computer mouse",
    "modem",
    "hand-held computer, hand-held microcomputer",
    "laptop, laptop computer",
    "notebook, notebook computer",
    "screwdriver",
    "hammer",
    "wrench, spanner",
    "scissors",
    "safety pin",
    "nail",
    "necklace",
    "ring, band",
    "wallet, billfold, notecase, pocketbook",
    "purse",
    "wig",
    "sunglasses, dark glasses, shades",
    "sunglass",
    "watch, ticker",
    "stopwatch, stop watch",
    "digital watch",
    "analog clock",
    "digital clock",
    "wall clock",
    "sock",
    "tie, neckwear",
    "Windsor tie",
    "bow tie, bow-tie, bowtie",
    "jersey, T-shirt, tee shirt",
    "sweatshirt",
    "cardigan",
    "miniskirt, mini",
    "swimming trunks, bathing trunks",
    "orange",
    "lemon",
    "banana",
    "Granny Smith",
    "strawberry",
    "pomegranate",
    "pineapple, ananas",
    "fig",
    "bell pepper",
    "cucumber, cuke",
    "broccoli",
    "cauliflower",
    "mushroom",
    "head cabbage",
    "artichoke, globe artichoke",
    "acorn",
    "buckeye, horse chestnut, conker",
    "corn",
    "ear, spike, capitulum",
    "hip, rose hip, rosehip",
    "menu",
    "book jacket, dust cover, dust jacket, dust wrapper, dust sheet",
    "comic book",
    "magazine",
    "binder, ring-binder",
    "spotlight, spot",
    "lampshade, lamp shade",
    "table lamp",
    "pot, flowerpot",
  ].map((s) => s.toLowerCase()),
);

const REJECT_DENYLIST_PROB = 0.22;
const REJECT_TOP1_HIGH_PROB = 0.45;

export interface ChipGateResult {
  isChip: boolean;
  reason: string;
  topClass: string;
  topProbability: number;
  predictions: Array<{ className: string; probability: number }>;
}

export type ChipGateSource =
  | HTMLCanvasElement
  | HTMLImageElement
  | HTMLVideoElement;

export async function classifyChipGate(
  source: ChipGateSource,
): Promise<ChipGateResult> {
  const model = await loadChipGate();
  const predictions = await model.classify(source, 5);

  const top = predictions[0] ?? { className: "", probability: 0 };
  const topName = top.className.toLowerCase();
  const matchedDeny = predictions.find((p) =>
    COMMON_OBJECT_DENYLIST.has(p.className.toLowerCase()),
  );

  let isChip = true;
  let reason = "지시계 후보로 통과";

  if (matchedDeny && matchedDeny.probability >= REJECT_DENYLIST_PROB) {
    isChip = false;
    reason = `일반 사물(${matchedDeny.className.split(",")[0]})로 인식되어 지시계가 아닌 것으로 판단했습니다.`;
  } else if (
    top.probability >= REJECT_TOP1_HIGH_PROB &&
    !COMMON_OBJECT_DENYLIST.has(topName)
  ) {
    // 매우 강하게 식별된 비-지시계 객체. 지시계는 ImageNet 에 없으므로
    // top-1 확률이 0.45 이상으로 매우 높은 경우는 거의 확실히 지시계가 아님.
    isChip = false;
    reason = `식별된 사물(${top.className.split(",")[0]})은 지시계가 아닙니다.`;
  }

  return {
    isChip,
    reason,
    topClass: top.className,
    topProbability: top.probability,
    predictions,
  };
}
