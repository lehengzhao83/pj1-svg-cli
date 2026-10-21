# CLI SVG 编辑器 · PJ1 Phase 1

TypeScript 面向对象实现，支持六种 SVG 元素、嵌套分组、文件读写及命令级撤销重做。需要 Node.js 22 或更新版本（推荐 24）。

```sh
npm ci
npm run cli
```

输入 `help` 查看语法，`quit` 退出。验证：`npm run check`。

Windows 也可直接执行 `powershell -ExecutionPolicy Bypass -File .\run.ps1`。回放示例（Windows）：

```bat
npm run build
node dist/main.js < examples/flowchart.txt
```

生成的 [examples/flowchart.svg](examples/flowchart.svg) 可直接用浏览器打开。

完整架构、协作记录及验收说明见 [doc/README.md](doc/README.md)。
