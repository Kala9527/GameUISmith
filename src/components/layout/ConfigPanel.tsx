import type { ProviderConfig } from '../../types/workflow'

type ConfigPanelProps = {
  config: ProviderConfig
  onOpenConfig: () => void
}

const taskModelSummary = [
  ['提示词生成', 'promptModel'],
  ['文生图', 'textToImageModel'],
  ['图生图', 'imageToImageModel'],
  ['图文生图', 'imageTextToImageModel'],
  ['文生视频', 'textToVideoModel'],
  ['文图生视频', 'imageTextToVideoModel'],
] satisfies Array<[string, keyof ProviderConfig]>

export function ConfigPanel({ config, onOpenConfig }: ConfigPanelProps) {
  return (
    <section className="config-panel">
      <section className="panel provider-summary">
        <p className="eyebrow">Provider</p>
        <h3>模型连接</h3>
        <button className="primary-button full-button" onClick={onOpenConfig} type="button">
          模型配置
        </button>
        <div className="provider-card">
          <span>服务</span>
          <strong>{config.name || '未命名服务'}</strong>
        </div>
        <div className="provider-card">
          <span>Base URL</span>
          <strong>{config.baseUrl || '未配置'}</strong>
        </div>
        <div className="capability-list">
          {taskModelSummary.map(([label, key]) => (
            <div key={key}>
              <span>{label}</span>
              <small>{String(config[key] || '未配置')}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}
