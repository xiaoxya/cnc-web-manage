import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
});

export const toolSchema = z.object({
  name: z.string().min(1, "刀具名称不能为空"),
  specification: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  categoryId: z.number().int().positive("请选择刀具分类"),
  locationId: z.number().int().positive().optional().nullable(),
  quantity: z.number().int().min(0, "数量不能为负").default(0),
  minQuantity: z.number().int().min(0).default(1),
  unit: z.string().default("把"),
  price: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const categorySchema = z.object({
  code: z.string().min(1, "编码不能为空").max(10),
  name: z.string().min(1, "名称不能为空").max(100),
  description: z.string().optional().nullable(),
});

export const locationSchema = z.object({
  code: z.string().min(1, "编码不能为空").max(50),
  name: z.string().min(1, "名称不能为空").max(100),
  description: z.string().optional().nullable(),
});

export const userSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符").max(50),
  password: z.string().min(6, "密码至少6个字符").optional().or(z.literal("")),
  displayName: z.string().min(1, "显示名不能为空").max(100),
  role: z.enum(["ADMIN", "OPERATOR"]),
  active: z.boolean().default(true),
});

export const transactionSchema = z.object({
  toolId: z.number().int().positive(),
  quantity: z.number().int().positive("数量必须大于0"),
  notes: z.string().optional().nullable(),
});

export const batchTransactionSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  items: z
    .array(transactionSchema)
    .min(1, "至少需要一条记录"),
  referenceNo: z.string().optional().nullable(),
});

export const maintenanceSchema = z.object({
  toolId: z.number().int().positive(),
  description: z.string().min(1, "故障描述不能为空"),
  notes: z.string().optional().nullable(),
});

export const maintenanceCompleteSchema = z.object({
  cost: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const stocktakingSchema = z.object({
  factoryId: z.number().int().positive("请选择工厂").optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const stocktakingItemSchema = z.object({
  toolId: z.number().int().positive(),
  actualQuantity: z.number().int().min(0),
  notes: z.string().optional().nullable(),
});