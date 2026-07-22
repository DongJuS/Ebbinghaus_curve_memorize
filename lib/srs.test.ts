import { test } from "node:test";
import assert from "node:assert/strict";
import {
  schedule,
  previewIntervals,
  humanInterval,
  toSqlUtc,
  LEARNING_STEPS,
  GRADUATING_INTERVAL,
  EASY_INTERVAL,
  MIN_EASE,
  DEFAULT_EASE,
  type SrsState,
} from "./srs.ts";

const NOW = new Date("2026-07-22T00:00:00Z");

function newCard(overrides: Partial<SrsState> = {}): SrsState {
  return {
    state: "new",
    ease_factor: DEFAULT_EASE,
    interval_days: 0,
    repetitions: 0,
    learning_step: 0,
    ...overrides,
  };
}

test("신규 카드는 good 3번으로 학습단계를 거쳐 졸업한다", () => {
  let card: SrsState = newCard();

  let r = schedule(card, "good", NOW);
  assert.equal(r.state, "learning");
  assert.equal(r.learning_step, 1);
  assert.equal(r.next_interval, LEARNING_STEPS[1]);
  card = r;

  r = schedule(card, "good", NOW);
  assert.equal(r.state, "learning");
  assert.equal(r.learning_step, 2);
  assert.equal(r.next_interval, LEARNING_STEPS[2]);
  card = r;

  r = schedule(card, "good", NOW);
  assert.equal(r.state, "review");
  assert.equal(r.repetitions, 1);
  assert.equal(r.next_interval, GRADUATING_INTERVAL);
});

test("신규 카드 again은 첫 학습단계(10분)로 리셋", () => {
  const r = schedule(newCard(), "again", NOW);
  assert.equal(r.state, "learning");
  assert.equal(r.learning_step, 0);
  assert.equal(r.next_interval, LEARNING_STEPS[0]);
});

test("신규 카드 easy는 즉시 졸업(4일)", () => {
  const r = schedule(newCard(), "easy", NOW);
  assert.equal(r.state, "review");
  assert.equal(r.next_interval, EASY_INTERVAL);
  assert.equal(r.repetitions, 1);
});

test("복습 카드 good은 간격 = 이전 * EF (소수점 유지)", () => {
  const card = newCard({
    state: "review",
    interval_days: 4,
    ease_factor: 2.5,
    repetitions: 1,
  });
  const r = schedule(card, "good", NOW);
  assert.equal(r.next_interval, 10); // 4 * 2.5
  assert.equal(r.repetitions, 2);
});

test("복습 카드 again은 lapse — 학습단계 복귀 + EF 감소", () => {
  const card = newCard({
    state: "review",
    interval_days: 10,
    ease_factor: 2.5,
  });
  const r = schedule(card, "again", NOW);
  assert.equal(r.state, "learning");
  assert.equal(r.learning_step, 0);
  assert.ok(Math.abs(r.ease_factor - 2.3) < 1e-9);
});

test("EF는 최소값(1.3) 아래로 내려가지 않는다", () => {
  const card = newCard({
    state: "review",
    interval_days: 5,
    ease_factor: 1.3,
  });
  const r = schedule(card, "hard", NOW);
  assert.ok(r.ease_factor >= MIN_EASE);
});

test("복습 간격은 항상 이전보다 최소 하루 이상 증가", () => {
  const card = newCard({
    state: "review",
    interval_days: 5,
    ease_factor: 1.3,
  });
  const r = schedule(card, "hard", NOW); // 5 * 1.2 = 6 vs 5+1=6
  assert.ok(r.next_interval >= card.interval_days + 1 - 1e-9);
});

test("due_at은 소수점 간격을 반영한 UTC 문자열", () => {
  const r = schedule(newCard(), "good", NOW); // +1시간
  assert.equal(r.due_at, "2026-07-22 01:00:00");
});

test("toSqlUtc 포맷", () => {
  assert.equal(toSqlUtc(new Date("2026-01-05T09:07:03Z")), "2026-01-05 09:07:03");
});

test("humanInterval 라벨링", () => {
  assert.equal(humanInterval(10 / 1440), "10분");
  assert.equal(humanInterval(1 / 24), "1시간");
  assert.equal(humanInterval(1), "1일");
  assert.equal(humanInterval(2.5), "2.5일");
  assert.equal(humanInterval(60), "2개월");
});

test("previewIntervals는 4개 평가 라벨을 반환", () => {
  const p = previewIntervals(newCard(), NOW);
  assert.deepEqual(Object.keys(p).sort(), ["again", "easy", "good", "hard"]);
  assert.equal(typeof p.good, "string");
});
