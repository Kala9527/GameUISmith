import { useState } from 'react'
import type { AssetMode, WorkflowCard } from '../../types/workflow'

type SidebarProps = {
  mode: AssetMode
  workflows: WorkflowCard[]
  onModeChange: (mode: AssetMode) => void
}

const groups = [
  { id: 'ai', title: 'AI 生成' },
  { id: 'compose', title: '素材合成' },
] as const

export function Sidebar({ mode, workflows, onModeChange }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    ai: true,
    compose: true,
  })

  const toggleGroup = (group: string) => {
    setOpenGroups((current) => ({ ...current, [group]: !current[group] }))
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">GS</div>
        <div>
          <p className="eyebrow">Game UI Smith</p>
          <h1>游戏 UI 素材制作台</h1>
        </div>
      </div>

      <div className="workflow-groups">
        {groups.map((group) => {
          const groupWorkflows = workflows.filter((workflow) => workflow.group === group.id)
          const open = openGroups[group.id]
          return (
            <section className="workflow-group" key={group.id}>
              <button
                className="workflow-group-title"
                onClick={() => toggleGroup(group.id)}
                type="button"
              >
                <span>{group.title}</span>
                <strong>{open ? '−' : '+'}</strong>
              </button>
              {open && (
                <div className="workflow-list">
                  {groupWorkflows.map((card) => (
                    <button
                      className={`workflow-card ${mode === card.id ? 'active' : ''}`}
                      key={card.id}
                      onClick={() => onModeChange(card.id)}
                      type="button"
                    >
                      <span>{card.badge}</span>
                      <strong>{card.title}</strong>
                      <small>{card.desc}</small>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </aside>
  )
}
