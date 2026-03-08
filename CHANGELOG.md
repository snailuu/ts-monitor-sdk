# 1.0.0 (2026-03-08)


### Bug Fixes

* **ci:** 升级 Node.js 版本至 22 以满足 semantic-release 要求 ([5627c62](https://github.com/snailuu/ts-monitor-sdk/commit/5627c6273699dd61c0151739873fd42b055f5fdc))
* 修复 code review 发现的全部问题 ([decb731](https://github.com/snailuu/ts-monitor-sdk/commit/decb73136adc391ac5689d9b44d0fa1e18de27db))
* 修复第二轮 code review 全部问题 ([04e84e3](https://github.com/snailuu/ts-monitor-sdk/commit/04e84e3c573369281b285e3071223695c5d3443e))


### Features

* 完成最终集成 - 全量导出 + 构建验证 ([99e2c30](https://github.com/snailuu/ts-monitor-sdk/commit/99e2c30ac62af9c5437df36b31e92cfcda1f4e0a))
* 定义核心类型（配置、事件、插件、Transport 接口） ([1f9d012](https://github.com/snailuu/ts-monitor-sdk/commit/1f9d0126aa1bae740990f2a7d35f1be5ffd799c0))
* 实现 Node.js HTTP 监控插件（http.request 拦截） ([d714403](https://github.com/snailuu/ts-monitor-sdk/commit/d7144033efa7e9c30b88f4e9c79f3defcaff4143))
* 实现 Node.js 错误捕获插件（uncaughtException + unhandledRejection） ([0ef96ef](https://github.com/snailuu/ts-monitor-sdk/commit/0ef96ef577366c5d2daf28f9d5730b35e49a540f))
* 实现 SDK 核心类（插件注册、生命周期钩子、采样率） ([109fd05](https://github.com/snailuu/ts-monitor-sdk/commit/109fd057862adf2da1141983d92b170e641a91cb))
* 实现事件总线（EventBus） ([b5689f8](https://github.com/snailuu/ts-monitor-sdk/commit/b5689f89cddfe15c5ae683bf3c47f38477b2e349))
* 实现工具函数（环境检测、ID 生成、堆栈解析） ([1a180bc](https://github.com/snailuu/ts-monitor-sdk/commit/1a180bc63ad668bbe28ccb14a916a636fa4e9e23))
* 实现性能监控插件（Navigation Timing + Paint） ([24c5930](https://github.com/snailuu/ts-monitor-sdk/commit/24c5930e593aba1da6bbc390ae8ab8236f8a7aaf))
* 实现数据上报层（BatchTransport + Beacon/Fetch） ([34037e9](https://github.com/snailuu/ts-monitor-sdk/commit/34037e99062b0a81d328d44fd47b2753a83d1ade))
* 实现浏览器 HTTP 请求监控插件（fetch 拦截） ([a36885e](https://github.com/snailuu/ts-monitor-sdk/commit/a36885e3ef41c88ee195adc6d1daffdf46faf387))
* 实现浏览器 JS 错误捕获插件（window.onerror + unhandledrejection） ([ec56bd3](https://github.com/snailuu/ts-monitor-sdk/commit/ec56bd36e0d473cfd87ad549e90f18de36ea94bf))
* 实现用户行为追踪插件（点击事件 + 路由变化） ([8384a76](https://github.com/snailuu/ts-monitor-sdk/commit/8384a767cdfa27c41ae404f79407acba2d620822))
* 新增面包屑管理器和 Web Vitals 插件，增强核心模块和测试 ([8d75d4c](https://github.com/snailuu/ts-monitor-sdk/commit/8d75d4c0bab7bd837220191ccc494c8764f348da))
