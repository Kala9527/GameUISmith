import type { ChangeEvent } from 'react'
import { PromptControls } from '../../components/shared/PromptControls'
import { UploadBox } from '../../components/shared/UploadBox'
import { getVideoModelForMode } from '../../services/openaiCompatible'
import type { AssetMode, GenerationResult, PromptState, ProviderConfig } from '../../types/workflow'

type VideoGenerationPanelProps = {
  mode: Extract<AssetMode, 'text-to-video' | 'image-text-to-video'>
  promptState: PromptState
  config: ProviderConfig
  busy: boolean
  referenceFiles: File[]
  onReferenceUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onGenerate: () => void
  latestVideo?: GenerationResult
}

export function VideoGenerationPanel({
  mode,
  promptState,
  config,
  busy,
  referenceFiles,
  onReferenceUpload,
  onGenerate,
  latestVideo,
}: VideoGenerationPanelProps) {
  return (
    <div className="feature-stack">
      <PromptControls
        compact
        description="描述动态背景、粒子特效、UI 入场动画或宝箱开启这类短片段。"
        promptState={promptState}
        title={mode === 'text-to-video' ? '文生视频片段' : '文图生视频片段'}
      />

      <section className="feature-grid video-workbench">
        <div className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Motion Setup</p>
              <h3>动态参数</h3>
            </div>
          </div>
          <div className="capability-list">
            <div>
              <span>视频模型</span>
              <small>{getVideoModelForMode(config, mode)}</small>
            </div>
            <div>
              <span>推荐用途</span>
              <small>循环背景、技能特效、UI 弹窗入场、场景氛围片段</small>
            </div>
            <div>
              <span>任务模式</span>
              <small>多数视频模型是异步任务，后续可扩展轮询状态</small>
            </div>
          </div>
          {mode === 'image-text-to-video' && (
            <UploadBox
              accept="image/*"
              hint={`已选 ${referenceFiles.length} 张静态素材`}
              multiple
              onChange={onReferenceUpload}
              title="上传起始图 / 风格参考"
            />
          )}
        </div>

        <div className="panel preview-panel wide-preview">
          <div className="section-title">
            <div>
              <p className="eyebrow">Video Preview</p>
              <h3>视频结果</h3>
            </div>
          </div>
          {latestVideo?.url.startsWith('http') ? (
            <video controls src={latestVideo.url} />
          ) : latestVideo ? (
            <div className="job-card">{latestVideo.url}</div>
          ) : (
            <div className="preview-placeholder">提交后会显示视频地址或异步任务 ID</div>
          )}
        </div>
      </section>

      <section className="action-strip">
        <button className="primary-button" disabled={busy} onClick={onGenerate} type="button">
          {busy ? '提交中…' : '调用视频模型生成'}
        </button>
      </section>
    </div>
  )
}
