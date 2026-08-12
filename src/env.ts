export interface Env {
  /** seek.li 实例地址 */
  SIMPLELOGIN_BASE_URL: string;
  /** seek.li OpenAPI Bearer Token */
  SIMPLELOGIN_API_TOKEN: string;
  /**
   * 创建邮箱时使用的域名，例如 example.com。
   * Bitwarden 的「电子邮箱域名」应与此保持一致。
   */
  DEFAULT_EMAIL_DOMAIN: string;
  /**
   * 可选：保护 Worker 的访问令牌。
   * Bitwarden 的「API 密钥」应填写此值。
   */
  WORKER_API_TOKEN?: string;
}
