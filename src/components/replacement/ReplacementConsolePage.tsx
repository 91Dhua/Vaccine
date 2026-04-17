import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Input,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Timeline,
  Typography,
  message
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  FieldTimeOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SendOutlined,
  WarningOutlined
} from "@ant-design/icons";
import {
  replacementBatches,
  replacementCandidates,
  replacementStatusColors,
  replacementStatusLabels
} from "./replacementData";
import type { EligibilityStatus, ReplacementCandidate, ReplacementPlanState } from "./types";
import "./ReplacementConsolePage.css";

const { Text, Title } = Typography;

const eligibilityLabel: Record<EligibilityStatus, string> = {
  ELIGIBLE: "可补入",
  WARNING: "需复核",
  BLOCKED: "不可选"
};

const eligibilityColor: Record<EligibilityStatus, string> = {
  ELIGIBLE: "success",
  WARNING: "warning",
  BLOCKED: "error"
};

const sourceLabels = {
  internal: "场内后备",
  purchased: "外购后备",
  quarantine: "隔离后备"
} as const;

function formatCount(value: number) {
  return `${value} 头`;
}

function buildPlanId(batchId: string) {
  return `RP-${batchId.replace("BATCH-", "").split("-").join("")}`;
}

export function ReplacementConsolePage() {
  const [activeBatchId, setActiveBatchId] = useState(replacementBatches[0].id);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(["gilt-2108", "gilt-2116"]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | ReplacementCandidate["source"]>("ALL");
  const [mobileRequired, setMobileRequired] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [planState, setPlanState] = useState<ReplacementPlanState>({
    status: "DRAFT",
    selectedCandidateIds: ["gilt-2108", "gilt-2116"]
  });

  const activeBatch = replacementBatches.find((batch) => batch.id === activeBatchId) || replacementBatches[0];

  const continuingSows = Math.max(
    0,
    activeBatch.currentSowCount -
      activeBatch.confirmedCulling -
      activeBatch.confirmedRemoved -
      activeBatch.deceased -
      activeBatch.otherExcluded
  );

  const selectedCandidates = replacementCandidates.filter((candidate) =>
    selectedCandidateIds.includes(candidate.id)
  );
  const selectableSelectedCount = selectedCandidates.filter((candidate) => candidate.eligibility !== "BLOCKED").length;
  const replacementNeeded = Math.max(0, activeBatch.targetSowCount - continuingSows - selectableSelectedCount);
  const originalGap = Math.max(0, activeBatch.targetSowCount - continuingSows);
  const selectedOverNeed = Math.max(0, selectableSelectedCount - originalGap);
  const capacityGap = Math.max(0, selectableSelectedCount - activeBatch.freeSlots);
  const progressPercent = originalGap === 0 ? 100 : Math.min(100, Math.round((selectableSelectedCount / originalGap) * 100));

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return replacementCandidates.filter((candidate) => {
      const hitQuery =
        !normalizedQuery ||
        candidate.earTag.toLowerCase().includes(normalizedQuery) ||
        candidate.location.toLowerCase().includes(normalizedQuery);
      const hitSource = sourceFilter === "ALL" || candidate.source === sourceFilter;
      return hitQuery && hitSource;
    });
  }, [query, sourceFilter]);

  const recommendedCount = replacementCandidates.filter(
    (candidate) => candidate.recommended && candidate.eligibility !== "BLOCKED"
  ).length;
  const blockedCount = replacementCandidates.filter((candidate) => candidate.eligibility === "BLOCKED").length;

  const syncPlanSelection = (ids: string[]) => {
    setSelectedCandidateIds(ids);
    setPlanState((prev) => ({ ...prev, selectedCandidateIds: ids }));
  };

  const addRecommended = () => {
    const nextIds = replacementCandidates
      .filter((candidate) => candidate.recommended && candidate.eligibility !== "BLOCKED")
      .slice(0, Math.max(originalGap, 1))
      .map((candidate) => candidate.id);
    syncPlanSelection([...new Set([...selectedCandidateIds, ...nextIds])]);
    message.success("已按系统建议加入候选补入名单。推荐只是辅助，最终仍由管理者确认。");
  };

  const removeCandidate = (candidateId: string) => {
    syncPlanSelection(selectedCandidateIds.filter((id) => id !== candidateId));
  };

  const generateMobileTask = () => {
    const taskId = `MR-${Date.now().toString().slice(-6)}`;
    setPlanState({
      status: "PENDING_FIELD_VERIFICATION",
      selectedCandidateIds,
      mobileTaskId: taskId
    });
    setPreviewOpen(false);
    message.success(`已生成 Mobile 现场复核任务 ${taskId}`);
  };

  const confirmReplacement = () => {
    const transferTaskId = capacityGap > 0 ? undefined : `TR-${Date.now().toString().slice(-6)}`;
    setPlanState({
      status: capacityGap > 0 ? "PENDING_TRANSFER" : "ACTIVE_IN_BATCH",
      selectedCandidateIds,
      mobileTaskId: planState.mobileTaskId,
      transferTaskId,
      confirmedAt: "2026-04-16 10:30"
    });
    setConfirmOpen(false);
    message.success(
      capacityGap > 0
        ? `已确认补入名单，但目标栏位还缺 ${capacityGap} 个空位，转入任务暂缓。`
        : "已确认补入并生成转入/批次加入记录。"
    );
  };

  const candidateColumns: ColumnsType<ReplacementCandidate> = [
    {
      title: "耳标号",
      dataIndex: "earTag",
      width: 150,
      render: (_, candidate) => (
        <Space direction="vertical" size={2}>
          <Space size={6}>
            <Text strong>{candidate.earTag}</Text>
            {candidate.recommended && candidate.eligibility !== "BLOCKED" ? <Tag color="green">建议补入</Tag> : null}
          </Space>
          <Text type="secondary" className="replacement-small-text">
            {sourceLabels[candidate.source]} · {candidate.location}
          </Text>
        </Space>
      )
    },
    {
      title: "生产条件",
      width: 220,
      render: (_, candidate) => (
        <Space direction="vertical" size={2}>
          <Text>{candidate.ageDays} 日龄 · {candidate.weightKg} kg · BCS {candidate.bodyCondition}</Text>
          <Text type="secondary" className="replacement-small-text">
            {candidate.estrusStatus}
          </Text>
        </Space>
      )
    },
    {
      title: "健康/免疫",
      width: 190,
      render: (_, candidate) => (
        <Space direction="vertical" size={2}>
          <Text>{candidate.healthStatus}</Text>
          <Text type="secondary" className="replacement-small-text">
            {candidate.vaccinationStatus}
          </Text>
        </Space>
      )
    },
    {
      title: "适配评分",
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
      render: (eligibility: EligibilityStatus, candidate) => (
        <Space direction="vertical" size={4}>
          <Tag color={eligibilityColor[eligibility]}>{eligibilityLabel[eligibility]}</Tag>
          {candidate.blockers.map((blocker) => (
            <Tag key={blocker} color="red">
              {blocker}
            </Tag>
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
            <Tag key={reason} className="replacement-reason-tag">
              {reason}
            </Tag>
          ))}
        </Space>
      )
    }
  ];

  const selectedColumns: ColumnsType<ReplacementCandidate> = [
    {
      title: "补入母猪",
      dataIndex: "earTag",
      render: (_, candidate) => (
        <Space direction="vertical" size={2}>
          <Space size={6}>
            <Text strong>{candidate.earTag}</Text>
            <Tag color={eligibilityColor[candidate.eligibility]}>{eligibilityLabel[candidate.eligibility]}</Tag>
          </Space>
          <Text type="secondary" className="replacement-small-text">
            {candidate.location} · {candidate.score} 分
          </Text>
        </Space>
      )
    },
    {
      title: "现场需要确认",
      render: (_, candidate) => (
        <Space size={[4, 4]} wrap>
          <Tag>身份/RFID</Tag>
          <Tag>当前位置</Tag>
          <Tag>{candidate.eligibility === "WARNING" ? "阻断项复核" : "体况确认"}</Tag>
        </Space>
      )
    },
    {
      title: "操作",
      width: 90,
      render: (_, candidate) => (
        <Button type="link" danger onClick={() => removeCandidate(candidate.id)}>
          移除
        </Button>
      )
    }
  ];

  return (
    <div className="replacement-page">
      <div className="replacement-hero">
        <div>
          <Tag color={replacementStatusColors[planState.status]}>{replacementStatusLabels[planState.status]}</Tag>
          <Title level={3}>后备母猪补入计划</Title>
          <Text type="secondary">
            根据淘汰/移出后的批次缺口，从已符合生产条件的后备母猪中选择补入对象，维持批次和种群稳定。
          </Text>
        </div>
        <Space>
          <Button onClick={addRecommended} icon={<SafetyCertificateOutlined />}>
            一键加入建议补入
          </Button>
          <Button type="primary" icon={<SendOutlined />} onClick={() => setPreviewOpen(true)}>
            生成现场复核任务
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card className="replacement-card" title="批次缺口与补入目标">
            <div className="replacement-toolbar">
              <Select
                value={activeBatchId}
                onChange={(nextBatchId) => {
                  setActiveBatchId(nextBatchId);
                  syncPlanSelection([]);
                  setPlanState({ status: "DRAFT", selectedCandidateIds: [] });
                }}
                options={replacementBatches.map((batch) => ({ value: batch.id, label: batch.name }))}
                className="replacement-batch-select"
              />
              <Space>
                <Text type="secondary">Mobile 复核</Text>
                <Switch checked={mobileRequired} onChange={setMobileRequired} />
              </Space>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={12} md={6}>
                <Statistic title="目标批次数" value={activeBatch.targetSowCount} suffix="头" />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title="预计留批母猪" value={continuingSows} suffix="头" />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title="原始补入缺口" value={originalGap} suffix="头" />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title="仍需补入" value={replacementNeeded} suffix="头" valueStyle={{ color: replacementNeeded > 0 ? "#dc2626" : "#16a34a" }} />
              </Col>
            </Row>

            <div className="replacement-progress-block">
              <div className="replacement-progress-head">
                <Text strong>补入完成度</Text>
                <Text type="secondary">
                  已选 {selectableSelectedCount} / 建议 {originalGap} 头
                </Text>
              </div>
              <Progress percent={progressPercent} strokeColor="#16a34a" />
            </div>

            <div className="replacement-alert-stack">
              {originalGap > 0 ? (
                <Alert
                  showIcon
                  type="warning"
                  message={`该批次因淘汰/移出/死亡预计缺 ${originalGap} 头生产母猪，建议从符合条件的后备母猪中补入。`}
                />
              ) : (
                <Alert showIcon type="success" message="当前批次暂无补入压力，管理者可自由指定是否补入。" />
              )}
              {capacityGap > 0 ? (
                <Alert
                  showIcon
                  type="error"
                  message={`目标栏位 ${activeBatch.targetUnit} 当前只有 ${activeBatch.freeSlots} 个空位，按已选名单转入会缺 ${capacityGap} 个栏位。`}
                  description="可以先确认补入名单，但转入/加入批次动作需要等待栏位释放或调整目标栏位。"
                />
              ) : null}
              {selectedOverNeed > 0 ? (
                <Alert
                  showIcon
                  type="info"
                  message={`已选数量超过当前缺口 ${selectedOverNeed} 头。系统允许软目标超选，但最终转入仍受批次策略和栏位容量限制。`}
                />
              ) : null}
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card className="replacement-card" title="计划状态">
            <Timeline
              items={[
                {
                  color: "green",
                  dot: <NodeIndexOutlined />,
                  children: (
                    <div>
                      <Text strong>{buildPlanId(activeBatch.id)}</Text>
                      <div className="replacement-small-text">目标批次：{activeBatch.name}</div>
                    </div>
                  )
                },
                {
                  color: planState.mobileTaskId ? "green" : "gray",
                  dot: <FieldTimeOutlined />,
                  children: (
                    <div>
                      <Text strong>{planState.mobileTaskId || "现场复核任务未生成"}</Text>
                      <div className="replacement-small-text">
                        {mobileRequired ? "下发给 Mobile 核对身份、位置、体况" : "当前配置允许 Console 直接确认"}
                      </div>
                    </div>
                  )
                },
                {
                  color: planState.status === "ACTIVE_IN_BATCH" ? "green" : "gray",
                  dot: <CheckCircleOutlined />,
                  children: (
                    <div>
                      <Text strong>{planState.transferTaskId || "等待确认补入"}</Text>
                      <div className="replacement-small-text">
                        {planState.confirmedAt || "确认后 Breeder female 将加入批次成为 Production Sow"}
                      </div>
                    </div>
                  )
                }
              ]}
            />
            <Divider />
            <Space direction="vertical" size={8} className="replacement-full-width">
              <Text type="secondary">硬校验</Text>
              <Tag color={blockedCount > 0 ? "red" : "green"}>不可选候选 {blockedCount} 头</Tag>
              <Tag color={capacityGap > 0 ? "red" : "green"}>目标栏位空余 {activeBatch.freeSlots} 个</Tag>
              <Tag color="blue">系统建议补入 {recommendedCount} 头</Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="replacement-main-grid">
        <Col xs={24} xl={15}>
          <Card
            className="replacement-card"
            title="可补入后备母猪池"
            extra={<Text type="secondary">只允许选择已有 Breeder 雌性且满足生产条件的猪只</Text>}
          >
            <div className="replacement-toolbar">
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="搜索耳标号 / 位置"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="replacement-search"
              />
              <Select
                value={sourceFilter}
                onChange={setSourceFilter}
                options={[
                  { value: "ALL", label: "全部来源" },
                  { value: "internal", label: "场内后备" },
                  { value: "quarantine", label: "隔离后备" },
                  { value: "purchased", label: "外购后备" }
                ]}
                className="replacement-source-select"
              />
            </div>
            <Table
              rowKey="id"
              size="middle"
              columns={candidateColumns}
              dataSource={filteredCandidates}
              pagination={{ pageSize: 6 }}
              rowSelection={{
                selectedRowKeys: selectedCandidateIds,
                onChange: (keys) => syncPlanSelection(keys.map(String)),
                getCheckboxProps: (candidate) => ({ disabled: candidate.eligibility === "BLOCKED" })
              }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card
            className="replacement-card replacement-selected-card"
            title="已选补入名单"
            extra={<Tag color={replacementNeeded > 0 ? "warning" : "success"}>缺口 {replacementNeeded}</Tag>}
          >
            {selectedCandidates.length ? (
              <Table
                rowKey="id"
                size="small"
                columns={selectedColumns}
                dataSource={selectedCandidates}
                pagination={false}
              />
            ) : (
              <Empty description="还没有选择补入母猪" />
            )}
            <Divider />
            <Space className="replacement-action-row" wrap>
              <Button icon={<PlusOutlined />} onClick={addRecommended}>
                加入推荐
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                disabled={selectedCandidates.length === 0}
                onClick={() => setConfirmOpen(true)}
              >
                Console 确认补入
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        title="生成 Mobile 现场复核任务"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        onOk={generateMobileTask}
        okText="生成任务"
        cancelText="取消"
      >
        <Alert
          showIcon
          type="info"
          message="Mobile 任务用于现场核对，不负责最终批次加入决策。"
          description="现场人员需要确认耳标/RFID、当前位置、体况健康、是否存在阻断项。结果回到 Console 后由管理者最终确认。"
        />
        <div className="replacement-modal-summary">
          <Text strong>将下发 {selectedCandidates.length} 头后备母猪：</Text>
          <Space size={[6, 6]} wrap>
            {selectedCandidates.map((candidate) => (
              <Tag key={candidate.id}>{candidate.earTag}</Tag>
            ))}
          </Space>
        </div>
      </Modal>

      <Modal
        title="确认补入批次"
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={confirmReplacement}
        okText="确认补入"
        cancelText="再检查一下"
      >
        <Space direction="vertical" size={12} className="replacement-full-width">
          <Alert
            showIcon
            type={capacityGap > 0 ? "warning" : "success"}
            icon={capacityGap > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
            message={
              capacityGap > 0
                ? `可以确认名单，但目标栏位还缺 ${capacityGap} 个空位。`
                : "栏位容量满足，确认后可生成转入并加入生产批次。"
            }
          />
          <Text>
            确认后，这些后备母猪会进入目标批次补入流程；实际类别将在加入批次后从 Breeder female 更新为 Production Sow。
          </Text>
          <Space size={[6, 6]} wrap>
            {selectedCandidates.map((candidate) => (
              <Tag key={candidate.id} color={candidate.recommended ? "green" : undefined}>
                {candidate.earTag}{candidate.recommended ? " · 建议补入" : ""}
              </Tag>
            ))}
          </Space>
        </Space>
      </Modal>
    </div>
  );
}
