# AI 总结提示词模板系统 — 设计文档

## 概述

为 AI 总结功能添加多场景提示词模板系统。用户可以根据不同使用场景（会议、课程、访谈等）预设和切换多套提示词模板，每套模板包含系统提示词和用户消息模板，支持 `{{content}}` 占位符。

## 动机

- 当前只有一个硬编码默认提示词 + 一个自定义文本框，无法应对多场景需求
- 不同场景（会议、课程、访谈、通用总结）需要不同的输出结构和关注点
- system prompt 可定制，但 user message 是写死的，限制了 prompt engineering 的效果

## 数据模型

### 新增类型 (`src/shared/types.ts`)

```typescript
export interface SummaryTemplate {
  id: string           // 唯一标识，如 'general' | 'meeting' | 'lecture' | 'interview' | 用户自定义 UUID
  name: string         // 显示名称
  icon: string         // MUI icon 名称（预设用具体图标，用户自定义用默认图标）
  systemPrompt: string // 系统提示词
  userMessageTemplate: string // 用户消息模板，{{content}} 为内容占位符
  isBuiltIn: boolean   // 是否内置预设（内置不可删除，可编辑后另存为自定义）
}
```

### 修改类型 (`GeneralSettings`)

```typescript
export interface GeneralSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  summaryPrompt: string              // [保留兼容] 旧版单一提示词
  summaryTemplates: SummaryTemplate[] // [新增] 模板列表
  activeTemplateId: string           // [新增] 当前使用的模板 ID
}
```

**兼容策略：**
- 首次加载时，若 `summaryTemplates` 为空，从内置预设初始化
- 若旧版 `summaryPrompt` 非空且 `summaryTemplates` 为空，将旧 prompt 迁移为第一个自定义模板
- 旧版 `summaryPrompt` 字段保留但不再在 UI 中暴露

## 预设模板

### 1. 通用思维导图 (general)
- **图标:** `AccountTreeIcon`
- **系统提示词:** 整理语音转写内容为结构化 Markdown 思维导图大纲（H1/H2/H3/列表层级）
- **用户消息:** `请为以下内容生成结构化思维导图大纲：\n\n{{content}}`

### 2. 会议纪要 (meeting)
- **图标:** `GroupsIcon`
- **系统提示词:** 整理会议转写为纪要格式，末尾包含"决议与行动项"章节
- **用户消息:** `请将以下会议内容整理为会议纪要，突出决议和行动项：\n\n{{content}}`

### 3. 课程/讲座笔记 (lecture)
- **图标:** `SchoolIcon`
- **系统提示词:** 整理课程转写为学习笔记，末尾包含"关键概念索引"
- **用户消息:** `请将以下课程/讲座内容整理为结构化学习笔记：\n\n{{content}}`

### 4. 访谈/对话记录 (interview)
- **图标:** `RecordVoiceOverIcon`
- **系统提示词:** 整理访谈转写为结构化摘要，末尾包含"关键观点摘要"
- **用户消息:** `请将以下访谈对话整理为结构化访谈摘要，突出受访者的核心观点和关键引用：\n\n{{content}}`

（完整提示词内容见评审确认部分）

## 组件树

```
SettingsPage (修改)
└── TemplateManager (新增)
    ├── TemplateList
    │   └── TemplateCard × N (可编辑/删除/设为默认)
    └── TemplateEditor (新增/编辑模板的对话框)
        ├── TextField: 模板名称
        ├── TextField: 图标选择
        ├── TextArea: 系统提示词
        └── TextArea: 用户消息模板

SummaryPanel (修改)
└── 生成按钮旁新增模板选择器 (Dropdown/Select)
    └── 列出所有模板，标注当前使用模板
```

## 数据流

```
┌─────────────────────────────────────────────────────────┐
│  SettingsPage                                           │
│  TemplateManager ───save──→ settingsStore               │
│                              │                          │
│                              ▼                          │
│                     electron-store (持久化)              │
│                              │                          │
│  SummaryPanel ◄──────────────┘                          │
│  ├── 模板选择器 → activeTemplateId                       │
│  └── 生成按钮 → summaryStore.generateSummary()           │
│                     │                                   │
│                     ▼                                   │
│              SummaryService                              │
│              ├── systemPrompt ← template.systemPrompt    │
│              └── userMessage ← template.userMessageTemplate│
│                                  .replace('{{content}}', fullText)│
└─────────────────────────────────────────────────────────┘
```

## 关键逻辑

### 模板解析

```typescript
// summaryStore.generateSummary() 中
const template = settings.general.summaryTemplates.find(
  t => t.id === settings.general.activeTemplateId
) || settings.general.summaryTemplates[0]

const systemPrompt = template.systemPrompt
const userMessage = template.userMessageTemplate.replace('{{content}}', fullText)
```

### 内置模板保护

- `isBuiltIn: true` 的模板不可删除
- 编辑内置模板时，点击保存会**另存为新模板**而非覆盖原模板
- 内置模板可通过"重置为默认"恢复原始内容

### 旧数据迁移（首次加载）

```typescript
function migrateTemplates(settings: AppSettings): AppSettings {
  if (settings.general.summaryTemplates?.length > 0) return settings
  const templates = [...BUILT_IN_TEMPLATES]
  if (settings.general.summaryPrompt) {
    templates.push({
      id: crypto.randomUUID(),
      name: '旧自定义提示词',
      icon: 'SettingsIcon',
      systemPrompt: settings.general.summaryPrompt,
      userMessageTemplate: '请为以下内容生成结构化总结：\n\n{{content}}',
      isBuiltIn: false,
    })
  }
  return {
    ...settings,
    general: {
      ...settings.general,
      summaryTemplates: templates,
      activeTemplateId: templates[0].id,
    },
  }
}
```

## 涉及修改的文件

| 文件 | 修改内容 |
|------|---------|
| `src/shared/types.ts` | 新增 `SummaryTemplate` 接口，扩展 `GeneralSettings` |
| `src/renderer/src/services/summary.service.ts` | 移除硬编码默认 prompt，接收模板参数 |
| `src/renderer/src/store/summaryStore.ts` | 读取模板生成 prompt |
| `src/renderer/src/store/settingsStore.ts` | 新增模板 CRUD 方法 + 迁移逻辑 |
| `src/renderer/src/pages/SettingsPage.tsx` | 替换单文本框为模板管理器 |
| `src/renderer/src/components/Summary/SummaryPanel.tsx` | 添加模板选择器 |
| `src/renderer/src/components/Settings/TemplateManager.tsx` | [新增] 模板管理组件 |
| `src/renderer/src/components/Settings/TemplateEditor.tsx` | [新增] 模板编辑对话框 |
| `tests/` | 新增模板迁移、CRUD、占位符替换测试 |

## 不在范围内

- 翻译提示词模板化（仅做总结模块）
- 模板导入/导出功能
- 模板市场/分享
- 提示词版本历史
- 提示词效果 A/B 对比
