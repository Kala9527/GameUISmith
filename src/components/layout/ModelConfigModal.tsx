import { useState } from 'react'
import { testTextModel } from '../../services/openaiCompatible'
import type { ProviderConfig } from '../../types/workflow'
import { Field } from '../shared/Field'

type ModelConfigModalProps = {
  config: ProviderConfig
  open: boolean
  onClose: () => void
  updateConfig: (key: keyof ProviderConfig, value: string) => void
}

const modelFields = [
  {
    key: 'promptModel',
    label: '提示词生成模型',
    hint: '用于把用户需求扩写成正向/反向/风格/尺寸配方。',
  },
  {
    key: 'textToImageModel',
    label: '文生图模型',
    hint: '只发送文字提示词、尺寸和质量参数。',
  },
  {
    key: 'imageToImageModel',
    label: '图生图模型',
    hint: '发送参考图 + 重绘要求，适合草图重绘。',
  },
  {
    key: 'imageTextToImageModel',
    label: '图文生图模型',
    hint: '发送参考图 + 文本提示，适合 UI 变体和材质替换。',
  },
  {
    key: 'textToVideoModel',
    label: '文生视频模型',
    hint: '只发送文本运动描述。',
  },
  {
    key: 'imageTextToVideoModel',
    label: '文图生视频模型',
    hint: '发送静态素材/起始图 + 动效描述。',
  },
] satisfies Array<{
  key: keyof ProviderConfig
  label: string
  hint: string
}>

export function ModelConfigModal({
  config,
  open,
  onClose,
  updateConfig,
}: ModelConfigModalProps) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')

  if (!open) {
    return null
  }

  const runTextTest = async () => {
    setTesting(true)
    setTestResult('正在测试提示词生成模型……')
    try {
      const text = await testTextModel(config)
      setTestResult(text)
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : '测试失败。')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal-card" role="dialog">
        <div className="section-title">
          <div>
            <p className="eyebrow">Model Provider</p>
            <h3>模型 API 配置</h3>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="config-fields">
          <Field label="服务名称">
            <input
              onChange={(event) => updateConfig('name', event.target.value)}
              value={config.name}
            />
          </Field>
          <Field label="Base URL">
            <input
              onChange={(event) => updateConfig('baseUrl', event.target.value)}
              placeholder="http://192.168.126.10:8080"
              value={config.baseUrl}
            />
          </Field>
          <Field label="API Key">
            <input
              onChange={(event) => updateConfig('apiKey', event.target.value)}
              placeholder="sk-..."
              type="password"
              value={config.apiKey}
            />
          </Field>
          <p className="config-hint">
            提供商保持一套：所有任务共用同一个 Base URL 和 API Key；下面只配置各 AI 任务对应的模型名称。
            程序会自动补 `/v1`，开发环境遇到 CORS/Failed to fetch 会走内置中转。
          </p>

          <div className="model-task-grid">
            {modelFields.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  onChange={(event) => updateConfig(field.key, event.target.value)}
                  value={String(config[field.key] ?? '')}
                />
                <small>{field.hint}</small>
              </Field>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="ghost-button" disabled={testing} onClick={runTextTest} type="button">
            {testing ? '测试中…' : '测试提示词生成模型'}
          </button>
          <button className="primary-button" onClick={onClose} type="button">
            完成
          </button>
        </div>

        {testResult && (
          <div className="test-result">
            <p className="eyebrow">Test Result</p>
            <pre>{testResult}</pre>
          </div>
        )}
      </section>
    </div>
  )
}
