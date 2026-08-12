import { imageSizes, qualityOptions, stylePresets, validateImageSize } from '../../data/workflows'
import type { PromptState } from '../../types/workflow'
import { Field } from './Field'

const customOption = '__custom__'

type PromptControlsProps = {
  promptState: PromptState
  title?: string
  description?: string
  compact?: boolean
}

export function PromptControls({
  promptState,
  title = '提示词与规格',
  description,
  compact = false,
}: PromptControlsProps) {
  const {
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    style,
    setStyle,
    size,
    setSize,
    quality,
    setQuality,
  } = promptState
  const selectedStyle = stylePresets.includes(style) ? style : customOption
  const selectedSize = imageSizes.includes(size) ? size : customOption
  const sizeValidation = validateImageSize(size)

  return (
    <section className="panel prompt-panel">
      <div className="section-title">
        <div>
          <p className="eyebrow">Prompt Forge</p>
          <h3>{title}</h3>
          {description && <small>{description}</small>}
        </div>
      </div>

      <Field label="主要描述" wide>
        <textarea onChange={(event) => setPrompt(event.target.value)} value={prompt} />
      </Field>

      <div className={`field-grid ${compact ? 'compact-two' : ''}`}>
        <Field label="风格预设 / 自定义">
          <div className="preset-combo">
            <select
              onChange={(event) => {
                if (event.target.value === customOption) {
                  setStyle('')
                  return
                }
                setStyle(event.target.value)
              }}
              value={selectedStyle}
            >
              <option value={customOption}>自定义风格</option>
              {stylePresets.map((preset) => (
                <option key={preset}>{preset}</option>
              ))}
            </select>
            <input
              onChange={(event) => setStyle(event.target.value)}
              placeholder="输入自定义美术风格"
              value={style}
            />
          </div>
        </Field>

        <Field label="图片尺寸 / 自定义">
          <div className="preset-combo">
            <select
              onChange={(event) => {
                if (event.target.value === customOption) {
                  setSize('')
                  return
                }
                setSize(event.target.value)
              }}
              value={selectedSize}
            >
              <option value={customOption}>自定义尺寸</option>
              {imageSizes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <input
              aria-invalid={!sizeValidation.valid}
              onChange={(event) => setSize(event.target.value)}
              placeholder="例如 1024x1024"
              value={size}
            />
            {!sizeValidation.valid && (
              <small className="field-warning">尺寸不合理：{sizeValidation.message}</small>
            )}
          </div>
        </Field>

        <Field label="质量">
          <select onChange={(event) => setQuality(event.target.value)} value={quality}>
            {qualityOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="反向提示">
          <input
            onChange={(event) => setNegativePrompt(event.target.value)}
            value={negativePrompt}
          />
        </Field>
      </div>
    </section>
  )
}
