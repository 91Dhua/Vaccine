import { Button, Checkbox, Empty, Form, Input, Modal, Popover, Select, Tag, Tooltip, message } from "antd";
import { useMemo, useState } from "react";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  FilterOutlined,
  InfoCircleFilled,
  PlusOutlined,
  SearchOutlined,
  ShareAltOutlined,
  SwapOutlined
} from "@ant-design/icons";

const employeeTabs = [
  {
    key: "pending",
    label: "待注册",
    description: "管理员已添加员工并发送邀请，员工尚未完成验证和厂区绑定"
  },
  {
    key: "registered",
    label: "已注册",
    description: "员工已通过手机号/邮箱验证，并完成账号与当前厂区绑定"
  },
  {
    key: "expired",
    label: "已过期",
    description: "邀请 7 天内未完成注册/绑定"
  }
] as const;

type EmployeeTabKey = (typeof employeeTabs)[number]["key"];
type EmployeeStatus = "在厂" | "厂外/休假" | "解雇";
type EmployeeColumnKey = "name" | "contact" | "role" | "status" | "inviteSentAt" | "inviteExpiredAt" | "action";
type SortDirection = "asc" | "desc";

type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  role: string;
  inviteStatus: EmployeeTabKey;
  employeeStatus: EmployeeStatus;
  inviteSentAt?: string;
  inviteExpiredAt?: string;
};

type AddEmployeeFormValues = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  role: string;
};

const columns = [
  { key: "name", label: "姓名", sortable: true },
  { key: "contact", label: "联系方式", sortable: true },
  { key: "role", label: "岗位", filterable: true, sortable: true },
  { key: "status", label: "状态", filterable: true, sortable: true }
] as const;
const inviteSentAtColumn = { key: "inviteSentAt", label: "邀请发送时间", sortable: true } as const;
const inviteExpiredAtColumn = { key: "inviteExpiredAt", label: "过期时间", sortable: true } as const;
const inviteActionColumn = { key: "action", label: "操作" } as const;

const roleOptions = ["场长", "兽医", "饲养员", "生产主管", "访客接待"];
const employeeStatusOptions: EmployeeStatus[] = ["在厂", "厂外/休假", "解雇"];

const seedEmployees: EmployeeRow[] = [
  {
    id: "EMP-0001",
    firstName: "王",
    lastName: "敏",
    phone: "13800138001",
    email: "wangmin@sentri.cn",
    role: "兽医",
    inviteStatus: "pending",
    employeeStatus: "厂外/休假",
    inviteSentAt: "2026-05-28 09:20",
    inviteExpiredAt: "2026-06-04 09:20"
  },
  {
    id: "EMP-0002",
    firstName: "李",
    lastName: "刚",
    phone: "13800138002",
    role: "饲养员",
    inviteStatus: "pending",
    employeeStatus: "在厂",
    inviteSentAt: "2026-05-27 14:10",
    inviteExpiredAt: "2026-06-03 14:10"
  },
  {
    id: "EMP-0003",
    firstName: "赵",
    lastName: "磊",
    email: "zhaolei@sentri.cn",
    role: "生产主管",
    inviteStatus: "pending",
    employeeStatus: "解雇",
    inviteSentAt: "2026-05-26 16:35",
    inviteExpiredAt: "2026-06-02 16:35"
  },
  {
    id: "EMP-0004",
    firstName: "陈",
    lastName: "雨",
    phone: "13800138004",
    email: "chenyu@sentri.cn",
    role: "场长",
    inviteStatus: "registered",
    employeeStatus: "在厂"
  },
  {
    id: "EMP-0005",
    firstName: "周",
    lastName: "婷",
    phone: "13800138005",
    role: "访客接待",
    inviteStatus: "registered",
    employeeStatus: "厂外/休假"
  },
  {
    id: "EMP-0006",
    firstName: "刘",
    lastName: "婷",
    email: "liuting@sentri.cn",
    role: "饲养员",
    inviteStatus: "expired",
    employeeStatus: "厂外/休假",
    inviteSentAt: "2026-05-18 11:30",
    inviteExpiredAt: "2026-05-25 11:30"
  }
];

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function buildInviteTimes() {
  const sent = new Date();
  const expired = new Date(sent);
  expired.setDate(sent.getDate() + 7);
  return {
    inviteSentAt: formatDateTime(sent),
    inviteExpiredAt: formatDateTime(expired)
  };
}

function getEmployeeName(employee: EmployeeRow) {
  return `${employee.firstName}${employee.lastName}`;
}

function getEmployeeContact(employee: EmployeeRow) {
  return employee.phone || employee.email || "";
}

function getSortValue(employee: EmployeeRow, key: EmployeeColumnKey) {
  if (key === "name") return `${getEmployeeName(employee)}${employee.id}`;
  if (key === "contact") return getEmployeeContact(employee);
  if (key === "role") return employee.role;
  if (key === "inviteSentAt") return employee.inviteSentAt || "";
  if (key === "inviteExpiredAt") return employee.inviteExpiredAt || "";
  if (key === "action") return "";
  return employee.employeeStatus;
}

