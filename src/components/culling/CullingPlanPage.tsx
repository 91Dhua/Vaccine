import { useMemo, useState } from "react";
import {
  Button,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Switch,
  Table,
  Tag,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
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

export function CullingPlanPage() {
  const [planEnabled, setPlanEnabled] = useState(true);
  const [replacementEnabled, setReplacementEnabled] = useState(false);
  const [targetMode, setTargetMode] = useState<CullingTargetMode>("percentage");
  const [targetValue, setTargetValue] = useState(10);
  const [retainTargetCount, setRetainTargetCount] = useState(DEFAULT_RETAIN_TARGET);
  const [modalOpen, setModalOpen] = useState(false);
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [replacementQuery, setReplacementQuery] = useState("");

  const plannedTarget = useMemo(
    () => calculateTarget(targetMode, Number(targetValue || 0), BATCH_SOW_COUNT),
    [targetMode, targetValue]
  );

  const filteredReplacementCandidates = useMemo(() => {
    const normalized = replacementQuery.trim().toLowerCase();
    return batchCullingSows.filter((sow) =>
      !normalized ||
      sow.sowTag.toLowerCase().includes(normalized) ||
      sow.pen.toLowerCase().includes(normalized)
    );
  }, [replacementQuery]);

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
                  设置本批次的淘汰目标，并查看本批次生产母猪列表。
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
                  设置本批次淘汰目标，实际淘汰对象由 mobile 断奶检查发起后在 console 确认。
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
                  <div className="culling-manual-title">本批次母猪列表</div>
                </div>
              </div>

              <Button
                className="culling-manage-button"
                icon={<EditOutlined />}
                onClick={() => {
                  setModalOpen(true);
                }}
              >
                查看母猪列表
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
                  <div className="culling-manual-title">本批次母猪列表</div>
                  <div className="culling-manual-copy">
                    查看本批次生产母猪，用于评估留种目标与后备补充安排。
                  </div>
                </div>
              </div>

              <Button
                className="culling-manage-button"
                icon={<EditOutlined />}
                onClick={() => {
                  setReplacementQuery("");
                  setReplacementModalOpen(true);
                }}
              >
                查看母猪列表
              </Button>
            </div>
          )}
        </div>
      </section>

      <Modal
        title="查看母猪列表"
        open={replacementModalOpen}
        width={920}
        centered
        onCancel={() => setReplacementModalOpen(false)}
        footer={
          <div className="culling-modal-footer">
            <span className="culling-modal-footer-note">
              当前批次共 {BATCH_SOW_COUNT} 头生产母猪。
            </span>
            <Button
              type="primary"
              className="culling-done-button"
              onClick={() => setReplacementModalOpen(false)}
            >
              关闭
            </Button>
          </div>
        }
      >
        <div className="culling-modal-copy">
          当前列表展示本批次内全部生产母猪，可用于核对耳标、栏位和生产表现，帮助评估本批次留种目标是否合理。
        </div>
        <div className="culling-replacement-toolbar">
          <Input
            allowClear
            placeholder="搜索耳标号 / 栏位"
            value={replacementQuery}
            onChange={(event) => setReplacementQuery(event.target.value)}
            style={{ width: 220 }}
          />
        </div>
        <Table
          className="culling-replacement-table"
          rowKey="id"
          size="small"
          dataSource={filteredReplacementCandidates}
          columns={replacementColumns}
          pagination={{ pageSize: 5 }}
        />
      </Modal>

      <Modal
        title="查看母猪列表"
        open={modalOpen}
        width={920}
        centered
        onCancel={() => setModalOpen(false)}
        footer={
          <div className="culling-modal-footer">
            <span className="culling-modal-footer-note">
              当前批次共 {BATCH_SOW_COUNT} 头生产母猪。
            </span>
            <Button
              type="primary"
              className="culling-done-button"
              onClick={() => setModalOpen(false)}
            >
              关闭
            </Button>
          </div>
        }
      >
        <div className="culling-modal-copy">
          当前列表展示本批次内全部生产母猪，可用于核对耳标、栏位和生产表现，帮助评估本批次淘汰目标是否合理。
        </div>
        <Table
          className="culling-modal-table"
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={batchCullingSows}
          columns={columns}
          scroll={{ x: 900 }}
        />
      </Modal>
    </div>
  );
}
