/** Console 疫苗任务业务编号（列表展示、Mobile 任务标识） */
export function generateConsoleTaskId(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VT-${t}-${r}`;
}
