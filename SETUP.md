# 使用说明

让 Bitwarden 通过 Cloudflare Worker 调用 seek.li 创建邮箱别名。

## 你需要准备

- Cloudflare 账号
- seek.li 账号及 API Token
- 知道你的邮箱域名（如 `seek.li`，即 `xxx@seek.li` 里的后缀）

---

## 一、Fork 并部署

### 1. Fork 仓库

打开 GitHub 仓库 → 点击 **Fork**，复制到你自己的账号下。

### 2. 在 Cloudflare 绑定仓库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. **Workers & Pages** → **Create** → **Workers** → **Connect to Git**
3. 选择你 Fork 的仓库，分支选 `main`
4. 构建设置：

| 项目 | 填写 |
|------|------|
| 构建命令 | `npm install` |
| 部署命令 | `npx wrangler deploy` |

5. 点击部署，等待完成

### 3. 填写环境变量

进入该 Worker → **Settings** → **Variables and Secrets**：

| 变量名 | 类型 | 示例 |
|--------|------|------|
| `SIMPLELOGIN_API_TOKEN` | Secret | seek.li 后台获取的 Token |
| `WORKER_API_TOKEN` | Secret | 自己设一个随机字符串 |
| `DEFAULT_EMAIL_DOMAIN` | Text | `seek.li` |

保存后重新部署一次。

### 4. （可选）绑定自定义域名

Worker → **Settings** → **Domains & Routes** → 添加你的域名。

记下 Worker 访问地址，例如：
- `https://simplelogin-mailbox-worker.你的用户名.workers.dev`
- 或 `https://你的自定义域名`

### 5. 验证部署成功

浏览器访问 Worker 地址，应看到 JSON，且包含：

```json
"service": "simplelogin-mailbox-worker"
```

如果显示 `Hello world`，说明部署或域名绑定有误，检查构建日志和域名是否绑在正确的 Worker 上。

---

## 二、配置 Bitwarden

打开 Bitwarden → **生成器** → **转发的电子邮箱别名**：

| 字段 | 填写 |
|------|------|
| 服务 | SimpleLogin |
| 电子邮箱域名 | 与 `DEFAULT_EMAIL_DOMAIN` 相同，如 `seek.li` |
| API 密钥 | 上面设置的 `WORKER_API_TOKEN` |
| 自托管服务器 URL | `https://你的Worker地址`（**必须带 https://**） |

点击生成，成功后会得到类似 `a3f8b2c1@seek.li` 的邮箱。

---

## 三、常见问题

**返回 Hello world**  
域名绑错了 Worker，或 Git 构建失败。检查 Deployments 日志。

**域名不可用**  
`DEFAULT_EMAIL_DOMAIN` 填错了，应填 seek.li 支持的邮箱后缀，不是你的 Worker 域名。

**Bitwarden 报 ERR_FILE_NOT_FOUND**  
自托管 URL 没加 `https://`，补全后重试。

**401 未授权**  
Bitwarden 的 API 密钥与 `WORKER_API_TOKEN` 不一致。

---

## 获取 seek.li Token

1. 登录 https://seek.li
2. **Settings** → **API** / **API Keys**
3. 新建并复制 Token → 填入 Cloudflare 的 `SIMPLELOGIN_API_TOKEN`
