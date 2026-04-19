const STORAGE_KEY = "statuscheck_device_id";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `device_${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

export const getDeviceId = () => {
  if (typeof window === "undefined") {
    return "server";
  }
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const next = createId();
  window.localStorage.setItem(STORAGE_KEY, next);
  return next;
};
