import { useEffect, useState } from 'react';
import { message } from 'antd';
import { AppstoreOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSkillStore } from '@/stores/useSkillStore';
import { fetchSkills, installSkill, uninstallSkill } from '@/services/skillApi';
import type { Skill } from '@/types/skill';
import SkillSearch from '@/components/Skills/SkillSearch';
import SkillFilter from '@/components/Skills/SkillFilter';
import SkillCard from '@/components/Skills/SkillCard';
import SkillDetail from '@/components/Skills/SkillDetail';
import styles from './Skills.module.less';

/**
 * 技能市场页面
 * 展示所有可用技能，支持搜索、筛选、安装、卸载
 */
export default function SkillsPage() {
  const {
    searchKeyword,
    selectedCategory,
    setSkills,
    setLoading,
    setSearchKeyword,
    setCategory,
    markInstalled,
    getFilteredSkills,
    getInstalledSkills,
  } = useSkillStore();

  // 当前选中的技能（用于详情抽屉）
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  // 详情抽屉是否打开
  const [detailOpen, setDetailOpen] = useState(false);
  // 当前正在操作的技能 ID（用于显示 loading）
  const [operatingSkillId, setOperatingSkillId] = useState<string | null>(null);

  /**
   * 加载技能列表
   */
  const loadSkills = async () => {
    setLoading(true);
    try {
      const data = await fetchSkills();
      setSkills(data);
    } catch (error) {
      message.error('加载技能列表失败');
      console.error('加载技能列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化：加载技能列表
  useEffect(() => {
    loadSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 处理技能卡片点击：打开详情抽屉
   */
  const handleCardClick = (skill: Skill) => {
    setSelectedSkill(skill);
    setDetailOpen(true);
  };

  /**
   * 处理安装/卸载按钮点击
   */
  const handleInstallClick = async (skill: Skill) => {
    setOperatingSkillId(skill.id);
    try {
      if (skill.installed) {
        // 卸载
        await uninstallSkill(skill.id);
        markInstalled(skill.id, false);
        message.success(`已卸载 ${skill.name}`);
      } else {
        // 安装
        await installSkill({ skillId: skill.id, version: skill.version });
        markInstalled(skill.id, true);
        message.success(`已安装 ${skill.name}`);
      }
      // 更新详情抽屉中的技能状态
      if (selectedSkill?.id === skill.id) {
        setSelectedSkill({ ...skill, installed: !skill.installed });
      }
    } catch (error) {
      message.error(skill.installed ? '卸载失败' : '安装失败');
      console.error('操作失败:', error);
    } finally {
      setOperatingSkillId(null);
    }
  };

  // 获取过滤后的技能列表
  const filteredSkills = getFilteredSkills();
  // 获取已安装的技能列表
  const installedSkills = getInstalledSkills();

  return (
    <div className={styles.container}>
      {/* 头部：标题 + 搜索 + 筛选 */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>技能市场</h1>
          <SkillSearch value={searchKeyword} onChange={setSearchKeyword} />
        </div>
        <SkillFilter selectedCategory={selectedCategory} onChange={setCategory} />
      </div>

      {/* 内容区域 */}
      <div className={styles.content}>
        {/* 已安装技能区域 */}
        {installedSkills.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>已安装技能</span>
            </div>
            <div className={styles.grid}>
              {installedSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onClick={handleCardClick}
                  onInstallClick={handleInstallClick}
                  loading={operatingSkillId === skill.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* 所有技能区域 */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <AppstoreOutlined />
            <span>所有技能</span>
          </div>
          {filteredSkills.length > 0 ? (
            <div className={styles.grid}>
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onClick={handleCardClick}
                  onInstallClick={handleInstallClick}
                  loading={operatingSkillId === skill.id}
                />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🔍</div>
              <div className={styles.emptyText}>
                {searchKeyword || selectedCategory !== 'all' ? '未找到匹配的技能' : '暂无技能'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 技能详情抽屉 */}
      <SkillDetail
        skill={selectedSkill}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onInstallClick={handleInstallClick}
        loading={operatingSkillId === selectedSkill?.id}
      />
    </div>
  );
}
