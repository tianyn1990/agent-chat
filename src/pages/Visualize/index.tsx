import { Result } from 'antd';
import { NodeIndexOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import styles from './index.module.less';

export default function VisualizePage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  if (!sessionId) {
    return (
      <Result
        icon={<NodeIndexOutlined className={styles.resultIcon} />}
        title="缺少会话 ID"
        subTitle="请从对话上下文进入执行状态页面。"
      />
    );
  }

  /**
   * 真正的沉浸式工作台由全局 `VisualizeWorkbenchHost` 承载。
   *
   * 这里仅作为路由桥接页存在：
   * - 负责声明当前访问的是某个会话的工作台路由
   * - 由全局宿主根据路由决定显示/隐藏保活中的 iframe
   */
  return null;
}
