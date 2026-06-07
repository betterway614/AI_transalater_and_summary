import {
  Box, Typography, List, ListItem, ListItemText, ListItemIcon,
  ListItemButton, IconButton, Chip, Tooltip, Button
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import GroupsIcon from '@mui/icons-material/Groups'
import SchoolIcon from '@mui/icons-material/School'
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import type { SummaryTemplate } from '@shared/types'
import TemplateEditor from './TemplateEditor'

const ICON_MAP: Record<string, React.ElementType> = {
  AccountTreeIcon,
  GroupsIcon,
  SchoolIcon,
  RecordVoiceOverIcon,
  AutoAwesomeIcon,
}

export default function TemplateManager() {
  const settings = useSettingsStore((s) => s.settings)
  const saveTemplate = useSettingsStore((s) => s.saveTemplate)
  const deleteTemplate = useSettingsStore((s) => s.deleteTemplate)
  const setActiveTemplate = useSettingsStore((s) => s.setActiveTemplate)
  const resetBuiltInTemplates = useSettingsStore((s) => s.resetBuiltInTemplates)

  const templates = settings.general.summaryTemplates
  const activeId = settings.general.activeTemplateId

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SummaryTemplate | null>(null)

  const handleEdit = (template: SummaryTemplate) => {
    setEditingTemplate(template)
    setEditorOpen(true)
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setEditorOpen(true)
  }

  const handleSave = (template: SummaryTemplate) => {
    if (editingTemplate?.isBuiltIn) {
      // 编辑内置模板 → 另存为新模板
      saveTemplate({ ...template, id: crypto.randomUUID(), isBuiltIn: false })
    } else {
      saveTemplate(template)
    }
    setEditorOpen(false)
    setEditingTemplate(null)
  }

  const handleClose = () => {
    setEditorOpen(false)
    setEditingTemplate(null)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          提示词模板（选择生成总结时使用的模板）
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="重置内置模板为默认">
            <IconButton size="small" onClick={resetBuiltInTemplates}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            sx={{ textTransform: 'none', fontSize: 12 }}
          >
            新建
          </Button>
        </Box>
      </Box>

      {templates.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
          暂无模板，请新建或重置内置模板
        </Typography>
      ) : (
        <List dense disablePadding>
          {templates.map((t) => {
            const IconComp = ICON_MAP[t.icon] || AutoAwesomeIcon
            const isActive = t.id === activeId
            return (
              <ListItem
                key={t.id}
                disablePadding
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title={t.isBuiltIn ? '编辑（将另存为新模板）' : '编辑'}>
                      <IconButton size="small" onClick={() => handleEdit(t)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {!t.isBuiltIn && (
                      <Tooltip title="删除">
                        <IconButton size="small" onClick={() => deleteTemplate(t.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                }
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemButton
                  selected={isActive}
                  onClick={() => setActiveTemplate(t.id)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <IconComp fontSize="small" color={isActive ? 'primary' : 'inherit'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={isActive ? 700 : 400}>
                          {t.name}
                        </Typography>
                        {t.isBuiltIn && (
                          <Chip label="内置" size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                        )}
                      </Box>
                    }
                    secondary={t.userMessageTemplate.slice(0, 50)}
                    secondaryTypographyProps={{ fontSize: 11, noWrap: true }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      )}

      <TemplateEditor
        open={editorOpen}
        template={editingTemplate}
        onSave={handleSave}
        onClose={handleClose}
      />
    </Box>
  )
}
