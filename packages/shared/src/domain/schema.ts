import { z } from 'zod'
export const ReportPeriodSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
})

export const PcIdentitySchema = z.object({
  pcCode: z.string().min(1, 'PC Code is required'),
  pcName: z.string().min(1, 'PC Name is required'),
})

const YearNumberMapSchema = z.record(
  z.string().regex(/^\d{4}$/, 'Key must be a 4-digit year'),
  z.number(),
)

export const NotesSchema = z.object({
  ghi_chu: z.string(),
})

export const GeneralInfoSchema = z.object({
  ten_pc: z.string(),
  doi_tac: z.string(),
  doanh_thu_ke_hoach_nam: z.number(),
})

export const ContractSchema = z.object({
  so_hd_phu_luc_hop_dong: z.string(),
  ngay_ky_hd_plhd: z.string(),
  hieu_luc_den: z.string(),
  gia_tri_hop_dong_nam: z.number(),
})

export const ExecutionSchema = z.object({
  closing_balance: z.number(),
  generated_by_year: YearNumberMapSchema,
  collected_by_year: YearNumberMapSchema,
  opening_balance_by_year: YearNumberMapSchema,
})

export const DebtAnalysisSchema = z.object({
  duoi_6_thang: z.number(),
  tu_6_den_duoi_12_thang: z.number(),
  tu_12_den_duoi_24_thang: z.number(),
  tu_24_den_duoi_36_thang: z.number(),
  tren_36_thang: z.number(),
})

export const RevenueResultSchema = z.object({
  doanh_thu_thuc_hien_nam: z.number(),
  ti_le_thuc_hien: z.number(),
})

export const PoleQuantitiesSchema = z.object({
  duoi_8_5m: z.number(),
  tu_8_5_den_10_5m: z.number(),
  tu_10_5_den_12_5m: z.number(),
  tren_12_5m: z.number(),
})

export const MonthlyReportPayloadSchema = z.object({
  notes: NotesSchema,
  general: GeneralInfoSchema,
  contract: ContractSchema,
  execution: ExecutionSchema,
  debt_analysis: DebtAnalysisSchema,
  revenue_result: RevenueResultSchema,
  pole_quantities: PoleQuantitiesSchema,
})
