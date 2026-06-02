import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Tabs } from "antd";
import { CullingTaskDetailPage } from "./CullingTaskDetailPage";
import "./CullingOutcomeDetailPage.css";

export function CullingOutcomeDetailPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="culling-outcome-page">
      <div className="culling-outcome-header">
        <div className="culling-outcome-title-row">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className="culling-outcome-back"
            onClick={onBack}
          />
          <h1 className="culling-outcome-title">淘汰&留种详情</h1>
        </div>
      </div>

      <Tabs
        className="culling-outcome-tabs"
        items={[
          {
            key: "culling",
            label: "淘汰详情",
            children: (
              <CullingTaskDetailPage
                embedded
                initialSubPage="culling"
                lockedSubPage
                onBack={onBack}
              />
            )
          },
          {
            key: "retained",
            label: "留种详情",
            children: (
              <CullingTaskDetailPage
                embedded
                initialSubPage="retained"
                lockedSubPage
                onBack={onBack}
              />
            )
          }
        ]}
      />
    </div>
  );
}
