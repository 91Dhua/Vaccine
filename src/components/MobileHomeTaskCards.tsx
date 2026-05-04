import {
  ExperimentOutlined,
  HeartFilled,
  MedicineBoxOutlined,
  RightOutlined,
  SwapOutlined
} from "@ant-design/icons";
import type { KeyboardEvent } from "react";
import type { FixtureHomeTask } from "../mobileHomeFixtures";
import type { MobileHomeTaskCard } from "../mobileHomeTypes";

function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>, onOpen: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onOpen();
  }
}

type VaccinationHomeCardProps = {
  card: MobileHomeTaskCard;
  done: number;
  total: number;
  pct: number;
  scopeMode: "workshop" | "room";
  onOpen: (card: MobileHomeTaskCard) => void;
};

export function VaccinationHomeCard({
  card,
  done,
  total,
  pct,
  scopeMode,
  onOpen
}: VaccinationHomeCardProps) {
  return (
    <div
      className="mv-mission-card mv-mission-card--pressable mv-mission-card--vaccination"
      role="button"
      tabIndex={0}
      aria-label={`${card.title}，点击选择房间`}
      onClick={() => onOpen(card)}
      onKeyDown={(event) => handleCardKeyDown(event, () => onOpen(card))}
    >
      <div className="mv-vaccine-card__head">
        <div className="mv-mission-card__icon mv-mission-card__icon--vaccine">
          <MedicineBoxOutlined />
        </div>
        <div className="mv-vaccine-card__main">
          <div className="mv-vaccine-card__title-row">
            <div className="mv-mission-card__title">{card.title}</div>
            {typeof card.dispatchedDays === "number" ? (
              <span className="mv-mission-card__dispatch-badge">已下发 {card.dispatchedDays} 天</span>
            ) : null}
          </div>
          <div className="mv-mission-card__sub">{card.subtitle}</div>
        </div>
      </div>

      <div className="mv-vaccine-card__progress">
        <div className="mv-vaccine-card__progress-row">
          <span className="mv-vaccine-card__progress-label">接种进度</span>
          <span className="mv-vaccine-card__progress-value">
            <em>{done}</em> / {total} 头
          </span>
        </div>
        <div className="mv-mission-card__progress-track">
          <div className="mv-mission-card__progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="mv-vaccine-card__hint">
          <span>{scopeMode === "room" ? "点击进入本单元接种任务" : "点击选择单元进入接种任务"}</span>
          <RightOutlined />
        </div>
      </div>
    </div>
  );
}

type FixtureMissionCardProps = {
  task: FixtureHomeTask;
  onOpen: (task: FixtureHomeTask) => void;
};

export function FixtureMissionCard({ task, onOpen }: FixtureMissionCardProps) {
  const progressDone = task.progressDone ?? 0;
  const progressPct = task.progressTotal
    ? Math.min(100, Math.round((progressDone / task.progressTotal) * 100))
    : 0;
  const isInspection = task.taskType === "postpartum-check" || task.taskType === "weaning-check";

  return (
    <div
      className={`mv-mission-card mv-mission-card--pressable${isInspection ? " mv-mission-card--inspection" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${task.title}，点击选择房间`}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => handleCardKeyDown(event, () => onOpen(task))}
    >
      <div className="mv-mission-card__head">
        <div
          className={`mv-mission-card__icon ${
            isInspection
              ? "mv-mission-card__icon--inspection"
              : task.kind === "production"
                ? "mv-mission-card__icon--prod"
                : "mv-mission-card__icon--xfer"
          }`}
        >
          {isInspection ? (
            <HeartFilled />
          ) : task.kind === "production" ? (
            <ExperimentOutlined />
          ) : (
            <SwapOutlined />
          )}
        </div>
        <div className="mv-mission-card__titles">
          <div className="mv-mission-card__title">{task.title}</div>
          <div className="mv-mission-card__sub">{task.subtitle}</div>
        </div>
        <span className="mv-mission-card__status mv-mission-card__status--muted">
          {task.statusLabel ?? "现场"}
        </span>
      </div>
      {task.progressTotal ? (
        <div className="mv-fixture-progress">
          <div className="mv-fixture-progress__meta">
            <span>{task.progressLabel ?? "已完成 / 目标"}</span>
            <span>
              <strong>{progressDone}</strong> / {task.progressTotal}
            </span>
          </div>
          <div className="mv-fixture-progress__track">
            <div className="mv-fixture-progress__fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
