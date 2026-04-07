import { PigType, Vaccine } from "./types";

export const pigTypeOptions = [
  { label: "生产母猪", value: PigType.Sow },
  { label: "生产公猪", value: PigType.Boar },
  { label: "仔猪", value: PigType.Piglet },
  { label: "育肥猪", value: PigType.Fattening },
  { label: "后备母猪", value: PigType.Gilt }
];

export const vaccines: Vaccine[] = [
  {
    id: "VAC-001",
    name: "非瘟灭活疫苗",
    brand: "佰特生物",
    defaultDosage: 2,
    validAgeMin: 45,
    validAgeMax: 90,
    currentStock: 420
  },
  {
    id: "VAC-002",
    name: "蓝耳二联疫苗",
    brand: "牧安",
    defaultDosage: 1,
    validAgeMin: 30,
    validAgeMax: 70,
    currentStock: 180
  },
  {
    id: "VAC-003",
    name: "伪狂犬疫苗",
    brand: "百利",
    defaultDosage: 1.5,
    validAgeMin: 60,
    validAgeMax: 120,
    currentStock: 95
  }
];

export const zoneOptions = [
  {
    value: "Zone-A",
    label: "A 区",
    children: [
      { value: "Unit-01", label: "栋舍 01" },
      { value: "Unit-02", label: "栋舍 02" }
    ]
  },
  {
    value: "Zone-B",
    label: "B 区",
    children: [
      { value: "Unit-03", label: "栋舍 03" },
      { value: "Unit-04", label: "栋舍 04" }
    ]
  }
];

export const productionLines = [
  { label: "一线-保育", value: "Line-A" },
  { label: "二线-育肥", value: "Line-B" },
  { label: "三线-繁育", value: "Line-C" }
];

export const baselineEvents = [
  { label: "出生后", value: "BIRTH" },
  { label: "配种后", value: "MATING" },
  { label: "转舍后", value: "TRANSFER" }
];

export type VaccineCategory = {
  id: string;
  vaccineId: string;
  nameCn: string;
  nameEn: string;
  /** 推荐参考类型：日龄或生产状态，用于下发时间提示 */
  referenceType?: "日龄" | "生产状态";
  /** 生产状态参考时的类型 */
  statusType?: string;
  /** 日龄或状态参考的建议区间 */
  minValue?: number;
  maxValue?: number;
  brands: {
    id: string;
    brandNameCn: string;
    brandNameEn: string;
    /** 剂型 */
    dosageForm?: "活疫苗（冻干苗）" | "油佐剂灭活疫苗" | "水佐剂灭活疫苗";
    /** 单次使用剂量，描述型字段，例如“2 ml/头” */
    standardDosage?: string;
    /** 免疫有效期，描述型字段，例如“6 个月” */
    durationOfImmunity?: string;
    /** 休药期（天） */
    withdrawalPeriodDays?: number;
    /** 接种途径，可多选 */
    administrationRoutes?: ("IM" | "SC" | "滴鼻" | "饮水" | "喷雾")[];
    /** 疫苗类型 */
    targetPathogen?: "病毒性" | "细菌性" | "寄生虫";
  }[];
};

export const vaccineCatalog: VaccineCategory[] = [
  {
    id: "vac-001",
    vaccineId: "VAC-001",
    nameCn: "非瘟灭活疫苗",
    nameEn: "ASF Inactivated Vaccine",
    referenceType: "日龄",
    minValue: 45,
    maxValue: 90,
    brands: [
      {
        id: "brand-001",
        brandNameCn: "佰特生物",
        brandNameEn: "Biotech",
        dosageForm: "油佐剂灭活疫苗",
        standardDosage: "2 ml/头",
        durationOfImmunity: "6 个月",
        withdrawalPeriodDays: 35,
        administrationRoutes: ["IM"],
        targetPathogen: "病毒性"
      },
      {
        id: "brand-002",
        brandNameCn: "牧安",
        brandNameEn: "MuAn",
        dosageForm: "油佐剂灭活疫苗",
        standardDosage: "2 ml/头",
        durationOfImmunity: "4 个月",
        withdrawalPeriodDays: 28,
        administrationRoutes: ["IM"],
        targetPathogen: "病毒性"
      }
    ]
  },
  {
    id: "vac-002",
    vaccineId: "VAC-002",
    nameCn: "蓝耳二联疫苗",
    nameEn: "PRRS Bivalent Vaccine",
    referenceType: "生产状态",
    statusType: "妊娠期",
    minValue: 15,
    maxValue: 30,
    brands: [
      {
        id: "brand-003",
        brandNameCn: "百利",
        brandNameEn: "Baili",
        dosageForm: "活疫苗（冻干苗）",
        standardDosage: "1 ml/头",
        durationOfImmunity: "3 个月",
        withdrawalPeriodDays: 21,
        administrationRoutes: ["IM", "SC"],
        targetPathogen: "病毒性"
      }
    ]
  }
];
