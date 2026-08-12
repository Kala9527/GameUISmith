import type { ChangeEvent } from 'react'
import { Field } from '../../components/shared/Field'
import { UploadBox } from '../../components/shared/UploadBox'
import type { FramePreview, GenerationResult } from '../../types/workflow'

type SpriteSheetPanelProps = {
  busy: boolean
  columns: number
  setColumns: (value: number) => void
  frameCount: number
  framePreview: FramePreview[]
  onFrameUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onGenerate: () => void
  latestSheet?: GenerationResult
}

export function SpriteSheetPanel({
  busy,
  columns,
  setColumns,
  frameCount,
  framePreview,
  onFrameUpload,
  onGenerate,
  latestSheet,
}: SpriteSheetPanelProps) {
  return (
    <div className="feature-stack">
      <section className="panel hero-tool-panel">
        <div>
          <p className="eyebrow">Sprite Composer</p>
          <h3>精灵图 / 序列帧合成</h3>
          <p>上传角色动作或特效序列帧，自动按列数拼成引擎可用的 Sprite Sheet。</p>
        </div>
        <button className="primary-button" disabled={busy} onClick={onGenerate} type="button">
          {busy ? '合成中…' : '合成 Sprite Sheet'}
        </button>
      </section>

      <section className="feature-grid">
        <div className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Frames</p>
              <h3>序列帧输入</h3>
            </div>
          </div>
          <UploadBox
            accept="image/*"
            hint={`已选 ${frameCount} 帧`}
            multiple
            onChange={onFrameUpload}
            title="上传 PNG 序列帧"
          />
          <div className="field-grid compact-two settings-row">
            <Field label="每行列数">
              <input
                min={1}
                onChange={(event) => setColumns(Number(event.target.value))}
                type="number"
                value={columns}
              />
            </Field>
            <div className="mini-note">
              <strong>输出</strong>
              <span>透明 PNG · image-rendering: pixelated</span>
            </div>
          </div>
        </div>

        <div className="panel preview-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Sheet Preview</p>
              <h3>合成预览</h3>
            </div>
          </div>
          {latestSheet ? (
            <img alt={latestSheet.title} src={latestSheet.url} />
          ) : framePreview.length ? (
            <div className="frame-strip">
              {framePreview.slice(0, 12).map((frame) => (
                <img alt="序列帧预览" key={frame.url} src={frame.url} />
              ))}
            </div>
          ) : (
            <div className="preview-placeholder">上传帧后先显示帧预览，合成后显示整张 Sheet</div>
          )}
        </div>
      </section>
    </div>
  )
}
