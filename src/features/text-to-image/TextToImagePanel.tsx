import type { ChangeEvent } from 'react'
import { PromptControls } from '../../components/shared/PromptControls'
import { UploadBox } from '../../components/shared/UploadBox'
import { getImageModelForMode } from '../../services/openaiCompatible'
import type { AssetMode, GenerationResult, PromptState, ProviderConfig } from '../../types/workflow'

type TextToImagePanelProps = {
  mode: Extract<AssetMode, 'text-to-image' | 'image-to-image' | 'image-text-to-image'>
  promptState: PromptState
  config: ProviderConfig
  busy: boolean
  referenceFiles: File[]
  onReferenceUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onGenerate: () => void
  onExportPrompt: () => void
  onImportPrompt: (event: ChangeEvent<HTMLInputElement>) => void
  latestImage?: GenerationResult
}

const copyByMode = {
  'text-to-image': {
    title: '文生图素材生成',
    desc: '适合按钮、图标、道具、角色头像、UI 背景等从零生成的素材。',
  },
  'image-to-image': {
    title: '图生图重绘',
    desc: '上传草图或截图，再用提示词指定目标风格。当前预留 OpenAI 兼容扩展位。',
    uploadTitle: '上传草图 / 参考图',
    uploadHint: '建议上传 1-4 张',
  },
  'image-text-to-image': {
    title: '图文生图变体',
    desc: '参考图和提示词会一起送入 Responses 图像生成流程，适合做 UI 变体。',
    uploadTitle: '上传参考图',
    uploadHint: 'Responses input_image',
  },
}

const uploadCopyByMode = {
  'image-to-image': {
    uploadTitle: '上传草图 / 参考图',
    uploadHint: '建议上传 1-4 张',
  },
  'image-text-to-image': {
    uploadTitle: '上传参考图',
    uploadHint: 'Responses input_image',
  },
}

export function TextToImagePanel({
  mode,
  promptState,
  config,
  busy,
  referenceFiles,
  onReferenceUpload,
  onGenerate,
  onExportPrompt,
  onImportPrompt,
  latestImage,
}: TextToImagePanelProps) {
  const copy = copyByMode[mode]
  const supportsReferenceUpload = mode !== 'text-to-image'
  const uploadCopy = mode === 'text-to-image' ? undefined : uploadCopyByMode[mode]

  return (
    <div className="feature-stack">
      <PromptControls description={copy.desc} promptState={promptState} title={copy.title} />

      <section className="feature-grid">
        <div className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">{supportsReferenceUpload ? 'Reference' : 'Model Setup'}</p>
              <h3>{supportsReferenceUpload ? '参考输入' : '纯文本生成'}</h3>
            </div>
          </div>
          {uploadCopy ? (
            <UploadBox
              accept="image/*"
              hint={`${uploadCopy.uploadHint} · 已选 ${referenceFiles.length} 个`}
              multiple
              onChange={onReferenceUpload}
              title={uploadCopy.uploadTitle}
            />
          ) : (
            <div className="mini-note">
              <strong>文生图不使用参考图</strong>
              <span>当前模式只发送提示词、尺寸和质量参数；需要上传图片时请切换到“图生图”或“图文生图”。</span>
            </div>
          )}
          <div className="mini-note">
            <strong>模型</strong>
            <span>{getImageModelForMode(config, mode)}</span>
          </div>
        </div>

        <div className="panel preview-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Canvas Preview</p>
              <h3>图像预览</h3>
            </div>
          </div>
          {latestImage ? (
            <img alt={latestImage.title} src={latestImage.url} />
          ) : (
            <div className="preview-placeholder">生成后的 UI 素材会出现在这里</div>
          )}
        </div>
      </section>

      <section className="action-strip">
        <label className="ghost-button import-button">
          导入提示词配方
          <input accept="application/json,.json" onChange={onImportPrompt} type="file" />
        </label>
        <button className="ghost-button" onClick={onExportPrompt} type="button">
          保存提示词配方
        </button>
        <button className="primary-button" disabled={busy} onClick={onGenerate} type="button">
          {busy ? '生成中…' : '调用图像模型生成'}
        </button>
      </section>
    </div>
  )
}
