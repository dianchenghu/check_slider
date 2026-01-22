# 测试指南

本项目使用 [Vitest](https://vitest.dev/) 和 [React Testing Library](https://testing-library.com/react) 进行测试。

## 运行测试

### 运行所有测试
```bash
npm run test:run
```

### 以监听模式运行测试（开发时推荐）
```bash
npm test
```

### 使用 UI 界面运行测试
```bash
npm run test:ui
```

### 生成测试覆盖率报告
```bash
npm run test:coverage
```

## 测试文件结构

测试文件应该与源文件放在同一目录下，使用 `.test.ts` 或 `.test.tsx` 后缀：

```
src/
  components/
    DatabaseSchemaDemo.tsx
    DatabaseSchemaDemo.test.tsx  ← 测试文件
  lib/
    utils.ts
    utils.test.ts  ← 测试文件
```

## 编写测试

### 示例：工具函数测试

```typescript
import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })
})
```

### 示例：React 组件测试

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## 测试配置

测试配置位于 `vitest.config.ts`，主要设置包括：

- **环境**: jsdom（用于 DOM 测试）
- **全局 API**: 启用（无需导入 `describe`, `it`, `expect`）
- **设置文件**: `src/test/setup.ts`（包含测试库的配置）

## 常用测试命令

- `screen.getByText()` - 查找包含特定文本的元素
- `screen.getByRole()` - 通过角色查找元素
- `screen.queryByText()` - 查找元素（找不到返回 null）
- `screen.getAllByText()` - 查找所有匹配的元素
- `userEvent.click()` - 模拟用户点击
- `fireEvent` - 触发 DOM 事件

## 注意事项

1. ReactFlow 组件需要 `ReactFlowProvider` 包裹
2. 使用 Context 的组件需要 mock 相应的 Context
3. 测试文件会自动清理，无需手动清理 DOM

