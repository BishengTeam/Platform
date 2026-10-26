# 首页快捷入口

生产构建始终不生成金刚区的“认证专区”快捷按钮。此项只控制首页快捷入口，不影响首页下方的认证标签、认证卡片、Banner 跳转及认证报名、订单等业务；这些仍使用原有规则。

剩余入口按实际内容排列：学习、竞赛为两列，有可用活动时增加活动入口并使用三列。无活动时不显示占位。开发时打开认证入口后，四个入口仍使用两列。

如需开发调试认证快捷入口，可在 PowerShell 中显式开启：

```powershell
$env:TARO_APP_HOME_CERT_ENTRY_VISIBLE = 'true'
npm run dev:weapp
```

未设置或值不是 `true` 时不显示。此设置只对开发构建有效；`npm run build:weapp` 和裁剪版生产构建都会强制关闭。认证业务开关 `certRegistration` 关闭时也不生成不可用按钮。

恢复开发默认值：

```powershell
Remove-Item Env:TARO_APP_HOME_CERT_ENTRY_VISIBLE -ErrorAction SilentlyContinue
```

修改后需要重新构建小程序。Admin、Backend 无需配套变更。
