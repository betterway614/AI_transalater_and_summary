import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock window.api
const mockApi = {
  store: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue({ success: true })
  },
  floating: {
    updateSubtitles: vi.fn().mockResolvedValue(true),
    updateTheme: vi.fn().mockResolvedValue(true),
    updateSummary: vi.fn().mockResolvedValue(true)
  },
  logToMain: vi.fn()
}

Object.defineProperty(window, 'api', { value: mockApi, writable: true })

import { BUILT_IN_TEMPLATES } from '../src/shared/types'
import type { SummaryTemplate } from '../src/shared/types'
import { useSettingsStore } from '../src/renderer/src/store/settingsStore'
import { SummaryService } from '../src/renderer/src/services/summary.service'

describe('Built-in Templates', () => {
  it('should have 4 built-in templates', () => {
    expect(BUILT_IN_TEMPLATES).toHaveLength(4)
  })

  it('should all be marked as built-in', () => {
    expect(BUILT_IN_TEMPLATES.every((t) => t.isBuiltIn)).toBe(true)
  })

  it('should have unique IDs', () => {
    const ids = BUILT_IN_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should have required fields', () => {
    for (const t of BUILT_IN_TEMPLATES) {
      expect(t.id).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.icon).toBeTruthy()
      expect(t.systemPrompt).toBeTruthy()
      expect(t.userMessageTemplate).toContain('{{content}}')
    }
  })

  it('general template should produce mind map outline', () => {
    const general = BUILT_IN_TEMPLATES.find((t) => t.id === 'general')
    expect(general).toBeDefined()
    expect(general!.systemPrompt).toContain('思维导图')
  })

  it('meeting template should emphasize action items', () => {
    const meeting = BUILT_IN_TEMPLATES.find((t) => t.id === 'meeting')
    expect(meeting).toBeDefined()
    expect(meeting!.systemPrompt).toContain('行动项')
  })

  it('lecture template should emphasize concepts', () => {
    const lecture = BUILT_IN_TEMPLATES.find((t) => t.id === 'lecture')
    expect(lecture).toBeDefined()
    expect(lecture!.systemPrompt).toContain('概念')
  })

  it('interview template should emphasize viewpoints', () => {
    const interview = BUILT_IN_TEMPLATES.find((t) => t.id === 'interview')
    expect(interview).toBeDefined()
    expect(interview!.systemPrompt).toContain('受访者')
  })
})

describe('SummaryService with Templates', () => {
  it('should replace {{content}} placeholder in user message', () => {
    const template: SummaryTemplate = {
      id: 'test',
      name: 'Test',
      icon: 'AutoAwesomeIcon',
      systemPrompt: 'You are a summarizer.',
      userMessageTemplate: 'Summarize:\n\n{{content}}',
      isBuiltIn: false,
    }

    const service = new SummaryService({
      apiKey: 'sk-test',
      model: 'test-model',
      baseUrl: 'https://test.api',
      systemPrompt: template.systemPrompt,
      userMessage: template.userMessageTemplate,
    })

    expect(service).toBeDefined()
  })

  it('should handle userMessage without placeholder', () => {
    const template: SummaryTemplate = {
      id: 'test2',
      name: 'No Placeholder',
      icon: 'AutoAwesomeIcon',
      systemPrompt: 'You are a helper.',
      userMessageTemplate: 'Please summarize the following content.',
      isBuiltIn: false,
    }

    const service = new SummaryService({
      apiKey: 'sk-test',
      model: 'test-model',
      baseUrl: 'https://test.api',
      systemPrompt: template.systemPrompt,
      userMessage: template.userMessageTemplate,
    })

    expect(service).toBeDefined()
  })
})

