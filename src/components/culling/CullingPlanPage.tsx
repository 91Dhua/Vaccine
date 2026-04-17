import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Input,
  InputNumber,
  Modal,
  Progress,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  PlusOutlined,
  StopOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import { batchCullingSows, cullingReasonLabels } from "./cullingData";
import { replacementCandidates } from "../replacement/replacementData";
import type { ReplacementCandidate } from "../replacement/types";
import type { CullingSowRow, CullingTargetMode } from "./types";
import "./CullingPlanPage.css";

const { Text } = Typography;

const BATCH_SOW_COUNT: number = 10;
const BATCH_NAME = "Batch 26F001";
const PRODUCTION_LINE = "Line A · Breeding Herd";
const TARGET_REPLACEMENT_UNIT = "妊娠舍 A2";
const TARGET_REPLACEMENT_FREE_SLOTS = 6;

const capacityForecast = {
  nextBatchName: "Batch 26F002",
  nextBatchStartDate: "2026-02-24",
  nextBatchRequiredSowSlots: 12,
  currentlyEmptyEligibleSlots: 3,
  scheduledVacanciesBeforeNextBatch: 4,
  confirmedTransferOutSows: 1,
  confirmedOutboundSows: 0,
  reservedSlotsForOtherTasks: 1
};

function calculateTarget(mode: CullingTargetMode, value: number) {
  if (mode === "percentage") {
    return Math.ceil((BATCH_SOW_COUNT * value) / 100);
  }
  return Math.min(Math.max(0, Math.floor(value)), BATCH_SOW_COUNT);
}

function formatTargetUnit(mode: CullingTargetMode, value: number, target: number) {
  if (mode === "percentage") {
    return `%（约 ${target} 头）`;
  }
  const ratio = BATCH_SOW_COUNT === 0 ? 0 : Math.round((value / BATCH_SOW_COUNT) * 100);
  return `头 · ${ratio}%`;
}

const replacementSourceLabels = {
  internal: "场内后备",
  purchased: "外购后备",
  quarantine: "隔离后备"
} as const;

const replacementEligibilityLabels = {
  ELIGIBLE: "可补入",
  WARNING: "需复核",
  BLOCKED: "不可选"
} as const;

const replacementEligibilityColors = {
  ELIGIBLE: "success",
  WARNING: "warning",
  BLOCKED: "error"
} as const;