export function EmployeeManagementPage() {
  const [form] = Form.useForm<AddEmployeeFormValues>();
  const [activeTab, setActiveTab] = useState<EmployeeTabKey>("registered");
  const [employees, setEmployees] = useState<EmployeeRow[]>(seedEmployees);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortState, setSortState] = useState<{ key: EmployeeColumnKey; direction: SortDirection } | null>(null);
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<EmployeeStatus[]>([]);
  const activeTabConfig = employeeTabs.find((tab) => tab.key === activeTab) || employeeTabs[0];
  const currentColumns = useMemo(
    () =>
      activeTab === "registered"
        ? columns
        : [
            ...columns.filter((column) => column.key !== "status"),
            activeTab === "pending" ? inviteSentAtColumn : inviteExpiredAtColumn,
            inviteActionColumn
          ],
    [activeTab]
  );
  const visibleEmployees = employees
    .filter((employee) => employee.inviteStatus === activeTab)
    .filter((employee) => (roleFilters.length > 0 ? roleFilters.includes(employee.role) : true))
    .filter((employee) =>
      activeTab === "registered" && statusFilters.length > 0 ? statusFilters.includes(employee.employeeStatus) : true
    )
    .filter((employee) => {
      const keyword = searchKeyword.trim().toLowerCase();
      if (!keyword) return true;
      return [
        getEmployeeName(employee),
        employee.id,
        employee.phone,
        employee.email,
        employee.role,
        employee.employeeStatus,
        employee.inviteSentAt,
        employee.inviteExpiredAt
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    })
    .sort((a, b) => {
      if (!sortState) return 0;
      const result = getSortValue(a, sortState.key).localeCompare(getSortValue(b, sortState.key), "zh-Hans-CN", {
        numeric: true
      });
      return sortState.direction === "asc" ? result : -result;
    });

  const toggleSort = (key: EmployeeColumnKey) => {
    setSortState((current) => {
      if (!current || current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const handleTabChange = (key: EmployeeTabKey) => {
    setActiveTab(key);
    if (key !== "registered") {
      setStatusFilters([]);
      setSortState((current) => (current?.key === "status" ? null : current));
    }
  };

  const handleSendInvite = (employee: EmployeeRow) => {
    const nextInviteTimes = buildInviteTimes();
    setEmployees((prev) =>
      prev.map((item) =>
        item.id === employee.id
          ? {
              ...item,
              inviteStatus: "pending",
              ...nextInviteTimes
            }
          : item
      )
    );
    if (employee.inviteStatus === "expired") {
      message.success(`已重新向${getEmployeeName(employee)}发送注册链接。`);
      return;
    }
    message.success(`已再次向${getEmployeeName(employee)}发送注册链接。`);
  };

  const renderSortIcon = (key: EmployeeColumnKey) => {
    if (sortState?.key !== key) return <SwapOutlined rotate={90} />;
    return sortState.direction === "asc" ? <ArrowUpOutlined /> : <ArrowDownOutlined />;
  };

  const renderFilterContent = (key: EmployeeColumnKey) => {
    const isRole = key === "role";
    const values = isRole ? roleFilters : statusFilters;
    const options = isRole ? roleOptions : employeeStatusOptions;
    const onChange = (checkedValues: Array<string | number | boolean>) => {
      if (isRole) {
        setRoleFilters(checkedValues.map(String));
        return;
      }
      setStatusFilters(checkedValues.map(String) as EmployeeStatus[]);
    };

    return (
      <div className="employee-management-filter-popover">
        <Checkbox.Group value={values} onChange={onChange}>
          {options.map((option) => (
            <Checkbox key={option} value={option}>
              {option}
            </Checkbox>
          ))}
        </Checkbox.Group>
        <Button
          type="link"
          size="small"
          onClick={() => {
            if (isRole) {
              setRoleFilters([]);
              return;
            }
            setStatusFilters([]);
          }}
        >
          清除筛选
        </Button>
      </div>
    );
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    form.resetFields();
  };

  const handleAddEmployee = async () => {
    const values = await form.validateFields();
    const phone = values.phone?.trim();
    const email = values.email?.trim();

    if (!phone && !email) {
      form.setFields([
        { name: "phone", errors: ["请输入手机号或邮箱。"] },
        { name: "email", errors: ["请输入手机号或邮箱。"] }
      ]);
      return;
    }

    setEmployees((prev) => [
      {
        id: `EMP-${String(prev.length + 1).padStart(4, "0")}`,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        phone,
        email,
        role: values.role,
        inviteStatus: "pending",
        employeeStatus: "厂外/休假",
        ...buildInviteTimes()
      },
      ...prev
    ]);
    setActiveTab("pending");
    closeAddModal();
    message.success("员工已添加至待注册列表。");
  };

  return (
    <div className="employee-management-page">
      <header className="employee-management-header">
        <div>
          <h1>员工</h1>
          <div className="employee-management-breadcrumb">
            <span>首页</span>
            <span className="employee-management-breadcrumb__dot">•</span>
            <span>员工</span>
          </div>
        </div>
        <Button className="employee-management-link-button" icon={<ShareAltOutlined />}>
          员工入厂链接
        </Button>
      </header>

      <section className="employee-management-card">
        <div className="employee-management-tabs" role="tablist" aria-label="员工状态">
          {employeeTabs.map((tab) => (
            <button
              key={tab.key}
              className={`employee-management-tab${activeTab === tab.key ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => handleTabChange(tab.key)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="employee-management-toolbar">
          <Input
            className="employee-management-search"
            prefix={<SearchOutlined />}
            placeholder="搜索..."
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
          />
          <Button className="employee-management-add-button" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
            添加员工
          </Button>
        </div>
        <div className="employee-management-status-hint">
          <span>{activeTabConfig.label}</span>
          <p>{activeTabConfig.description}</p>
        </div>

        <div className="employee-management-table">
          <div
            className={`employee-management-table__head ${
              activeTab === "registered"
                ? "employee-management-table__head--registered"
                : "employee-management-table__head--invite"
            }`}
          >
            {currentColumns.map((column) => (
              <div key={column.key} className="employee-management-table__th">
                <span>{column.label}</span>
                <span className="employee-management-table__icons">
                  {"filterable" in column && column.filterable ? (
                    <Popover
                      trigger="click"
                      placement="bottomLeft"
                      content={renderFilterContent(column.key as EmployeeColumnKey)}
                    >
                      <button
                        className={`employee-management-table__icon-button${
                          (column.key === "role" && roleFilters.length > 0) ||
                          (column.key === "status" && statusFilters.length > 0)
                            ? " is-active"
                            : ""
                        }`}
                        type="button"
                        aria-label={`${column.label}筛选`}
                      >
                        <FilterOutlined />
                      </button>
                    </Popover>
                  ) : null}
                  {"sortable" in column && column.sortable ? (
                    <button
                      className={`employee-management-table__icon-button${
                        sortState?.key === column.key ? " is-active" : ""
                      }`}
                      type="button"
                      aria-label={`${column.label}排序`}
                      onClick={() => toggleSort(column.key as EmployeeColumnKey)}
                    >
                      {renderSortIcon(column.key as EmployeeColumnKey)}
                    </button>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
          {visibleEmployees.length > 0 ? (
            <div className="employee-management-table__body">
              {visibleEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className={`employee-management-table__row${
                    activeTab !== "registered" ? " employee-management-table__row--without-status" : ""
                  }`}
                >
                  <div>
                    <strong>
                      {getEmployeeName(employee)}
                    </strong>
                    <span>{employee.id}</span>
                  </div>
                  <div>
                    <strong>{employee.phone || employee.email}</strong>
                    {employee.phone && employee.email ? <span>{employee.email}</span> : null}
                  </div>
                  <div>
                    <strong>{employee.role}</strong>
                  </div>
                  {activeTab === "registered" ? (
                    <div>
                      <Tag className={`employee-management-status-tag employee-management-status-tag--${employee.employeeStatus}`}>
                        {employee.employeeStatus}
                      </Tag>
                    </div>
                  ) : (
                    <>
                      <div>
                        <strong>{activeTab === "pending" ? employee.inviteSentAt : employee.inviteExpiredAt}</strong>
                      </div>
                      <div className="employee-management-table__action">
                        <Tooltip title={activeTab === "pending" ? "再次发送注册链接" : "重新发送注册链接"}>
                        <Button
                          aria-label={activeTab === "pending" ? "再次发送注册链接" : "重新发送注册链接"}
                          icon={<ShareAltOutlined />}
                          onClick={() => handleSendInvite(employee)}
                        />
                      </Tooltip>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="employee-management-empty">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />
            </div>
          )}
        </div>
      </section>

      <Modal
        className="employee-management-add-modal"
        title="添加员工"
        open={addModalOpen}
        width={444}
        centered
        destroyOnClose
        closeIcon={null}
        footer={
          <div className="employee-management-add-modal__footer">
            <Button onClick={closeAddModal}>
              <span>关闭</span>
            </Button>
            <Button type="primary" onClick={handleAddEmployee}>
              <span>确认</span>
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="firstName" rules={[{ required: true, message: "请输入姓。" }]}>
            <Input placeholder="姓" />
          </Form.Item>
          <Form.Item name="lastName" rules={[{ required: true, message: "请输入名。" }]}>
            <Input placeholder="名" />
          </Form.Item>
          <div className="employee-management-add-modal__tip">
            <InfoCircleFilled />
            <span>请输入手机号以及/或邮箱地址。</span>
          </div>
          <Form.Item name="phone">
            <Input placeholder="手机号" />
          </Form.Item>
          <Form.Item name="email" rules={[{ type: "email", message: "请输入正确的邮箱地址。" }]}>
            <Input placeholder="邮箱" />
          </Form.Item>
          <Form.Item name="role" rules={[{ required: true, message: "请选择岗位。" }]}>
            <Select
              placeholder="岗位"
              options={roleOptions.map((role) => ({ value: role, label: role }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
