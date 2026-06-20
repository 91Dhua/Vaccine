import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { CullingTaskDetailPage } from "./CullingTaskDetailPage";
import "./CullingOutcomeDetailPage.css";

type OutcomeDetailType = "culling" | "retained";

export function CullingOutcomeDetailPage({
  detailType,
  onBack
}: {
  detailType: OutcomeDetailType;
  onBack: () => void;
}) {
  const title = detailType === "culling" ? "淘汰详情" : "留种详情";

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
          <h1 className="culling-outcome-title">{title}</h1>
        </div>
      </div>

      <CullingTaskDetailPage
        embedded
        initialSubPage={detailType}
        focusPendingCulling={detailType === "culling"}
        lockedSubPage
        onBack={onBack}
      />
    </div>
  );
}
