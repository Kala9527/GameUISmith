import type { ChangeEvent, RefObject } from 'react'
import { Field } from '../../components/shared/Field'
import { UploadBox } from '../../components/shared/UploadBox'
import type { FramePreview, GenerationResult } from '../../types/workflow'

type GifMakerPanelProps = {
  busy: boolean
  gifFps: number
  setGifFps: (value: number) => void
  frameCount: number
  framePreview: FramePreview[]
  videoFile: File | null
  videoRef: RefObject<HTMLVideoElement | null>
  onFrameUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onVideoUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onGenerate: () => void
  latestGif?: GenerationResult
}

export function GifMakerPanel({
  busy,
  gifFps,
  setGifFps,
  frameCount,
  framePreview,
  videoFile,
  videoRef,
  onFrameUpload,
  onVideoUpload,
  onGenerate,
  latestGif,
}: GifMakerPanelProps) {
  return (
    <div className="feature-stack">
      <section className="panel hero-tool-panel">
        <div>
          <p className="eyebrow">GIF Forge</p>
          <h3>视频片段 / 序列帧转 GIF</h3>
          <p>可上传视频抽帧，也可直接上传图片序列帧。适合技能预览、动态按钮、角色动作小样。</p>
        </div>
        <button className="primary-button" disabled={busy} onClick={onGenerate} type="button">
          {busy ? '编码中…' : '生成 GIF'}
        </button>
      </section>

      <section className="feature-grid">
        <div className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Motion Source</p>
              <h3>动态源</h3>
            </div>
          </div>
          <div className="tool-grid vertical">
            <UploadBox
              accept="video/*"
              hint={videoFile?.name ?? '优先使用视频源'}
              onChange={onVideoUpload}
              title="上传视频片段"
            />
            <UploadBox
              accept="image/*"
              hint={`备用：已选 ${frameCount} 帧`}
              multiple
              onChange={onFrameUpload}
              title="上传图片序列帧"
            />
          </div>
          <div className="field-grid compact-two settings-row">
            <Field label="GIF FPS">
              <input
                max={24}
                min={2}
                onChange={(event) => setGifFps(Number(event.target.value))}
                type="number"
                value={gifFps}
              />
            </Field>
            <div className="mini-note">
              <strong>编码方式</strong>
              <span>浏览器本地 Canvas + 简易 GIF 编码</span>
            </div>
          </div>
          {videoFile && (
            <video className="hidden-video" controls ref={videoRef} src={URL.createObjectURL(videoFile)} />
          )}
        </div>

        <div className="panel preview-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Animation Preview</p>
              <h3>动图预览</h3>
            </div>
          </div>
          {latestGif ? (
            <img alt={latestGif.title} src={latestGif.url} />
          ) : framePreview.length ? (
            <div className="frame-strip">
              {framePreview.slice(0, 12).map((frame) => (
                <img alt="GIF 帧预览" key={frame.url} src={frame.url} />
              ))}
            </div>
          ) : (
            <div className="preview-placeholder">上传视频或图片序列帧后生成 GIF</div>
          )}
        </div>
      </section>
    </div>
  )
}
