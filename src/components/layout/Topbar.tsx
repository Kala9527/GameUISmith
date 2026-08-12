import type { WorkflowCard } from '../../types/workflow'

type TopbarProps = {
  workflow: WorkflowCard
  status: string
}

export function Topbar({ workflow, status }: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">当前功能 · {workflow.badge}</p>
        <h2>{workflow.title}</h2>
        <p>{workflow.desc}</p>
      </div>
      <div className="status-pill">{status}</div>
    </header>
  )
}
