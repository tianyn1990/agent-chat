/** 技能分类 */
export type SkillCategory =
  | 'data_analysis'
  | 'writing'
  | 'code'
  | 'office'
  | 'communication'
  | 'other';

/** 技能分类显示名称映射 */
export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  data_analysis: '数据分析',
  writing: '写作助手',
  code: '代码工具',
  office: '办公自动化',
  communication: '沟通协作',
  other: '其他',
};

/** 技能配置 schema */
export interface SkillConfig {
  /** JSON Schema 格式的配置项定义 */
  schema: Record<string, unknown>;
  /** 当前配置值 */
  values: Record<string, unknown>;
}

/** 技能 */
export interface Skill {
  /** 技能唯一 ID */
  id: string;
  /** 技能名称 */
  name: string;
  /** 简短描述 */
  description: string;
  /** 图标（URL 或 emoji） */
  icon: string;
  /** 技能分类 */
  category: SkillCategory;
  /** 版本号 */
  version: string;
  /** 作者 */
  author: string;
  /** 主页链接（可选） */
  homepage?: string;
  /** 是否已安装 */
  installed: boolean;
  /** 安装时间戳（毫秒） */
  installedAt?: number;
  /** 技能配置（安装后可配置） */
  config?: SkillConfig;
  /** 主要功能特性列表 */
  features: string[];
  /** 标签 */
  tags?: string[];
}

/** 技能安装请求 */
export interface InstallSkillRequest {
  skillId: string;
  version: string;
  config?: Record<string, unknown>;
}
