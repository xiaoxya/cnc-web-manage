import type {
  User,
  Tool,
  ToolCategory,
  Location,
  ToolTransaction,
  MaintenanceRecord,
  Stocktaking,
  StocktakingItem,
} from "@prisma/client";

export type SafeUser = Omit<User, "passwordHash">;

export type ToolWithRelations = Tool & {
  category: ToolCategory;
  location: Location | null;
};

export type TransactionWithTool = ToolTransaction & {
  tool: Pick<Tool, "toolCode" | "name">;
};

export type MaintenanceWithTool = MaintenanceRecord & {
  tool: Pick<Tool, "toolCode" | "name">;
};

export type StocktakingWithItems = Stocktaking & {
  items: (StocktakingItem & {
    tool: Pick<Tool, "toolCode" | "name" | "specification">;
  })[];
};

export interface DashboardStats {
  totalTools: number;
  lowStockCount: number;
  maintenanceCount: number;
  recentTransactions: TransactionWithTool[];
  recentMaintenance: MaintenanceWithTool[];
}
