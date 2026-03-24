/** 用户信息 */
export interface UserInfo {
  /** 飞书用户 open_id */
  id: string;
  /** 用户姓名 */
  name: string;
  /** 头像 URL */
  avatar: string;
  /** 部门名称 */
  department: string;
  /** 邮箱（可选） */
  email?: string;
}
