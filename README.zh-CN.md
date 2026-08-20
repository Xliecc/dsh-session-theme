# dsh-session-theme（会话主题直显）

> [English](./README.md) | **简体中文**

![npm version](https://img.shields.io/npm/v/dsh-session-theme)
![npm downloads](https://img.shields.io/npm/dm/dsh-session-theme)
![license](https://img.shields.io/github/license/Xliecc/dsh-session-theme)
[![CI](https://github.com/Xliecc/dsh-session-theme/actions/workflows/ci.yml/badge.svg)](https://github.com/Xliecc/dsh-session-theme/actions/workflows/ci.yml)

DSH 网页端插件：打开页面时**左侧边栏直接显示每个会话的主题**，不用再点进会话。

## 解决什么问题

DSH 侧边栏的会话列表里，**没点开过的会话不显示主题**，只显示工作区文件夹名
（或占位 ID），点进某个会话后主题才出现。

根因：`session.list` 对「本进程从未打开过的冷会话」只读投影缓存的零 I/O 行
（`cachedSnapshot`）；如果某个会话的 title 投影从未被写入缓存，列表行就没有
`title`，侧边栏就回退到文件夹名。只有打开会话（触发完整冷读梯子）才会恢复出
标题。

## 原理

插件在**启动时**对每个持久化会话执行投影缓存的冷读梯子（`coldSnapshot`）：
从存储日志重新折叠出 `title` 投影并**持久化写回缓存**。之后 `session.list`
返回的每一行都带 `title` 投影 → 侧边栏原生显示每个会话的真实主题，无需点击。

- 只处理「冷会话」（本进程未打开的）；已加载会话的列表行本来就带实时投影。
- 逐个会话 fail-soft：某个日志损坏不影响其它会话，也不阻塞启动。
- 写回是幂等的：下次启动直接命中缓存快路径，秒开。

完整设计与数据流见 [架构文档](./ARCHITECTURE.md)。

## 验证是否生效

1. 安装插件（任选下方方式），然后**硬刷新浏览器**（Ctrl/Cmd+Shift+R）。
2. 打开 DSH 侧边栏——每个会话行应显示其主题，而非文件夹名。
3. 进一步确认：重新安装时观察服务端日志，应出现 `dsh-session-theme: projection cache warmed (N sessions)` 行。

## 安装

link 安装、零外部依赖（host 端只用标准服务）：

```sh
dsh plugin --profile web add link:C:/Users/Lie/dsh-session-theme
```

或从 GitHub 克隆：

```sh
git clone https://github.com/Xliecc/dsh-session-theme.git
dsh plugin --profile web add link:./dsh-session-theme
```

或从 npm 安装：

```sh
dsh plugin add dsh-session-theme
```

安装后**硬刷新浏览器**（Ctrl/Cmd+Shift+R）重新拉取 `session.list`。

## 文件

- `lib/index.js` — host 侧：启动时预热投影缓存（全部行为）
- `lib/client.js` — 浏览器侧占位（无操作，保持注册清单一致）

## 协议

MIT
