# 首页快捷入口

金刚区的“认证专区”快捷按钮由 `TARO_APP_HOME_CERT_ENTRY_VISIBLE` 独立控制（2026-11-03 起生产构建同样读取该开关）：`.env.production` 与 `.env.development` 均已设为 `true`，因此全量版显示；临时隐藏可在构建前改回该值。此项只控制首页快捷入口，不影响首页下方的认证标签、认证卡片、Banner 跳转及认证报名、订单等业务；这些仍使用原有规则。

入口按实际内容排列：无认证入口时学习、竞赛为两列，有可用活动时增加活动入口并使用三列；有认证入口时共三至四个入口，四个入口使用两列。无活动时不显示占位。

历史裁剪清单仍保留为源码归档，但生产构建统一使用 `npm run build:weapp`（full）。`check:weapp` 会拒绝 `dist/EDITION !== full` 的上传包。

如需开发调试认证快捷入口，也可在 PowerShell 中临时覆盖（优先级高于 env 文件）：

```powershell
$env:TARO_APP_HOME_CERT_ENTRY_VISIBLE = 'true'
npm run dev:weapp
```

未设置或值不是 `true` 时不显示。恢复默认值：

```powershell
Remove-Item Env:TARO_APP_HOME_CERT_ENTRY_VISIBLE -ErrorAction SilentlyContinue
```

修改后需要重新构建小程序。Admin、Backend 无需配套变更。
