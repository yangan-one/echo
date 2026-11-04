# 部署到 Sealos（照着填就行）

这个应用是一个 **常驻 Node 进程 + 一块磁盘**：页面、`/api/*`、音频都由同一个进程提供，数据写在 `/app/data`。所以部署时只要保证三件事——**端口 8788**、**环境变量**、**把存储卷挂到 `/app/data`**。

---

## 0. 先确认你要走哪条镜像来源

Sealos 的应用要一个容器镜像。三种方式，选一种：

| 方式 | 需要什么 | 适合谁 |
|---|---|---|
| A. GitHub 自动构建（推荐，不用本机装 Docker） | 一个 GitHub 仓库 | 大多数人 |
| B. 本机 `docker build` 后推送 | 本机装了 Docker Desktop + Docker Hub 账号 | 已经装过 Docker |
| C. Sealos 里从 Dockerfile 构建（若你的控制台有“源码构建”入口） | 一个 Git 仓库 | 界面支持时最省事 |

---

## A. GitHub 自动构建（推荐）

仓库里已经带了 `.github/workflows/docker.yml`，推到 GitHub 就会自动构建镜像到 GHCR（免费）。

1. 在 GitHub 新建一个空仓库，比如 `echo`；
2. 在本机 `echo-app` 目录里执行：

```bash
git init
git add .
git commit -m "echo: accounts + server"
git branch -M main
git remote add origin https://github.com/<你的用户名>/echo.git
git push -u origin main
```

> 注意：`.env` 已经在 `.gitignore` 里，不会被推上去；`data/`、`node_modules/`、`dist/` 同理。

3. 推完去仓库的 **Actions** 页，等 `build-image` 变绿；
4. 镜像地址是：`ghcr.io/<你的用户名>/echo:latest`；
5. 到仓库 **Settings → Packages**，把该镜像的可见性设为 **Public**（Sealos 拉取公共镜像最简单；私有镜像需要在 Sealos 配 registry 凭证）。

---

## B. 本机 Docker

```bash
cd echo-app
docker build -t <你的dockerhub用户名>/echo:latest .
docker login
docker push <你的dockerhub用户名>/echo:latest
```

镜像地址即 `<你的dockerhub用户名>/echo:latest`。

---

## 1. 在 Sealos 建应用

路径：`cloud.sealos.io` → **应用管理 / App Launchpad** → **新建应用**。

| 字段 | 填什么 |
|---|---|
| 应用名 | `echo` |
| 镜像 | `ghcr.io/<用户名>/echo:latest` 或 `<dockerhub>/echo:latest` |
| 副本数 | 1 |
| CPU / 内存 | 0.5 核 / 1GB 足够（音频在磁盘上，不占内存） |
| 容器端口 | `8788` |
| 对外端口 | 8788（HTTP） |

---

## 2. 环境变量（必填）

| Key | Value |
|---|---|
| `ECHO_AI_KEY` | 你的 DeepSeek key（`sk-...`） |
| `ECHO_SECRET` | 一串随机字符，≥32 位。**别用默认值**，否则别人能伪造登录 |
| `ECHO_AI_BASE_URL` | `https://api.deepseek.com/v1` |
| `ECHO_AI_MODEL` | `deepseek-chat` |

可选（转写，见文末）：

| Key | Value |
|---|---|
| `ECHO_ASR_BASE_URL` | 兼容 `/v1/audio/transcriptions` 的服务地址 |
| `ECHO_ASR_KEY` | 该服务的 key |
| `ECHO_ASR_MODEL` | 例如 `whisper-1` / `FunAudioLLM/SenseVoiceSmall` |

生成随机串（任意一个都行）：

```bash
openssl rand -hex 32
# 或
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. 存储卷（强烈建议）

**这一步就是“买一块云硬盘”**，不是本地部署，也不需要你自己有服务器。

- 在应用配置里找 **存储 / Volumes**，新建或挂载一块卷；
- 容量 **1GB** 起步（几十个用户、几百段录音足够；一段 30 秒 webm 约 50KB，一段 75 秒 mp3 不进用户数据）；
- 挂载路径必须是 **`/app/data`**。

**不挂会怎样**：容器每次重启、重新部署、节点迁移，`data/` 都会回到初始状态——所有账号、训练记录、录音全部消失。用户本机还留着一份缓存，但服务端账号没了，登录 token 失效，等于要重新注册。

费用：Sealos 的存储按量计费，1GB 一个月的量级是「几块钱以内」，以控制台计费页显示为准。相比“数据每次清空”，这笔钱基本是必须的。

---

## 4. 打开并验收

Sealos 会给一个 `https://xxx.sealosbja.site` 之类的地址（自带 HTTPS，麦克风可用）。

验收顺序：

1. 打开首页 → 出现登录/注册页；
2. 注册一个账号 → 首页显示你的名字；
3. 做一次即兴训练（允许麦克风）；
4. 刷新页面 → 记录还在；
5. 设置页 → 生成一条建议 → 建议卡右上角应显示「远程模型 · 站点额度」；
6. 再注册第二个账号 → 记录应为 0（确认数据隔离）。

命令行也能快速确认服务端：

```bash
curl https://<你的域名>/api/health
# {"ok":true,"ai":true,"model":"deepseek-chat","asr":false}
```

---

## 5. 手机端注意

- **微信内置浏览器经常禁用麦克风**：页面里已经会提示“用系统浏览器打开”。发给朋友时最好附一句“用 Safari 或 Chrome 打开”。
- **iPhone 没有 Web Speech**：不配 ASR 时，手机用户录音后拿不到自动转写，但可以点「手动补一句」输入当时那句话，打标和重录流程仍完整。
- 安卓 Chrome 的语音识别依赖 Google 服务，国内多数网络不可用，同样会退回手动输入。

---

## 6. 转写（可选，先不配也能用）

不配 ASR 时：录音、回放、打标、重录、建议全部正常，只是没有自动转写，需要手动输入那一句。

想配的话，需要一个 **OpenAI 兼容**的 `/v1/audio/transcriptions` 服务，把上面三个 `ECHO_ASR_*` 填上即可，代码不用改。可选来源：

- 国内厂商的免费额度（阿里云百炼、讯飞等，需实名；注意是否提供 OpenAI 兼容接口）；
- 硅基流动等聚合平台的语音模型（按量计费，很便宜）；
- Cloudflare Workers AI 的 Whisper（有每日免费额度，需要自己包一层 HTTP 代理）。

> `api.openai.com` 在国内网络通常连不上，官方 Whisper 接口不建议直接填。

---

## 7. 备份

数据都在 `/app/data`：

- `db.json`：账号、训练记录、卡点、建议；
- `audio/<userId>/*.bin`：用户录音。

Sealos 侧可以给卷做快照；应用内也支持「设置 → 导出整包（含录音）」，让用户自己备份一份。