describe('SettingsStore Template CRUD', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset store with templates
    const store = useSettingsStore.getState()
    store.loadSettings({
      ai: { whisper: { provider: 'openai', apiKey: '', model: 'whisper-1', baseUrl: 'https://api.openai.com' }, translator: { provider: 'deepseek', apiKey: '', model: 'deepseek-v4-flash', baseUrl: 'https://api.deepseek.com' } },
      subtitle: { fontSize: 16, originalColor: '#fff', translatedColor: '#ffd54f', backgroundColor: '#000', backgroundOpacity: 0.8, maxLines: 10, displayMode: 'bilingual' },
      audio: { inputDevice: 'default', vadSensitivity: 'medium', sampleRate: 16000 },
      general: { theme: 'dark', language: 'zh-CN', summaryPrompt: '', summaryTemplates: [...BUILT_IN_TEMPLATES], activeTemplateId: 'general' }
    })
  })

  it('should have 4 templates after init with built-ins', () => {
    const { settings } = useSettingsStore.getState()
    expect(settings.general.summaryTemplates).toHaveLength(4)
    expect(settings.general.activeTemplateId).toBe('general')
  })

  it('should save new template', () => {
    const newTemplate: SummaryTemplate = {
      id: 'custom-1',
      name: 'Custom Template',
      icon: 'AutoAwesomeIcon',
      systemPrompt: 'Custom prompt',
      userMessageTemplate: 'Custom: {{content}}',
      isBuiltIn: false,
    }
    useSettingsStore.getState().saveTemplate(newTemplate)
    const { settings } = useSettingsStore.getState()
    expect(settings.general.summaryTemplates).toHaveLength(5)
    expect(settings.general.summaryTemplates.find((t) => t.id === 'custom-1')).toBeDefined()
  })

  it('should update existing template', () => {
    const updated = { ...BUILT_IN_TEMPLATES[0], name: 'Updated General' }
    useSettingsStore.getState().saveTemplate(updated)
    const { settings } = useSettingsStore.getState()
    expect(settings.general.summaryTemplates.find((t) => t.id === 'general')!.name).toBe('Updated General')
  })

  it('should delete custom template', () => {
    const newTemplate: SummaryTemplate = {
      id: 'custom-del',
      name: 'To Delete',
      icon: 'AutoAwesomeIcon',
      systemPrompt: 'p',
      userMessageTemplate: '{{content}}',
      isBuiltIn: false,
    }
    useSettingsStore.getState().saveTemplate(newTemplate)
    expect(useSettingsStore.getState().settings.general.summaryTemplates).toHaveLength(5)
    useSettingsStore.getState().deleteTemplate('custom-del')
    expect(useSettingsStore.getState().settings.general.summaryTemplates).toHaveLength(4)
  })

  it('should switch active template when deleted', () => {
    // Create a custom template and set it as active
    const newTemplate: SummaryTemplate = {
      id: 'custom-active',
      name: 'Active Custom',
      icon: 'AutoAwesomeIcon',
      systemPrompt: 'p',
      userMessageTemplate: '{{content}}',
      isBuiltIn: false,
    }
    useSettingsStore.getState().saveTemplate(newTemplate)
    useSettingsStore.getState().setActiveTemplate('custom-active')
    expect(useSettingsStore.getState().settings.general.activeTemplateId).toBe('custom-active')

    // Delete the active template → should fall back to first template
    useSettingsStore.getState().deleteTemplate('custom-active')
    const { settings } = useSettingsStore.getState()
    expect(settings.general.activeTemplateId).toBe('general')
  })

  it('should set active template', () => {
    useSettingsStore.getState().setActiveTemplate('meeting')
    expect(useSettingsStore.getState().settings.general.activeTemplateId).toBe('meeting')
  })

  it('should reset built-in templates', () => {
    // First modify a built-in template
    const modified = { ...BUILT_IN_TEMPLATES[0], name: 'Modified' }
    useSettingsStore.getState().saveTemplate(modified)
    // Then add a custom one
    useSettingsStore.getState().saveTemplate({
      id: 'custom-keep',
      name: 'Keep Me',
      icon: 'AutoAwesomeIcon',
      systemPrompt: 'p',
      userMessageTemplate: '{{content}}',
      isBuiltIn: false,
    })

    // Reset built-ins
    useSettingsStore.getState().resetBuiltInTemplates()

    const { settings } = useSettingsStore.getState()
    // built-in should be restored to original name
    expect(settings.general.summaryTemplates.find((t) => t.id === 'general')!.name).toBe('通用思维导图')
    // custom should be kept
    expect(settings.general.summaryTemplates.find((t) => t.id === 'custom-keep')).toBeDefined()
    // total: 4 built-ins + 1 custom
    expect(settings.general.summaryTemplates).toHaveLength(5)
  })

  it('should persist settings on saveTemplate', () => {
    const newTemplate: SummaryTemplate = {
      id: 'persist-test',
      name: 'Persist',
      icon: 'AutoAwesomeIcon',
      systemPrompt: 'p',
      userMessageTemplate: '{{content}}',
      isBuiltIn: false,
    }
    useSettingsStore.getState().saveTemplate(newTemplate)
    expect(mockApi.store.set).toHaveBeenCalled()
  })
})

