export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function generateStocktakingNo(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PD-${dateStr}-${rand}`;
}

export function generateReferenceNo(type: "IN" | "OUT"): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const prefix = type === "IN" ? "RK" : "CK";
  return `${prefix}-${dateStr}-${rand}`;
}

export const statusLabels: Record<string, string> = {
  IN_STOCK: "在库",
  IN_USE: "使用中",
  MAINTENANCE: "维修中",
  SCRAPPED: "已报废",
};

export const statusColors: Record<string, string> = {
  IN_STOCK: "bg-green-100 text-green-800",
  IN_USE: "bg-blue-100 text-blue-800",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  SCRAPPED: "bg-red-100 text-red-800",
};

export const transactionTypeLabels: Record<string, string> = {
  IN: "入库",
  OUT: "出库",
};

export const maintenanceStatusLabels: Record<string, string> = {
  IN_MAINTENANCE: "维修中",
  COMPLETED: "已完成",
};

export const stocktakingStatusLabels: Record<string, string> = {
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
};
