import { useMemo, useState } from "react";
import { Button, Input, Progress, Select, Space, Tag, Typography, message } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  HomeOutlined,
  RightOutlined,
  ScanOutlined,
  SwapOutlined
} from "@ant-design/icons";
import { destinationMethodLabels, seedCullingTasks } from "./workflowData";
import type { CullingTaskSow, DestinationMethod, FieldDecision } from "./workflowTypes";
import "./CullingMobilePage.css";

const { Text } = Typography;

type MobileMode = "review" | "handling";
type SourceFilter = "ALL" | "MANAGER_SELECTED" | "SYSTEM_RECOMMENDED";

const reviewSeed = seedCullingTasks[0];
const handlingSeed = seedCullingTasks[2];

function decisionLabel(decision: FieldDecision) {
  const labels = {
    NOT_REVIEWED: "待复核",
    FIELD_CONFIRMED: "确认淘汰",
    FIELD_CONTESTED: "建议保留",
    IDENTITY_REVIEW_REQUIRED: "身份异常"
  } as const;
  return labels[decision];
}

function decisionColor(decision: FieldDecision) {
  if (decision === "FIELD_CONFIRMED") return "success";
  if (decision === "FIELD_CONTESTED") return "warning";
  if (decision === "IDENTITY_REVIEW_REQUIRED") return "error";
  return "default";
}

function mobileDestinationLabel(destination?: DestinationMethod) {
  if (!destination) return "待分配";
  if (destination === "SALE" || destination === "TRANSFER_OUT_OF_FARM") return "售卖/转移";
  if (destination === "INTERNAL_TRANSFER" || destination === "MOVE_TO_HOLDING") return "转舍";
  if (destination === "SLAUGHTER_OR_DISPOSAL") return "场内屠宰";
  return destinationMethodLabels[destination];
}

