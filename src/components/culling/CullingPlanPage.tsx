import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Input,
  InputNumber,
  Modal,
  Segmented,
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
import { batchCullingSows } from "./cullingData";
import type { CullingSowRow, CullingTargetMode } from "./types";
import "./CullingPlanPage.css";

const { Text } = Typography;

const BATCH_SOW_COUNT: number = 10;
const BATCH_NAME = "Batch 26F001";
const PRODUCTION_LINE = "Line A · Breeding Herd";
const WEANING_BATCH_NAME = "断奶批次 26F001-W";
const TOTAL_GILT_PIGLETS = 18;
const DEFAULT_RETAIN_TARGET = 6;

function calculateTarget(mode: CullingTargetMode, value: number, baseCount: number) {
  if (mode === "percentage") {
    return Math.ceil((baseCount * value) / 100);
  }
  return Math.min(Math.max(0, Math.floor(value)), baseCount);
}

function formatTargetUnit(mode: CullingTargetMode, value: number, target: number, baseCount: number) {
  if (mode === "percentage") {
    return `%（约 ${target} 头）`;
  }
  const ratio = baseCount === 0 ? 0 : Math.round((value / baseCount) * 100);
  return `头 · ${ratio}%`;
}

export function CullingPlanPage({ onOpenTaskDetail }: { onOpenTaskDetail?: () => void } = {}) {
  const [planEnabled, setPlanEnabled] = useState(true);
  const [replacementEnabled, setReplacementEnabled] = useState(false);
  const [targetMode, setTargetMode] = useState<CullingTargetMode>("percentage");
  const [targetValue, setTargetValue] = useState(10);
  const [retainTargetCount, setRetainTargetCount] = useState(DEFAULT_RETAIN_TARGET);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCullingIds, setSelectedCullingIds] = useState<string[]>([]);
  const [draftCullingIds, setDraftCullingIds] = useState<string[]>([]);
  const [showEarTagAdd, setShowEarTagAdd] = useState(false);
  const [earTagQuery, setEarTagQuery] = useState("");
  const [selectedReplacementIds, setSelectedReplacementIds] = useState<string[]>([]);
  const [draftReplacementIds, setDraftReplacementIds] = useState<string[]>([]);
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [replacementQuery, setReplacementQuery] = useState("");

  const plannedTarget = useMemo(
    () => calculateTarget(targetMode, Number(targetValue || 0), BATCH_SOW_COUNT),
    [targetMode, targetValue]
  );


  const draftRows = useMemo(
    () => batchCullingSows.filter((sow) => draftCullingIds.includes(sow.id)),
    [draftCullingIds]
  );

  const remainingGap = Math.max(0, plannedTarget - selectedCullingIds.length);
  const overTarget = Math.max(0, selectedCullingIds.length - plannedTarget);

  const expectedCullingCount = planEnabled ? Math.max(plannedTarget, selectedCullingIds.length) : 0;
  const draftReplacementRows = batchCullingSows.filter((sow) =>
    draftReplacementIds.includes(sow.id)
  );
  const draftReplacementCount = draftReplacementRows.length;

  const filteredReplacementCandidates = useMemo(() => {
    const normalized = replacementQuery.trim().toLowerCase();
    return batchCullingSows.filter((sow) =>
      !normalized ||
      sow.sowTag.toLowerCase().includes(normalized) ||
      sow.pen.toLowerCase().includes(normalized)
    );
  }, [replacementQuery]);

  const addRecommendedReplacements = () => {
    const recommendedIds = [...batchCullingSows]
      .sort((a, b) => {
        if (a.averageLiveBorn !== b.averageLiveBorn) return b.averageLiveBorn - a.averageLiveBorn;
        if (a.averageLitterSize !== b.averageLitterSize) return b.averageLitterSize - a.averageLitterSize;
        return a.parity - b.parity;
      })
      .slice(0, Math.max(retainTargetCount, 1))
      .map((sow) => sow.id);
    setDraftReplacementIds((prev) => [...new Set([...prev, ...recommendedIds])]);
    message.success("已按系统规则加入留种关注母猪，最终仍由管理者确认。");
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
          <Text strong>{value}</Text>
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
      title: "窝均活仔",
      dataIndex: "averageLiveBorn",
      width: 96,
      align: "center",
      sorter: (a, b) => a.averageLiveBorn - b.averageLiveBorn,
      render: (value) => <span className={`culling-metric-cell ${value < 8.5 ? "is-risk" : ""}`}>{value} 头</span>
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
  ];

  const replacementColumns: ColumnsType<CullingSowRow> = columns;

  return (
    <div className="culling-page">
      <section className="culling-hero">
        <div>
          <div className="culling-eyebrow">Production Planning</div>
          <h1 className="culling-title">母猪淘汰&后备留种</h1>
          <div className="culling-subtitle">
            配置母猪淘汰软目标，并同步规划本批次的后备留种目标，圈定需要重点关注其后代的母猪。
          </div>
        </div>
        <div className="culling-hero-actions">
          <Tag color="processing">{BATCH_NAME}</Tag>
          <Tag>{PRODUCTION_LINE}</Tag>
          <Tag color="default">Soft Target</Tag>
        </div>
      </section>

      <section className="culling-board">
        <div className="culling-plan-card">
          <div className="culling-plan-card-header">
            <div className="culling-plan-heading">
              <StopOutlined className="culling-plan-icon" />
              <div>
                <div className="culling-plan-title">母猪淘汰计划</div>
                <div className="culling-plan-description">
                  设置本批次的淘汰目标，并手动标记需要淘汰的生产母猪。
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
                    {formatTargetUnit(targetMode, Number(targetValue || 0), plannedTarget, BATCH_SOW_COUNT)}
                  </span>
                </div>

                <div className="culling-manual-block">
                  <div className="culling-manual-title">指定淘汰母猪</div>
                </div>
              </div>

              <Button
                className={`culling-manage-button ${selectedCullingIds.length > 0 ? "is-selected" : ""}`}
                icon={<EditOutlined />}
                onClick={() => {
                  setDraftCullingIds(selectedCullingIds);
                  setShowEarTagAdd(false);
                  setEarTagQuery("");
                  setModalOpen(true);
                }}
              >
                {selectedCullingIds.length > 0 ? `已选 ${selectedCullingIds.length} 头` : "管理淘汰名单"}
              </Button>
            </div>
          )}
        </div>

        <div className="culling-plan-card">
          <div className="culling-plan-card-header">
            <div className="culling-plan-heading">
              <UserAddOutlined className="culling-plan-icon muted" />
              <div>
                <div className="culling-plan-title">后备留种计划</div>
                <div className="culling-plan-description">
                  为本批次设定后备补充目标，并优先关注哪些母猪的仔猪将用于留种。
                </div>
              </div>
            </div>
            <Switch checked={replacementEnabled} onChange={setReplacementEnabled} />
          </div>

          {replacementEnabled && (
            <div className="culling-plan-body culling-plan-body--replacement">
              <div>
                <div className="culling-target-title">留种目标</div>
                <div className="culling-target-copy">
                  设置本批次计划留作后备母猪的目标头数。
                </div>
                <div className="culling-target-control culling-target-control--replacement">
                  <InputNumber
                    min={0}
                    max={TOTAL_GILT_PIGLETS}
                    value={retainTargetCount}
                    onChange={(value) => setRetainTargetCount(Number(value || 0))}
                  />
                  <span className="culling-target-unit">头</span>
                </div>

                <div className="culling-manual-block">
                  <div className="culling-manual-title">指定留种母猪</div>
                  <div className="culling-manual-copy">
                    设定本批次计划留种的后备母猪数量，并圈定值得重点关注的母猪。后续涉及到留种操作的相关任务，饲养员可根据提示优先筛选这些母猪的后代。
                  </div>
                </div>
              </div>

              <Button
                className={`culling-manage-button ${selectedReplacementIds.length > 0 ? "is-selected" : ""}`}
                icon={<EditOutlined />}
                onClick={() => {
                  setDraftReplacementIds(selectedReplacementIds);
                  setReplacementQuery("");
                  setReplacementModalOpen(true);
                }}
              >
                {selectedReplacementIds.length > 0 ? `已选 ${selectedReplacementIds.length} 头` : "指定留种母猪"}
              </Button>
            </div>
          )}
        </div>
      </section>

      <Modal
        title="指定留种母猪"
        open={replacementModalOpen}
        width={920}
        centered
        onCancel={() => setReplacementModalOpen(false)}
        footer={
          <div className="culling-modal-footer">
            <span className="culling-modal-footer-note">
              已选 {draftReplacementCount} 头重点关注母猪。
            </span>
            <Button
              type="primary"
              className="culling-done-button"
              onClick={() => {
                setSelectedReplacementIds(draftReplacementIds);
                setReplacementModalOpen(false);
                message.success("留种关注母猪名单已保存到本批次后备留种计划。");
              }}
            >
              完成
            </Button>
          </div>
        }
      >
        <div className="culling-modal-copy">
          这里选择的是需要重点关注其后代的母猪，用于指导后续断奶阶段的现场留种判断；当前计划留种目标为 {retainTargetCount} 头，最终是否留种仍以实际断奶结果和仔猪状态为准。
        </div>
        <div className="culling-replacement-toolbar">
          <Space wrap>
            <Input
              allowClear
              placeholder="搜索耳标号 / 栏位"
              value={replacementQuery}
              onChange={(event) => setReplacementQuery(event.target.value)}
              style={{ width: 220 }}
            />
          </Space>
          <Button icon={<PlusOutlined />} onClick={addRecommendedReplacements}>
            加入建议关注名单
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
            columnTitle: "留种",
            selectedRowKeys: draftReplacementIds,
            onChange: (keys) => setDraftReplacementIds(keys.map(String))
          }}
        />
        {draftReplacementRows.length > 0 && (
          <Space size={6} wrap style={{ marginTop: 12, display: "flex" }}>
            {draftReplacementRows.map((sow) => (
              <Tag key={sow.id}>{sow.sowTag}</Tag>
            ))}
          </Space>
        )}
      </Modal>

      <Modal
        title="指定淘汰母猪"
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
          选择需要优先标记为淘汰建议的母猪，这些选择会优先于系统自动推荐。
        </div>
        <Alert
          className="culling-inline-alert"
          type="warning"
          showIcon={false}
          message="这里的名单用于形成 Console 端的淘汰建议；现场断奶检查和产后检查仍可继续补充新的淘汰建议。"
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
      <div className="culling-page-footer">
        <Button className="culling-detail-entry-button" type="primary" onClick={() => onOpenTaskDetail?.()}>
          任务详情
        </Button>
      </div>
    </div>
  );
}
