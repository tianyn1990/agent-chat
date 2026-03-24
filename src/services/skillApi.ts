import type { Skill, InstallSkillRequest } from '@/types/skill';
import { mockSkills } from '@/mocks/skills';

/**
 * 技能 API 服务
 * 当前使用 Mock 数据，阶段七将替换为真实接口
 */

/**
 * 获取所有技能列表
 */
export async function fetchSkills(): Promise<Skill[]> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [...mockSkills];
}

/**
 * 获取技能详情
 * @param skillId 技能 ID
 */
export async function fetchSkillDetail(skillId: string): Promise<Skill | null> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockSkills.find((s) => s.id === skillId) ?? null;
}

/**
 * 安装技能
 * @param request 安装请求
 */
export async function installSkill(request: InstallSkillRequest): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log('[Mock] 安装技能:', request);
  // 真实场景会调用后端 API，触发 OpenClaw 加载远程技能
}

/**
 * 卸载技能
 * @param skillId 技能 ID
 */
export async function uninstallSkill(skillId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log('[Mock] 卸载技能:', skillId);
  // 真实场景会调用后端 API，触发 OpenClaw 卸载技能
}

/**
 * 更新技能配置
 * @param skillId 技能 ID
 * @param config 配置项
 */
export async function updateSkillConfig(
  skillId: string,
  config: Record<string, unknown>,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log('[Mock] 更新技能配置:', skillId, config);
  // 真实场景会调用后端 API
}