describe('Template Migration (summaryPrompt → templates)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset to default state (empty templates)
    useSettingsStore.getState().loadSettings({
      ai: {
        whisper: { provider: 'openai', apiKey: '', model: 'whisper-1', baseUrl: 'https://api.openai.com' },
        translator: { provider: 'deepseek', apiKey: '', model: 'deepseek-v4-flash', baseUrl: 'https://api.deepseek.com' }
      },
      subtitle: { fontSize: 16, originalColor: '#fff', translatedColor: '#ffd54f', backgroundColor: '#000', backgroundOpacity: 0.8, maxLines: 10, displayMode: 'bilingual' },
      audio: { inputDevice: 'default', vadSensitivity: 'medium', sampleRate: 16000 },
      general: { theme: 'dark', language: 'zh-CN', summaryPrompt: '', summaryTemplates: [], activeTemplateId: '' }
    })
  })

  it('should migrate old summaryPrompt into a custom template', async () => {
    const oldSettings = {
      ai: {
        whisper: { provider: 'openai', apiKey: '', model: 'whisper-1', baseUrl: 'https://api.openai.com' },
        translator: { provider: 'deepseek', apiKey: '', model: 'deepseek-v4-flash', baseUrl: 'https://api.deepseek.com' }
      },
      subtitle: { fontSize: 16, originalColor: '#fff', translatedColor: '#ffd54f', backgroundColor: '#000', backgroundOpacity: 0.8, maxLines: 10, displayMode: 'bilingual' as const },
      audio: { inputDevice: 'default', vadSensitivity: 'medium' as const, sampleRate: 16000 },
      general: {
        theme: 'dark' as const,
        language: 'zh-CN',
        summaryPrompt: 'Old custom prompt text',
        summaryTemplates: [],
        activeTemplateId: '',
      }
    }

    mockApi.store.get.mockResolvedValue(oldSettings)

    await useSettingsStore.getState().init()
    const { settings } = useSettingsStore.getState()

    // Should have 4 built-ins + 1 migrated custom template
    expect(settings.general.summaryTemplates).toHaveLength(5)
    expect(settings.general.activeTemplateId).toBe('general')

    const migrated = settings.general.summaryTemplates.find((t) => !t.isBuiltIn)
    expect(migrated).toBeDefined()
    expect(migrated!.name).toBe('旧自定义提示词')
    expect(migrated!.systemPrompt).toBe('Old custom prompt text')
  })

  it('should not migrate when templates already exist', async () => {
    const existingTemplate: SummaryTemplate = {
      id: 'existing',
      name: 'Existing',
      icon: 'AutoAwesomeIcon',
      systemPrompt: 'p',
      userMessageTemplate: '{{content}}',
      isBuiltIn: false,
    }

    const settingsWithTemplates = {
      ai: {
        whisper: { provider: 'openai', apiKey: '', model: 'whisper-1', baseUrl: 'https://api.openai.com' },
        translator: { provider: 'deepseek', apiKey: '', model: 'deepseek-v4-flash', baseUrl: 'https://api.deepseek.com' }
      },
      subtitle: { fontSize: 16, originalColor: '#fff', translatedColor: '#ffd54f', backgroundColor: '#000', backgroundOpacity: 0.8, maxLines: 10, displayMode: 'bilingual' as const },
      audio: { inputDevice: 'default', vadSensitivity: 'medium' as const, sampleRate: 16000 },
      general: {
        theme: 'dark' as const,
        language: 'zh-CN',
        summaryPrompt: 'Should be ignored',
        summaryTemplates: [existingTemplate],
        activeTemplateId: 'existing',
      }
    }

    mockApi.store.get.mockResolvedValue(settingsWithTemplates)

    await useSettingsStore.getState().init()
    const { settings } = useSettingsStore.getState()

    // Should keep existing template, not add built-ins during migration
    expect(settings.general.summaryTemplates).toHaveLength(1)
    expect(settings.general.summaryTemplates[0].id).toBe('existing')
    expect(settings.general.summaryPrompt).toBe('Should be ignored')
  })

  it('should initialize with empty templates when no saved settings', async () => {
    mockApi.store.get.mockResolvedValue(null)

    await useSettingsStore.getState().init()
    const { settings } = useSettingsStore.getState()

    // No saved settings → default (empty templates)
    expect(settings.general.summaryTemplates).toHaveLength(0)
  })
})