export function CullingPlanPage() {
  const [planEnabled, setPlanEnabled] = useState(true);
  const [replacementEnabled, setReplacementEnabled] = useState(false);
  const [targetMode, setTargetMode] = useState<CullingTargetMode>("percentage");
  const [targetValue, setTargetValue] = useState(10);
  const [plannedMatingCount, setPlannedMatingCount] = useState(12);
  const [safetyBuffer, setSafetyBuffer] = useState(2);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCullingIds, setSelectedCullingIds] = useState<string[]>([]);
  const [draftCullingIds, setDraftCullingIds] = useState<string[]>([]);
  const [showEarTagAdd, setShowEarTagAdd] = useState(false);
  const [earTagQuery, setEarTagQuery] = useState("");
  const [selectedReplacementIds, setSelectedReplacementIds] = useState<string[]>([]);
  const [draftReplacementIds, setDraftReplacementIds] = useState<string[]>([]);
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [replacementSourceFilter, setReplacementSourceFilter] = useState<"ALL" | ReplacementCandidate["source"]>("ALL");
  const [replacementQuery, setReplacementQuery] = useState("");

  const plannedTarget = useMemo(
    () => calculateTarget(targetMode, Number(targetValue || 0)),
    [targetMode, targetValue]
  );

  const draftRows = useMemo(
    () => batchCullingSows.filter((sow) => draftCullingIds.includes(sow.id)),
    [draftCullingIds]
  );

  const projectedAvailableSlotsBeforeCulling = Math.max(
    0,
    capacityForecast.currentlyEmptyEligibleSlots +
      capacityForecast.scheduledVacanciesBeforeNextBatch +
      capacityForecast.confirmedTransferOutSows +
      capacityForecast.confirmedOutboundSows -
      capacityForecast.reservedSlotsForOtherTasks
  );
  const minimumRequiredVacancies = Math.max(
    0,
    capacityForecast.nextBatchRequiredSowSlots - projectedAvailableSlotsBeforeCulling
  );
  const remainingCapacityGap = Math.max(
    0,
    minimumRequiredVacancies - selectedCullingIds.length
  );
  const hasCapacityPressure = minimumRequiredVacancies > 0;
  const capacityProgressPercent = minimumRequiredVacancies
    ? Math.min(100, Math.round((selectedCullingIds.length / minimumRequiredVacancies) * 100))
    : 100;

  const remainingGap = Math.max(0, plannedTarget - selectedCullingIds.length);
  const overTarget = Math.max(0, selectedCullingIds.length - plannedTarget);

  const adjustedMatingPreparationTarget = Math.max(0, plannedMatingCount + safetyBuffer);
  const expectedCullingCount = planEnabled ? Math.max(plannedTarget, selectedCullingIds.length) : 0;
  const projectedSowsAfterCulling = Math.max(0, BATCH_SOW_COUNT - expectedCullingCount);
  const estimatedStableAvailableSows = projectedSowsAfterCulling;
  const requiredReplacementCount = Math.max(
    0,
    adjustedMatingPreparationTarget - estimatedStableAvailableSows
  );
  const selectedReplacementRows = replacementCandidates.filter((candidate) =>
    selectedReplacementIds.includes(candidate.id)
  );
  const draftReplacementRows = replacementCandidates.filter((candidate) =>
    draftReplacementIds.includes(candidate.id)
  );
  const selectedReplacementCount = selectedReplacementRows.filter(
    (candidate) => candidate.eligibility !== "BLOCKED"
  ).length;
  const draftReplacementCount = draftReplacementRows.filter(
    (candidate) => candidate.eligibility !== "BLOCKED"
  ).length;
  const remainingReplacementGap = Math.max(
    0,
    requiredReplacementCount - selectedReplacementCount
  );
  const draftRemainingReplacementGap = Math.max(
    0,
    requiredReplacementCount - draftReplacementCount
  );
  const replacementCapacityGap = Math.max(
    0,
    selectedReplacementCount - TARGET_REPLACEMENT_FREE_SLOTS
  );
  const draftReplacementCapacityGap = Math.max(
    0,
    draftReplacementCount - TARGET_REPLACEMENT_FREE_SLOTS
  );
  const replacementProgressPercent = requiredReplacementCount
    ? Math.min(100, Math.round((selectedReplacementCount / requiredReplacementCount) * 100))
    : 100;

  const resourceRiskLevel =
    requiredReplacementCount === 0
      ? "LOW"
      : selectedReplacementCount >= requiredReplacementCount
        ? "LOW"
        : remainingReplacementGap <= Math.max(1, Math.ceil(requiredReplacementCount * 0.25))
          ? "MEDIUM"
          : "HIGH";
  const resourceRiskCopy = {
    LOW: "当前资源覆盖目标，整体风险较低",
    MEDIUM: "仍有少量补充缺口，建议尽快确认后备名单",
    HIGH: "补充缺口明显，存在配种目标无法达成风险"
  }[resourceRiskLevel];
  const resourceRiskColor = { LOW: "success", MEDIUM: "warning", HIGH: "error" }[resourceRiskLevel];

  const getCandidateWindow = (candidate: ReplacementCandidate) => {
    if (candidate.eligibility === "BLOCKED") return "不适合本批";
    if (candidate.estrusStatus.includes("三情期")) return "本周可配";
    if (candidate.estrusStatus.includes("二情期")) return "7-10 天内";
    return "需继续观察";
  };

  const filteredReplacementCandidates = useMemo(() => {
    const normalized = replacementQuery.trim().toLowerCase();
    return replacementCandidates.filter((candidate) => {
      const hitQuery =
        !normalized ||
        candidate.earTag.toLowerCase().includes(normalized) ||
        candidate.location.toLowerCase().includes(normalized);
      const hitSource =
        replacementSourceFilter === "ALL" || candidate.source === replacementSourceFilter;
      return hitQuery && hitSource;
    });
  }, [replacementQuery, replacementSourceFilter]);

  const addRecommendedReplacements = () => {
    const recommendedIds = replacementCandidates
      .filter((candidate) => candidate.recommended && candidate.eligibility !== "BLOCKED")
      .slice(0, Math.max(requiredReplacementCount, 1))
      .map((candidate) => candidate.id);
    setDraftReplacementIds((prev) => [...new Set([...prev, ...recommendedIds])]);
    message.success("已按系统建议加入补入名单，最终仍由管理者确认。");
  };

  const addSowByEarTag = (value: string) => {
    const normalized = value.trim().toUpperCase();
    if (!normalized) return;

    const matched = batchCullingSows.find(
      (sow) => sow.sowTag.toUpperCase() === normalized
    );

    if (!matched) {
      message.warning("该耳标不属于当前批次，不能加入本批次淘汰计划。");
      return;
    }

    setDraftCullingIds((prev) =>
      prev.includes(matched.id) ? prev : [...prev, matched.id]
    );
    setEarTagQuery("");
  };

  const columns: ColumnsType<CullingSowRow> = [
    {
      title: "耳标号",
      dataIndex: "sowTag",
      fixed: "left",
      width: 124,
      sorter: (a, b) => a.sowTag.localeCompare(b.sowTag),
      render: (value: string, row) => (
        <div className="culling-sow-identity">
          <Space size={6} wrap={false}>
            <Text strong>{value}</Text>
            {row.isRecommended && <Tag color="orange">建议淘汰</Tag>}
          </Space>
          <Text type="secondary" className="culling-reason-text">{row.pen}</Text>
        </div>
      )
    },
    {
      title: "胎次",
      dataIndex: "parity",
      width: 72,
      align: "center",
      sorter: (a, b) => a.parity - b.parity,
      render: (value) => <span className={`culling-metric-cell ${value >= 6 ? "is-risk" : ""}`}>{value}</span>
    },
    {
      title: "历史难产",
      dataIndex: "dystociaHistoryCount",
      width: 96,
      align: "center",
      sorter: (a, b) => a.dystociaHistoryCount - b.dystociaHistoryCount,
      render: (value) => <span className={`culling-metric-cell ${value >= 2 ? "is-risk" : ""}`}>{value} 次</span>
    },
    {
      title: "窝均产仔",
      dataIndex: "averageLitterSize",
      width: 96,
      align: "center",
      sorter: (a, b) => a.averageLitterSize - b.averageLitterSize,
      render: (value) => <span className={`culling-metric-cell ${value < 9.5 ? "is-risk" : ""}`}>{value} 头</span>
    },
    {
      title: "乳头数量",
      dataIndex: "teatCount",
      width: 96,
      align: "center",
      sorter: (a, b) => a.teatCount - b.teatCount,
      render: (value) => <span className={`culling-metric-cell ${value < 12 ? "is-risk" : ""}`}>{value} 个</span>
    },
    {
      title: "返情次数",
      dataIndex: "returnToEstrusCount",
      width: 96,
      align: "center",
      sorter: (a, b) => a.returnToEstrusCount - b.returnToEstrusCount,
      render: (value) => <span className={`culling-metric-cell ${value >= 2 ? "is-risk" : ""}`}>{value} 次</span>
    },
    {
      title: "疾病标签",
      dataIndex: "diseaseTags",
      width: 168,
      sorter: (a, b) => a.diseaseTags.length - b.diseaseTags.length,
      render: (tags: string[]) => tags.length ? (
        <div className="culling-disease-tags">
          {tags.map((tag) => <Tag key={tag} color="red">{tag}</Tag>)}
        </div>
      ) : <span className="culling-metric-cell">-</span>
    },
    {
      title: "淘汰原因",
      dataIndex: "reason",
      width: 128,
      sorter: (a, b) => (a.reason ? cullingReasonLabels[a.reason] : "").localeCompare(b.reason ? cullingReasonLabels[b.reason] : ""),
      render: (value: CullingSowRow["reason"]) => (
        <span className="culling-table-pill">{value ? cullingReasonLabels[value] : "-"}</span>
      )
    }
  ];

  const replacementColumns: ColumnsType<ReplacementCandidate> = [
    {
      title: "后备母猪",
      dataIndex: "earTag",
      render: (value: string, row) => (
        <Space direction="vertical" size={2}>
          <Space size={6}>
            <Text strong>{value}</Text>
            {row.recommended && row.eligibility !== "BLOCKED" && (
              <Tag color="green">建议补入</Tag>
            )}
          </Space>
          <Text type="secondary" className="culling-reason-text">
            {replacementSourceLabels[row.source]} · {row.location}
          </Text>
        </Space>
      )
    },
    {
      title: "生产条件",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text>{row.ageDays}日龄 · {row.weightKg}kg · BCS {row.bodyCondition}</Text>
          <Text type="secondary" className="culling-reason-text">{row.estrusStatus}</Text>
        </Space>
      )
    },
    {
      title: "预计可配窗口",
      width: 130,
      render: (_, row) => <Tag color={row.eligibility === "BLOCKED" ? "red" : "blue"}>{getCandidateWindow(row)}</Tag>
    },
    {
      title: "健康/免疫",
      width: 160,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text>{row.healthStatus}</Text>
          <Text type="secondary" className="culling-reason-text">{row.vaccinationStatus}</Text>
        </Space>
      )
    },
    {
      title: "评分",
      dataIndex: "score",
      width: 120,
      sorter: (a, b) => a.score - b.score,
      defaultSortOrder: "descend",
      render: (score: number) => <Progress percent={score} size="small" strokeColor="#16a34a" />
    },
    {
      title: "规则",
      dataIndex: "eligibility",
      width: 120,
      render: (value: ReplacementCandidate["eligibility"], row) => (
        <Space direction="vertical" size={4}>
          <Tag color={replacementEligibilityColors[value]}>
            {replacementEligibilityLabels[value]}
          </Tag>
          {row.blockers.map((blocker) => (
            <Tag key={blocker} color="red">{blocker}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: "推荐原因",
      dataIndex: "reasons",
      render: (reasons: string[]) => (
        <Space size={[4, 4]} wrap>
          {reasons.map((reason) => (
            <Tag key={reason} className="culling-replacement-reason-tag">{reason}</Tag>
          ))}
        </Space>
      )
    }
  ];

  return (
    <div className="culling-page">
      <section className="culling-hero">
        <div>
          <div className="culling-eyebrow">Production Planning</div>
          <h1 className="culling-title">淘汰&补充计划</h1>
          <div className="culling-subtitle">
            在批次开始前设置软性淘汰目标，并同步配置需要补入的后备母猪，帮助批次在淘汰后保持生产种群稳定。
          </div>
        </div>
        <div className="culling-hero-actions">
          <Tag color="processing">{BATCH_NAME}</Tag>
          <Tag>{PRODUCTION_LINE}</Tag>
          <Tag color="default">Soft Target</Tag>
        </div>
      </section>


      {hasCapacityPressure && (
        <section className="culling-capacity-card">
          <div className="culling-capacity-main">
            <div className="culling-capacity-kicker">Capacity Pressure</div>
            <h2 className="culling-capacity-title">至少需要释放 {minimumRequiredVacancies} 个母猪栏位</h2>
            <div className="culling-capacity-copy">
              按当前批次运转，{capacityForecast.nextBatchName} 将在 {capacityForecast.nextBatchStartDate} 需要 {capacityForecast.nextBatchRequiredSowSlots} 个母猪栏位。系统预计在不额外淘汰的情况下只有 {projectedAvailableSlotsBeforeCulling} 个可用栏位，因此还需要释放 {minimumRequiredVacancies} 个栏位。
            </div>
            <div className="culling-capacity-explain">
              如果不通过转栏、减少/延迟下批次进入来解决，则至少需要淘汰 {minimumRequiredVacancies} 头生产母猪。淘汰名单仍可由用户动态决定。
            </div>
          </div>

          <div className="culling-capacity-panel">
            <div className="culling-capacity-panel-title">Capacity Requirement</div>
            <Progress
              percent={capacityProgressPercent}
              showInfo={false}
              strokeColor={remainingCapacityGap > 0 ? "#b45309" : "#16a34a"}
              trailColor="#f1f5f9"
            />
            <div className="culling-capacity-progress-copy">
              已指定 {selectedCullingIds.length} / 必需释放 {minimumRequiredVacancies}
            </div>
            {remainingCapacityGap > 0 ? (
              <Tag color="warning">仍需解决 {remainingCapacityGap} 个栏位</Tag>
            ) : (
              <Tag color="success">栏位压力已解决</Tag>
            )}
          </div>
        </section>
      )}

      <section className="culling-summary-grid">
        <div className="culling-stat-card">
          <div className="culling-stat-label">批次母猪</div>
          <div className="culling-stat-value">{BATCH_SOW_COUNT}</div>
          <div className="culling-stat-note">批次开始时固定基数</div>
        </div>
        <div className="culling-stat-card">
          <div className="culling-stat-label">Mating Target</div>
          <div className="culling-stat-value">{plannedMatingCount}</div>
          <div className="culling-stat-note">计划配种头数</div>
        </div>
        <div className="culling-stat-card">
          <div className="culling-stat-label">Safety Buffer</div>
          <div className="culling-stat-value">+{safetyBuffer}</div>
          <div className="culling-stat-note">安全余量</div>
        </div>
        <div className="culling-stat-card">
          <div className="culling-stat-label">计划淘汰</div>
          <div className="culling-stat-value">{plannedTarget}</div>
          <div className="culling-stat-note">{targetMode === "percentage" ? `${targetValue}% 向上取整` : "手动头数"}</div>
        </div>
        <div className="culling-stat-card">
          <div className="culling-stat-label">手动名单</div>
          <div className="culling-stat-value">{selectedCullingIds.length}</div>
          <div className="culling-stat-note">指定必淘母猪</div>
        </div>
        <div className="culling-stat-card">
          <div className="culling-stat-label">目标差异</div>
          <div className="culling-stat-value">
            {overTarget > 0 ? `+${overTarget}` : remainingGap > 0 ? `-${remainingGap}` : "0"}
          </div>
          <div className="culling-stat-note">软目标差异，不阻断</div>
        </div>
        {hasCapacityPressure && (
          <div className="culling-stat-card is-warning">
            <div className="culling-stat-label">Minimum Vacancies</div>
            <div className="culling-stat-value">{minimumRequiredVacancies}</div>
            <div className="culling-stat-note">为下批次正常运行必须解决</div>
          </div>
        )}
      </section>

      <section className="culling-board">
        <div className="culling-plan-card">
          <div className="culling-plan-card-header">
            <div className="culling-plan-heading">
              <StopOutlined className="culling-plan-icon" />
              <div>
                <div className="culling-plan-title">计划淘汰母猪</div>
                <div className="culling-plan-description">
                  识别并安排本批次需要淘汰的生产母猪。
                </div>
              </div>
            </div>
            <Switch checked={planEnabled} onChange={setPlanEnabled} />
          </div>

          {planEnabled && (
            <div className="culling-plan-body">
              <div>
                <div className="culling-target-title">淘汰目标</div>
                <div className="culling-target-copy">
                  设置本批次计划淘汰的生产母猪数量。
                </div>
                <div className="culling-target-control">
                  <Segmented
                    value={targetMode}
                    onChange={(value) => setTargetMode(value as CullingTargetMode)}
                    options={[
                      { label: "百分比", value: "percentage" },
                      { label: "头数", value: "number" }
                    ]}
                  />
                  <InputNumber
                    min={0}
                    max={targetMode === "percentage" ? 100 : BATCH_SOW_COUNT}
                    value={targetValue}
                    onChange={(value) => setTargetValue(Number(value || 0))}
                  />
                  <span className="culling-target-unit">
                    {formatTargetUnit(targetMode, Number(targetValue || 0), plannedTarget)}
                  </span>
                </div>

                <div className="culling-manual-block">
                  <div className="culling-manual-title">手动指定淘汰母猪</div>
                  <div className="culling-manual-copy">
                    手动指定必须淘汰的母猪，优先于系统推荐结果。
                  </div>
                </div>
              </div>

              <Button
                className="culling-manage-button"
                icon={<EditOutlined />}
                onClick={() => {
                  setDraftCullingIds(selectedCullingIds);
                  setShowEarTagAdd(false);
                  setEarTagQuery("");
                  setModalOpen(true);
                }}
              >
                管理淘汰名单
              </Button>
            </div>
          )}
        </div>

        <div className="culling-plan-card">
          <div className="culling-plan-card-header">
            <div className="culling-plan-heading">
              <UserAddOutlined className="culling-plan-icon muted" />
              <div>
                <div className="culling-plan-title">补充后备母猪</div>
                <div className="culling-plan-description">
                  根据计划配种头数、安全余量和预计淘汰数量，计算本批次需要补充的后备母猪。
                </div>
              </div>
            </div>
            <Switch checked={replacementEnabled} onChange={setReplacementEnabled} />
          </div>

          {replacementEnabled && (
            <div className="culling-replacement-body is-summary-only">
              <div className="culling-replacement-config-row">
                <div className="culling-config-field">
                  <span>计划配种头数</span>
                  <InputNumber
                    min={0}
                    value={plannedMatingCount}
                    onChange={(value) => setPlannedMatingCount(Number(value || 0))}
                  />
                </div>
                <div className="culling-config-field">
                  <span>安全余量</span>
                  <InputNumber
                    min={0}
                    value={safetyBuffer}
                    onChange={(value) => setSafetyBuffer(Number(value || 0))}
                  />
                </div>
                <div className="culling-config-result">
                  <span>调整后准备目标</span>
                  <strong>{adjustedMatingPreparationTarget} 头</strong>
                </div>
              </div>

              <div className="culling-replacement-summary">
                <div className="culling-replacement-summary-main">
                  <div className="culling-target-title">资源缺口判断</div>
                  <div className="culling-target-copy">
                    当前批次有 {BATCH_SOW_COUNT} 头生产母猪；系统预计淘汰 {expectedCullingCount} 头后，稳定可用母猪约 {estimatedStableAvailableSows} 头。
                    为完成 {plannedMatingCount} 头计划配种并保留 {safetyBuffer} 头安全余量，建议补充 {requiredReplacementCount} 头后备母猪。
                  </div>
                  <div className="culling-replacement-progress">
                    <div className="culling-replacement-progress-head">
                      <Text strong>已选 {selectedReplacementCount} / 建议补充 {requiredReplacementCount}</Text>
                      <Tag color={remainingReplacementGap > 0 ? "warning" : "success"}>
                        仍需补充 {remainingReplacementGap}
                      </Tag>
                    </div>
                    <Progress percent={replacementProgressPercent} strokeColor="#16a34a" />
                  </div>
                </div>
                <div className="culling-replacement-summary-side">
                  <Tag color={resourceRiskColor}>资源风险：{resourceRiskCopy}</Tag>
                  <Tag color={replacementCapacityGap > 0 ? "error" : "success"}>
                    {TARGET_REPLACEMENT_UNIT} 空位 {TARGET_REPLACEMENT_FREE_SLOTS}
                  </Tag>
                  {replacementCapacityGap > 0 ? (
                    <Alert
                      type="error"
                      showIcon
                      message={`当前补入名单会缺 ${replacementCapacityGap} 个栏位`}
                      description="可以先保存补入名单，但转入/加入批次需要等待栏位释放或调整目标栏位。"
                    />
                  ) : (
                    <Alert
                      type={remainingReplacementGap > 0 ? "warning" : "success"}
                      showIcon
                      message={remainingReplacementGap > 0 ? `仍建议补充 ${remainingReplacementGap} 头` : "补入数量已满足配种准备目标"}
                    />
                  )}
                </div>
              </div>

              <div className="culling-replacement-footer">
                <span>
                  已选补入：{selectedReplacementRows.length > 0
                    ? selectedReplacementRows.map((candidate) => candidate.earTag).join("、")
                    : "暂无"}
                </span>
                <Button
                  className="culling-manage-button"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setDraftReplacementIds(selectedReplacementIds);
                    setReplacementQuery("");
                    setReplacementSourceFilter("ALL");
                    setReplacementModalOpen(true);
                  }}
                >
                  指定补充母猪
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <Modal
        title="指定补充母猪"
        open={replacementModalOpen}
        width={920}
        centered
        onCancel={() => setReplacementModalOpen(false)}
        footer={
          <div className="culling-modal-footer">
            <span className="culling-modal-footer-note">
              已选 {draftReplacementCount} / 需补充 {requiredReplacementCount}；
              {draftRemainingReplacementGap > 0
                ? ` 仍需补充 ${draftRemainingReplacementGap} 头`
                : " 补入数量已满足目标"}
            </span>
            <Button
              type="primary"
              className="culling-done-button"
              onClick={() => {
                setSelectedReplacementIds(draftReplacementIds);
                setReplacementModalOpen(false);
                message.success("补入名单已保存为本批次淘汰&补充计划的一部分。");
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="culling-modal-copy">
          根据计划配种 {plannedMatingCount} 头、安全余量 {safetyBuffer} 头、当前生产母猪 {BATCH_SOW_COUNT} 头，以及预计淘汰 {expectedCullingCount} 头计算，系统建议补充 {requiredReplacementCount} 头后备母猪。
        </div>
        {draftReplacementCapacityGap > 0 ? (
          <Alert
            type="error"
            showIcon
            message={`按当前草稿转入会缺 ${draftReplacementCapacityGap} 个栏位`}
            description="名单可以保存，但转入/加入批次需要等待栏位释放或调整目标栏位。"
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="这里只配置补入名单，后续 Mobile 现场复核与转入执行会由任务流程承接。"
            style={{ marginBottom: 16 }}
          />
        )}
        <div className="culling-replacement-toolbar">
          <Space wrap>
            <Input
              allowClear
              placeholder="搜索耳标号 / 位置"
              value={replacementQuery}
              onChange={(event) => setReplacementQuery(event.target.value)}
              style={{ width: 220 }}
            />
            <Select
              value={replacementSourceFilter}
              onChange={setReplacementSourceFilter}
              style={{ width: 138 }}
              options={[
                { value: "ALL", label: "全部来源" },
                { value: "internal", label: "场内后备" },
                { value: "quarantine", label: "隔离后备" },
                { value: "purchased", label: "外购后备" }
              ]}
            />
          </Space>
          <Button icon={<PlusOutlined />} onClick={addRecommendedReplacements}>
            加入建议补入
          </Button>
        </div>
        <Table
          className="culling-replacement-table"
          rowKey="id"
          size="small"
          dataSource={filteredReplacementCandidates}
          columns={replacementColumns}
          pagination={{ pageSize: 5 }}
          rowSelection={{
            selectedRowKeys: draftReplacementIds,
            onChange: (keys) => setDraftReplacementIds(keys.map(String)),
            getCheckboxProps: (candidate) => ({ disabled: candidate.eligibility === "BLOCKED" })
          }}
        />
        {draftReplacementRows.length > 0 && (
          <Space size={6} wrap style={{ marginTop: 12, display: "flex" }}>
            {draftReplacementRows.map((candidate) => (
              <Tag key={candidate.id}>{candidate.earTag}</Tag>
            ))}
          </Space>
        )}
      </Modal>

      <Modal
        title="手动指定淘汰母猪"
        open={modalOpen}
        width={920}
        centered
        onCancel={() => setModalOpen(false)}
        footer={
          <div className="culling-modal-footer">
            <span className="culling-modal-footer-note">
              {draftCullingIds.length === 0
                ? "暂无手动指定，淘汰名单将由系统根据目标自动推荐。"
                : `${draftCullingIds.length} 头手动指定母猪将计入本次软性淘汰目标。`}
            </span>
            <Button
              type="primary"
              className="culling-done-button"
              onClick={() => {
                setSelectedCullingIds(draftCullingIds);
                setModalOpen(false);
              }}
            >
              完成
            </Button>
          </div>
        }
      >
        <div className="culling-modal-copy">
          选择需要标记淘汰的母猪，这些选择会优先于系统自动推荐。
        </div>
        <Alert
          className="culling-inline-alert"
          type="warning"
          showIcon={false}
          message="手动指定的母猪将被纳入淘汰名单；未手动选择的母猪仍可能根据淘汰目标被系统推荐。"
          style={{ marginBottom: 16 }}
        />
        <Table
          className="culling-modal-table"
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={batchCullingSows}
          rowSelection={{
            columnTitle: "淘汰",
            selectedRowKeys: draftCullingIds,
            onChange: (keys) => setDraftCullingIds(keys as string[])
          }}
          columns={columns}
          scroll={{ x: 900 }}
        />
        <Button
          type="link"
          className="culling-modal-add"
          icon={<PlusOutlined />}
          onClick={() => setShowEarTagAdd((prev) => !prev)}
        >
          添加母猪到名单
        </Button>
        {showEarTagAdd && (
          <Input.Search
            value={earTagQuery}
            onChange={(event) => setEarTagQuery(event.target.value)}
            onSearch={addSowByEarTag}
            placeholder="输入母猪耳标，例如 S-1042"
            enterButton="添加"
            style={{ marginTop: 10 }}
          />
        )}
        {draftRows.length > 0 && (
          <Space size={6} wrap style={{ marginTop: 10, display: "flex" }}>
            {draftRows.map((sow) => (
              <Tag key={sow.id}>{sow.sowTag}</Tag>
            ))}
          </Space>
        )}
      </Modal>
    </div>
  );
}
