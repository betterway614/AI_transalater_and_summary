import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField
} from '@mui/material'
import { useState, useEffect } from 'react'
import type { SummaryTemplate } from '@shared/types'

interface TemplateEditorProps {
  open: boolean
  template: SummaryTemplate | null
  onSave: (template: SummaryTemplate) => void
  onClose: () => void
}

function emptyTemplate(): SummaryTemplate {
  return {
    id: crypto.randomUUID(),
    name: '',
    icon: 'AutoAwesomeIcon',
    systemPrompt: '',
    userMessageTemplate: '请对以下内容生成总结：\n\n{{content}}',
    isBuiltIn: false,
  }
}

export default function TemplateEditor({ open, template, onSave, onClose }: TemplateEditorProps) {
  const [name, setName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userMessageTemplate, setUserMessageTemplate] = useState('')

  useEffect(() => {
    if (template) {
      setName(template.name)
      setSystemPrompt(template.systemPrompt)
      setUserMessageTemplate(template.userMessageTemplate)
    } else {
      const empty = emptyTemplate()
      setName(empty.name)
      setSystemPrompt(empty.systemPrompt)
      setUserMessageTemplate(empty.userMessageTemplate)
    }
  }, [template, open])

  const handleSave = () => {
    if (!name.trim()) return
    const id = template?.id || crypto.randomUUID()
    const isBuiltIn = template?.isBuiltIn || false
    onSave({
      id,
      name: name.trim(),
      icon: template?.icon || 'AutoAwesomeIcon',
      systemPrompt,
      userMessageTemplate,
      isBuiltIn,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{template?.isBuiltIn ? `编辑预设: ${template.name}（将另存为新模板）` : template?.id ? '编辑模板' : '新建模板'}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          size="small"
          label="模板名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2, mt: 1 }}
          required
        />
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={4}
          maxRows={8}
          label="系统提示词 (System Prompt)"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          maxRows={4}
          label="用户消息模板"
          helperText="使用 {{content}} 作为待总结内容的占位符"
          value={userMessageTemplate}
          onChange={(e) => setUserMessageTemplate(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave} variant="contained" disabled={!name.trim()}>
          保存{template?.isBuiltIn ? '为新模板' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
