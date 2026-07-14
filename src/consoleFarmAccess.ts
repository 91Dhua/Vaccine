export const CURRENT_FARM_STORAGE_KEY = "sentri_current_farm_name";
export const CURRENT_USER_FARMS_STORAGE_KEY = "sentri_current_user_farms";
export const FARM_ACCESS_CHANGE_EVENT = "sentri-farm-access-change";

export const consoleFarmOptions = [
  "华东一场",
  "北京示范场",
  "苏北育肥场",
  "华南育肥一场",
  "西南繁育基地",
  "鲁北母猪场",
  "豫东育肥场",
  "皖南示范场",
  "冀中繁育场",
  "川西合作场",
  "苏中保育场",
  "辽南育肥场"
];

function getStoredUserFarms() {
  try {
    const storedValue = window.localStorage.getItem(CURRENT_USER_FARMS_STORAGE_KEY);
    if (!storedValue) return [];
    const parsedValue = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) return [];
    return parsedValue.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  } catch {
    return [];
  }
}

export function getCurrentUserFarms() {
  const storedUserFarms = getStoredUserFarms();
  if (storedUserFarms.length > 0) return storedUserFarms;
  const token = window.localStorage.getItem("sentri_console_token");
  if (token === "valid") return consoleFarmOptions.slice(0, 1);
  return consoleFarmOptions;
}

export function notifyFarmAccessChanged() {
  window.dispatchEvent(new Event(FARM_ACCESS_CHANGE_EVENT));
}

export function saveCurrentFarmAccess(userFarms: string[], currentFarmName: string) {
  window.localStorage.setItem(CURRENT_USER_FARMS_STORAGE_KEY, JSON.stringify(userFarms));
  window.localStorage.setItem(CURRENT_FARM_STORAGE_KEY, currentFarmName);
  notifyFarmAccessChanged();
}

export function clearCurrentFarmAccess() {
  window.localStorage.removeItem(CURRENT_USER_FARMS_STORAGE_KEY);
  window.localStorage.removeItem(CURRENT_FARM_STORAGE_KEY);
  notifyFarmAccessChanged();
}
