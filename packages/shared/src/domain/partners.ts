import { PARTNER_CODES, type PartnerCode } from './constants.js'

export const PARTNER_CATEGORY_CODES = ['TELECOM', 'CABLE_TV', 'OTHER'] as const
export type PartnerCategory = (typeof PARTNER_CATEGORY_CODES)[number]

export type PartnerOption = {
  code: PartnerCode
  fullName: string
  category: PartnerCategory
}

const PARTNER_FULL_NAME_BY_CODE: Readonly<Record<PartnerCode, string>> = {
  VNPT: 'Tập đoàn Bưu chính Viễn thông Việt Nam',
  FPT: 'Công ty Cổ phần Viễn thông FPT',
  MOBI: 'Tổng Công ty Viễn thông MobiFone',
  SCTV: 'Công ty TNHH Truyền hình Cáp Saigontourist',
  VTVCAB: 'Tổng Công ty Truyền hình Cáp Việt Nam',
  VNMOBILE: 'Công ty Cổ phần Viễn thông Di động Vietnamobile',
  CMC: 'Công ty Cổ phần Hạ tầng Viễn thông CMC',
  HTC: 'Công ty Cổ phần Viễn thông HTC / HTC Viễn thông quốc tế',
  ACT: 'Công ty ACT',
  TPCOMS: 'Công ty TPCOMS / Tiên Phát',
  'TTVT KVII': 'Trung tâm Viễn thông Khu vực VII',
  TIVICOM: 'Công ty TIVICOM',
  NETNAM: 'Công ty Cổ phần NetNam',
  HAILONG: 'Công ty TNHH TM DV Viễn thông Hải Long',
  HTV: 'HTV TMS (dịch vụ truyền hình)',
  TANVIETSINH: 'Công ty CPTM QC TH Tân Việt Sinh',
  HTMMN: 'Trung tâm hạ tầng mạng miền Nam',
  KHOINGHIEP: 'Công ty Khởi Nghiệp',
  STC: 'Công ty STC',
  HUNGMANH: 'Công ty Hưng Mạnh',
  VIETTHANH: 'Công ty Việt Thành',
  KHAC: 'Các đối tác khác',
}

const PARTNER_CATEGORY_BY_CODE: Readonly<Record<PartnerCode, PartnerCategory>> = {
  VNPT: 'TELECOM',
  FPT: 'TELECOM',
  MOBI: 'TELECOM',
  SCTV: 'CABLE_TV',
  VTVCAB: 'CABLE_TV',
  VNMOBILE: 'TELECOM',
  CMC: 'TELECOM',
  HTC: 'TELECOM',
  ACT: 'TELECOM',
  TPCOMS: 'TELECOM',
  'TTVT KVII': 'TELECOM',
  TIVICOM: 'TELECOM',
  NETNAM: 'TELECOM',
  HAILONG: 'TELECOM',
  HTV: 'CABLE_TV',
  TANVIETSINH: 'TELECOM',
  HTMMN: 'TELECOM',
  KHOINGHIEP: 'TELECOM',
  STC: 'TELECOM',
  HUNGMANH: 'TELECOM',
  VIETTHANH: 'TELECOM',
  KHAC: 'OTHER',
}

export const PARTNER_CATEGORY_LABELS: Readonly<Record<PartnerCategory, string>> = {
  TELECOM: 'Đối tác Viễn Thông',
  CABLE_TV: 'Đối tác Truyền hình cáp',
  OTHER: 'Khác',
}

export function getPartnerOptions(): PartnerOption[] {
  return PARTNER_CODES.map((code) => ({
    code,
    fullName: PARTNER_FULL_NAME_BY_CODE[code],
    category: PARTNER_CATEGORY_BY_CODE[code],
  }))
}

export function getPartnerFullNameByCode(code: string | null | undefined): string | null {
  if (!code) return null
  if ((PARTNER_CODES as readonly string[]).includes(code)) {
    return PARTNER_FULL_NAME_BY_CODE[code as PartnerCode]
  }
  return null
}

export function getPartnerCategory(code: string | null | undefined): PartnerCategory {
  if (!code) return 'OTHER'
  if ((PARTNER_CODES as readonly string[]).includes(code)) {
    return PARTNER_CATEGORY_BY_CODE[code as PartnerCode]
  }
  return 'OTHER'
}

export function getPartnerCategoryLabel(code: string | null | undefined): string {
  return PARTNER_CATEGORY_LABELS[getPartnerCategory(code)]
}