export function CullingMobilePage() {
  const [mode, setMode] = useState<MobileMode>("review");
  const [reviewSows, setReviewSows] = useState<CullingTaskSow[]>(reviewSeed.sows);
  const [handlingSows, setHandlingSows] = useState<CullingTaskSow[]>(handlingSeed.sows);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [handlingDoneIds, setHandlingDoneIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");

  const activeSows = mode === "review" ? reviewSows : handlingSows;
  const confirmedCount = reviewSows.filter((sow) => sow.fieldDecision === "FIELD_CONFIRMED").length;
  const reviewedCount = reviewSows.filter((sow) => sow.fieldDecision !== "NOT_REVIEWED").length;
  const reviewProgress = Math.round((reviewedCount / reviewSows.length) * 100);
  const handlingProgress = Math.round((handlingDoneIds.length / handlingSows.length) * 100);

  const filteredSows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return activeSows.filter((sow) => {
      const matchesQuery =
        !normalized ||
        sow.sowTag.toLowerCase().includes(normalized) ||
        sow.pen.toLowerCase().includes(normalized);
      const matchesSource = sourceFilter === "ALL" || sow.source === sourceFilter;
      return matchesQuery && matchesSource;
    });
  }, [activeSows, query, sourceFilter]);

  const selectedSows = activeSows.filter((sow) => selectedIds.includes(sow.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const applyReviewDecision = (decision: FieldDecision) => {
    if (selectedIds.length === 0) {
      message.info("请先选择要操作的猪只。");
      return;
    }
    setReviewSows((prev) =>
      prev.map((sow) => selectedIds.includes(sow.id) ? { ...sow, fieldDecision: decision } : sow)
    );
    message.success(`${selectedIds.length} 头猪已更新为：${decisionLabel(decision)}`);
    setSelectedIds([]);
  };

  const applyHandlingDestination = (destination: DestinationMethod) => {
    if (selectedIds.length === 0) {
      message.info("请先选择要安排去向的猪只。");
      return;
    }
    setHandlingSows((prev) =>
      prev.map((sow) =>
        selectedIds.includes(sow.id)
          ? { ...sow, destinationMethod: destination, slotReleaseStatus: "SCHEDULED_RELEASE" }
          : sow
      )
    );
    setHandlingDoneIds((prev) => [...new Set([...prev, ...selectedIds])]);
    message.success(`${selectedIds.length} 头猪已安排：${mobileDestinationLabel(destination)}`);
    setSelectedIds([]);
  };

  const selectAllVisible = () => {
    const visibleIds = filteredSows.map((sow) => sow.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter((id) => !visibleIds.includes(id)) : [...new Set([...selectedIds, ...visibleIds])]);
  };

  return (
    <div className="mobile-culling-page">
      <section className="mobile-culling-copy">
        <div className="mobile-culling-eyebrow">Mobile Prototype</div>
        <h1>淘汰 Mobile</h1>
        <p>现场操作改为批量选择：搜索/扫码/筛选在列表上方，底部固定操作栏直接对选中的猪执行复核或去向处理。</p>
      </section>

      <div className="phone-shell">
        <div className="phone-frame">
          <div className="phone-status"><span>9:41</span><span>Sentri</span></div>
          <div className="phone-content fixed-action-layout">
            {mode === "handling" && (
              <button
                className="mobile-back-button"
                onClick={() => {
                  setMode("review");
                  setSelectedIds([]);
                  setQuery("");
                  setSourceFilter("ALL");
                }}
              >
                <ArrowLeftOutlined /> 返回淘汰复核
              </button>
            )}

            <div className="mobile-task-scroll">
              {mode === "review" ? (
                <>
                  <section className="mobile-progress-board">
                    <div className="mobile-board-title">总任务进度</div>
                    <div className="mobile-board-meta">最近查看：admin sentri · 2026/03/26 15:31</div>
                    <div className="mobile-board-panel">
                      <div className="mobile-board-task">
                        <span className="mobile-board-icon">✓</span>
                        <div>
                          <b>淘汰复核</b>
                          <small>共 {reviewSows.length} 个单元</small>
                        </div>
                      </div>
                      <div className="mobile-board-count">
                        <strong>{reviewedCount}</strong><span>/ {reviewSows.length}</span>
                      </div>
                      <div className="mobile-board-progress-label">累计复核 / 目标复核</div>
                      <Progress percent={reviewProgress} showInfo={false} strokeColor="#168414" trailColor="#edf3ed" />
                      <div className="mobile-board-instruction">请扫描或选择猪只，批量标记为“确认淘汰”或“建议保留”。</div>
                      <button
                        className="mobile-confirmed-entry in-board"
                        onClick={() => {
                          setMode("handling");
                          setSelectedIds([]);
                          setQuery("");
                          setSourceFilter("ALL");
                        }}
                      >
                        <span className="mobile-entry-icon" />
                        <span>已淘汰列表</span>
                        <RightOutlined />
                      </button>
                    </div>
                  </section>
                </>
              ) : (
                <>
                  <div className="mobile-card task-head-card">
                    <div>
                      <div className="mobile-card-title">已淘汰列表</div>
                      <div className="mobile-card-sub">查看已完成淘汰确认的猪只，并确认后续去向完成。</div>
                    </div>
                    <Tag color="orange">待执行</Tag>
                  </div>
                  <div className="mobile-progress-row"><span>确认去向进度</span><span>{handlingProgress}%</span></div>
                  <Progress percent={handlingProgress} showInfo={false} strokeColor="#14532d" />
                </>
              )}

              <div className="mobile-list-toolbar one-line">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索耳标/栏位"
                  allowClear
                  prefix={<ScanOutlined />}
                  size="small"
                  className="mobile-search-input"
                />
                <Select
                  value={sourceFilter}
                  onChange={setSourceFilter}
                  options={[
                    { label: "全部", value: "ALL" },
                    { label: "指定", value: "MANAGER_SELECTED" },
                    { label: "推荐", value: "SYSTEM_RECOMMENDED" }
                  ]}
                  size="small"
                  className="mobile-source-select"
                />
                <Button size="small" onClick={selectAllVisible}>全选</Button>
              </div>

              <div className="mobile-list-section">
                <div className="mobile-list-hint">上下滑动浏览猪只列表</div>
                <div className="mobile-list">
                  {filteredSows.map((sow) => (
                  <button
                    key={sow.id}
                    className={`mobile-sow-row ${selectedIds.includes(sow.id) ? "active" : ""}`}
                    onClick={() => toggleSelect(sow.id)}
                  >
                    <span className="mobile-select-dot">{selectedIds.includes(sow.id) ? "✓" : ""}</span>
                    <span className="mobile-sow-main">
                      <b>{sow.sowTag}</b>
                      <small>{sow.pen}</small>
                      <em>{sow.reasons.join(" / ")}</em>
                    </span>
                    <span className="mobile-row-tags">
                      {mode === "review" ? (
                        sow.fieldDecision === "NOT_REVIEWED" && sow.isRecommended ? (
                          <Tag color="orange">建议淘汰</Tag>
                        ) : (
                          <Tag color={decisionColor(sow.fieldDecision)}>{decisionLabel(sow.fieldDecision)}</Tag>
                        )
                      ) : (
                        <>
                          <Tag>{mobileDestinationLabel(sow.destinationMethod)}</Tag>
                          <Tag color={handlingDoneIds.includes(sow.id) ? "success" : "default"}>{handlingDoneIds.includes(sow.id) ? "完成" : "待处理"}</Tag>
                        </>
                      )}
                    </span>
                  </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mobile-fixed-action-bar">
              <div className="mobile-selected-summary">
                <Text strong>已选 {selectedIds.length} 头</Text>
                <span>{selectedSows.map((sow) => sow.sowTag).slice(0, 3).join("、")}{selectedIds.length > 3 ? "…" : ""}</span>
              </div>
              {mode === "review" ? (
                <Space.Compact block>
                  <Button icon={<CheckOutlined />} type="primary" onClick={() => applyReviewDecision("FIELD_CONFIRMED")}>确认淘汰</Button>
                  <Button onClick={() => applyReviewDecision("FIELD_CONTESTED")}>建议保留</Button>
                </Space.Compact>
              ) : (
                <div className="mobile-destination-actions">
                  <Button type="primary" onClick={() => applyHandlingDestination("SALE")}>售卖/转移</Button>
                  <Button onClick={() => applyHandlingDestination("INTERNAL_TRANSFER")}>转舍</Button>
                  <Button onClick={() => applyHandlingDestination("SLAUGHTER_OR_DISPOSAL")}>场内屠宰</Button>
                </div>
              )}
              {mode === "handling" && selectedSows[0] && (
                <div className="handling-inline-path">
                  <HomeOutlined /> 原栏 {selectedSows[0].pen} <SwapOutlined /> {mobileDestinationLabel(selectedSows[0].destinationMethod)}
                </div>
              )}
            </div>
          </div>
          <div className="phone-home" />
        </div>
      </div>
    </div>
  );
}
