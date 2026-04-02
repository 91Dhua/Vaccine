import { Button, Card, Input, Select, Steps, Table, Tag, Typography } from "antd";
import { useMemo, useState } from "react";

const { Title, Text } = Typography;

type PigRow = {
  id: string;
  pigId: string;
  stall: string;
  zone: string;
  unit: string;
  status: string;
  currentTask?: string;
};

const mockPigs: PigRow[] = Array.from({ length: 14 }).map((_, idx) => ({
  id: `pig-${1000 + idx}`,
  pigId: `${100000 + idx}`,
  stall: ["A1", "A2", "B1", "B2", "B3"][idx % 5],
  zone: ["A 区", "B 区"][idx % 2],
  unit: ["Unit-01", "Unit-02", "Unit-03"][idx % 3],
  status: ["正常", "待观察"][idx % 2],
  currentTask: idx % 4 === 0 ? "26F001" : "-"
}));

const zoneOptions = ["A 区", "B 区", "C 区"].map((v) => ({ label: v, value: v }));
const unitOptions = ["Unit-01", "Unit-02", "Unit-03"].map((v) => ({
  label: v,
  value: v
}));

interface Props {
  selectedPigs: string[];
  onSelectionChange: (ids: string[]) => void;
  onCreateTask: () => void;
  onBack: () => void;
}

export function VaccineTaskSelectPage({
  selectedPigs,
  onSelectionChange,
  onCreateTask,
  onBack
}: Props) {
  const [pigIdQuery, setPigIdQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string[]>([]);
  const [unitFilter, setUnitFilter] = useState<string[]>([]);

  const filteredPigs = useMemo(() => {
    const q = pigIdQuery.trim();
    return mockPigs.filter((p) => {
      const matchId = !q || String(p.pigId).includes(q);
      const matchZone = zoneFilter.length === 0 || zoneFilter.includes(p.zone);
      const matchUnit = unitFilter.length === 0 || unitFilter.includes(p.unit);
      return matchId && matchZone && matchUnit;
    });
  }, [pigIdQuery, zoneFilter, unitFilter]);

  const rowSelection = useMemo(
    () => ({
      selectedRowKeys: selectedPigs,
      onChange: (keys: React.Key[]) => onSelectionChange(keys as string[])
    }),
    [selectedPigs, onSelectionChange]
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            选择接种猪只
          </Title>
          <Text type="secondary">筛选并选择猪只，下发一次性接种任务</Text>
        </div>
        <div>
          <Button style={{ marginRight: 12 }} onClick={onBack}>
            返回
          </Button>
          <Button type="primary" onClick={onCreateTask} disabled={selectedPigs.length === 0}>
            下一步
          </Button>
        </div>
      </div>

      <Steps
        current={0}
        items={[{ title: "选择猪只" }, { title: "选择疫苗" }, { title: "确认接种" }]}
        style={{ marginBottom: 16 }}
      />

      <Card className="section-card">
        <div className="filter-bar">
          <Input.Search
            value={pigIdQuery}
            onChange={(e) => setPigIdQuery(e.target.value)}
            placeholder="搜索猪只ID"
            allowClear
            style={{ width: 220 }}
          />
          <Select
            mode="multiple"
            options={zoneOptions}
            placeholder="筛选 Zone"
            allowClear
            value={zoneFilter}
            onChange={(vals) => setZoneFilter(vals)}
            maxTagCount="responsive"
            style={{ width: 240 }}
          />
          <Select
            mode="multiple"
            options={unitOptions}
            placeholder="筛选 Unit"
            allowClear
            value={unitFilter}
            onChange={(vals) => setUnitFilter(vals)}
            maxTagCount="responsive"
            style={{ width: 240 }}
          />
          <Tag color="green">已选 {selectedPigs.length} 头</Tag>
          <Tag color="default">当前展示 {filteredPigs.length} 头</Tag>
        </div>

        <Table
          rowKey="id"
          dataSource={filteredPigs}
          rowSelection={rowSelection}
          pagination={false}
          columns={[
            { title: "猪只ID", dataIndex: "pigId" },
            { title: "栏位", dataIndex: "stall" },
            { title: "Zone", dataIndex: "zone" },
            { title: "Unit", dataIndex: "unit" },
            { title: "状态", dataIndex: "status" },
            { title: "当前任务", dataIndex: "currentTask" }
          ]}
        />
      </Card>
    </div>
  );
}
