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

export type InUseTool = {
  id: number;
  toolCode: string;
  name: string;
  specification: string | null;
  quantity: number;
  unit: string;
  categoryName: string;
  factoryId: number;
  factoryCode: string;
  factoryName: string;
};

export interface DashboardStats {
  totalTools: number;
  lowStockCount: number;
  maintenanceCount: number;
  recentTransactions: TransactionWithTool[];
  recentMaintenance: MaintenanceWithTool[];
}
