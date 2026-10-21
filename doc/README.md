# PJ1 Phase 1 项目文档

## 架构方案（初始方案，2026-10-21）

采用 TypeScript 严格模式、一类一文件。`domain` 封装图形和文档，`commands` 提供 Command 与历史，`application` 编排用例，`ports` 声明文件接口，`infrastructure` 实现 XML 与磁盘操作，`cli` 解析输入和输出。

依赖方向：CLI → application → commands/domain/ports；commands → domain；infrastructure → ports/domain；domain 不依赖上层或 Node IO。`main.ts` 是组合根。

采用 Composite 统一叶子与容器；Command + Memento 将一次编辑及其前后文档快照组成撤销单元；Factory 将类型解析集中一处。命令名分发、图形类型工厂是本阶段保留的两处按名字分派，未来插件化时重构。

变化点：增加图形类型（工厂与子类）；增加 IO 格式（文件端口适配器）；增加交互方式（复用 application）；大型文档（快照内存较大，未来改为命令增量备忘录）。Phase 1 不预先实现 box 或插件系统。

## 过程记录

1. 阅读原始 `phase_cli_1.md`，确认强制 TypeScript/OOP、唯一 id、错误原子性和 IO 历史屏障；明确 `box` 不属于本阶段。
2. 先提交工程骨架和架构，再分阶段实现领域模型、命令/IO、测试与完整文档。记录真实开发过程，不补造历史。

后续验收与修订将在实现时补充。
