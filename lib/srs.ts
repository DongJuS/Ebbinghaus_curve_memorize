import type { CardState, Rating } from "@/lib/types";

/**
 * 망각곡선 기반 복습 스케줄러 (SM-2 + 소수점 학습단계).
 *
 * - 신규/학습 카드는 소수점 단위 학습단계(10분 → 1시간 → 8시간)를 거친 뒤 졸업한다.
 * - 졸업 후에는 개인별 이지팩터(EF)로 간격을 늘려가며, 간격은 소수점(일)으로 유지된다.
 * - 모든 계산은 순수 함수로 이뤄져 단위 테스트가 가능하다.
 */

/** 학습단계(일 단위). 10분, 1시간, 8시간. */
export const LEARNING_STEPS = [10 / 1440, 60 / 1440, 480 / 1440];

/** "good"으로 졸업할 때의 첫 복습 간격(일). */
export const GRADUATING_INTERVAL = 1;
/** "easy"로 즉시 졸업할 때의 첫 복습 간격(일). */
export const EASY_INTERVAL = 4;

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;

/** hard/easy 간격 배수 및 easy 보너스. */
const HARD_MULTIPLIER = 1.2;
const EASY_BONUS = 1.3;

/** 스케줄링에 필요한 카드 상태의 최소 형태. */
export interface SrsState {
  state: CardState;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  learning_step: number;
}

/** 스케줄 계산 결과 (카드에 반영할 새 상태 + 이력 기록용 필드). */
export interface SrsResult extends SrsState {
  due_at: string; // SQLite UTC 'YYYY-MM-DD HH:MM:SS'
  prev_interval: number;
  next_interval: number;
}

function clampEase(ef: number): number {
  return Math.max(MIN_EASE, ef);
}

/** Date → SQLite가 쓰는 UTC 문자열 포맷. */
export function toSqlUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

function dueFrom(now: Date, intervalDays: number): string {
  return toSqlUtc(new Date(now.getTime() + intervalDays * 86400000));
}

/**
 * 카드 하나에 대해 평가(rating)를 적용했을 때의 다음 스케줄을 계산한다.
 * 카드 상태는 변경하지 않고 새 상태를 반환한다(순수 함수).
 */
export function schedule(
  card: SrsState,
  rating: Rating,
  now: Date = new Date(),
): SrsResult {
  const prevInterval = card.interval_days;
  const inLearning = card.state === "new" || card.state === "learning";

  let next: SrsState;
  let intervalDays: number;

  if (inLearning) {
    ({ next, intervalDays } = scheduleLearning(card, rating));
  } else {
    ({ next, intervalDays } = scheduleReview(card, rating));
  }

  return {
    ...next,
    due_at: dueFrom(now, intervalDays),
    prev_interval: prevInterval,
    next_interval: intervalDays,
  };
}

function scheduleLearning(
  card: SrsState,
  rating: Rating,
): { next: SrsState; intervalDays: number } {
  const ef = card.ease_factor || DEFAULT_EASE;
  const step = card.learning_step;

  if (rating === "again") {
    return {
      next: {
        state: "learning",
        ease_factor: ef,
        interval_days: 0,
        repetitions: 0,
        learning_step: 0,
      },
      intervalDays: LEARNING_STEPS[0],
    };
  }

  if (rating === "easy") {
    // 학습단계를 건너뛰고 즉시 졸업.
    return {
      next: {
        state: "review",
        ease_factor: ef,
        interval_days: EASY_INTERVAL,
        repetitions: 1,
        learning_step: 0,
      },
      intervalDays: EASY_INTERVAL,
    };
  }

  if (rating === "hard") {
    // 현재 단계를 다시 반복.
    const s = LEARNING_STEPS[Math.min(step, LEARNING_STEPS.length - 1)];
    return {
      next: {
        state: "learning",
        ease_factor: ef,
        interval_days: 0,
        repetitions: 0,
        learning_step: step,
      },
      intervalDays: s,
    };
  }

  // rating === "good": 다음 단계로. 마지막 단계를 넘으면 졸업.
  const nextStep = step + 1;
  if (nextStep >= LEARNING_STEPS.length) {
    return {
      next: {
        state: "review",
        ease_factor: ef,
        interval_days: GRADUATING_INTERVAL,
        repetitions: 1,
        learning_step: 0,
      },
      intervalDays: GRADUATING_INTERVAL,
    };
  }
  return {
    next: {
      state: "learning",
      ease_factor: ef,
      interval_days: 0,
      repetitions: 0,
      learning_step: nextStep,
    },
    intervalDays: LEARNING_STEPS[nextStep],
  };
}

function scheduleReview(
  card: SrsState,
  rating: Rating,
): { next: SrsState; intervalDays: number } {
  const ef = card.ease_factor || DEFAULT_EASE;
  const prev = card.interval_days || GRADUATING_INTERVAL;

  if (rating === "again") {
    // 실패(lapse): 이지팩터를 낮추고 학습단계로 복귀.
    return {
      next: {
        state: "learning",
        ease_factor: clampEase(ef - 0.2),
        interval_days: 0,
        repetitions: 0,
        learning_step: 0,
      },
      intervalDays: LEARNING_STEPS[0],
    };
  }

  let newEf = ef;
  let interval: number;

  if (rating === "hard") {
    newEf = clampEase(ef - 0.15);
    interval = prev * HARD_MULTIPLIER;
  } else if (rating === "easy") {
    newEf = clampEase(ef + 0.15);
    interval = prev * newEf * EASY_BONUS;
  } else {
    // good
    interval = prev * ef;
  }

  // 간격은 이전보다 최소 하루 이상 늘어나도록 보정(소수점 유지).
  interval = Math.max(interval, prev + 1);

  return {
    next: {
      state: "review",
      ease_factor: newEf,
      interval_days: interval,
      repetitions: card.repetitions + 1,
      learning_step: 0,
    },
    intervalDays: interval,
  };
}

/** 간격(일)을 사람이 읽기 좋은 한국어 라벨로. */
export function humanInterval(days: number): string {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))}분`;
  if (days < 1) return `${Math.round(days * 24)}시간`;
  if (days < 30) {
    const rounded = Math.round(days * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}일` : `${rounded.toFixed(1)}일`;
  }
  return `${Math.round(days / 30)}개월`;
}

/** 4개 평가 버튼에 표시할 "다음 복습까지" 예상 라벨. */
export function previewIntervals(
  card: SrsState,
  now: Date = new Date(),
): Record<Rating, string> {
  const ratings: Rating[] = ["again", "hard", "good", "easy"];
  const out = {} as Record<Rating, string>;
  for (const r of ratings) {
    out[r] = humanInterval(schedule(card, r, now).next_interval);
  }
  return out;
}
