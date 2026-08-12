import { useMemo, useState } from 'react'
import type { AssetMode, PromptState, ProviderConfig } from '../../types/workflow'
import type { PromptRecipeResponse } from '../../services/openaiCompatible'
import { requestPromptRecipe } from '../../services/openaiCompatible'

type PromptTargetMode = Extract<
  AssetMode,
  | 'text-to-image'
  | 'image-to-image'
  | 'image-text-to-image'
  | 'text-to-video'
  | 'image-text-to-video'
>

type PromptGeneratorPanelProps = {
  promptState: PromptState
  config: ProviderConfig
  busy: boolean
  onModeChange: (mode: AssetMode) => void
  onRunTask: (label: string, task: () => Promise<void>) => Promise<void>
}

const targetModes = [
  {
    id: 'text-to-image',
    label: '文生图',
    hint: '从文字直接生成图片，提示词要完整描述主体、构图、背景和风格。',
  },
  {
    id: 'image-to-image',
    label: '图生图',
    hint: '基于参考图重绘，提示词要说明保留结构、重绘重点和目标风格。',
  },
  {
    id: 'image-text-to-image',
    label: '图文生图',
    hint: '参考图 + 文字共同生成，提示词要强调变体方向、材质替换或 UI 调整。',
  },
  {
    id: 'text-to-video',
    label: '文生视频',
    hint: '从文字生成短视频，提示词要描述运动、镜头、节奏和循环感。',
  },
  {
    id: 'image-text-to-video',
    label: '文图生视频',
    hint: '把静态素材动起来，提示词要说明起始图如何运动、变形或发光。',
  },
] satisfies Array<{
  id: PromptTargetMode
  label: string
  hint: string
}>

const promptTabs = [
  {
    id: 'icons',
    label: '图标',
    accent: 'ICON',
    hint: '道具、技能、货币、状态图标',
  },
  {
    id: 'buttons',
    label: '按钮',
    accent: 'BTN',
    hint: '主菜单、确认、商店、战斗按钮',
  },
  {
    id: 'backgrounds',
    label: '背景',
    accent: 'BG',
    hint: '大厅、地图、弹窗背景、战斗场景',
  },
  {
    id: 'characters',
    label: '角色',
    accent: 'NPC',
    hint: '头像、NPC、职业立绘',
  },
  {
    id: 'effects',
    label: '特效',
    accent: 'FX',
    hint: '技能、粒子、光效、动效起始帧',
  },
]

const starterIdea =
  '做一组地牢游戏主菜单按钮：开始游戏、继续、设置、退出。希望是像素风、透明背景、边缘清楚，不要直接生成文字。'

const emptyRecipe: PromptRecipeResponse = {
  title: '等待生成提示词',
  positive: '',
  style: '',
  negative: '',
  size: '1024x1024',
}

export function PromptGeneratorPanel({
  promptState,
  config,
  busy,
  onModeChange,
  onRunTask,
}: PromptGeneratorPanelProps) {
  const [targetMode, setTargetMode] = useState<PromptTargetMode>('text-to-image')
  const [activeTabId, setActiveTabId] = useState(promptTabs[0].id)
  const [idea, setIdea] = useState(starterIdea)
  const [styleHint, setStyleHint] = useState('')
  const [sizeHint, setSizeHint] = useState(promptState.size)
  const [recipe, setRecipe] = useState<PromptRecipeResponse>(emptyRecipe)
  const [copyStatus, setCopyStatus] = useState('输入需求后让 AI 生成提示词，也可以手动编辑。')
  const activeTab = useMemo(
    () => promptTabs.find((tab) => tab.id === activeTabId) ?? promptTabs[0],
    [activeTabId],
  )
  const activeTarget = useMemo(
    () => targetModes.find((item) => item.id === targetMode) ?? targetModes[0],
    [targetMode],
  )
  const composedPreview = [
    recipe.positive.trim(),
    recipe.style ? `美术风格：${recipe.style}` : '',
    recipe.negative ? `避免：${recipe.negative}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const updateRecipe = (key: keyof PromptRecipeResponse, value: string) => {
    setRecipe((current) => ({ ...current, [key]: value }))
  }

  const generatePrompt = async () => {
    await onRunTask('AI 生成提示词', async () => {
      const nextRecipe = await requestPromptRecipe(config, {
        targetMode: activeTarget.id,
        targetModeTitle: activeTarget.label,
        category: activeTab.label,
        categoryHint: activeTab.hint,
        idea,
        styleHint,
        sizeHint,
      })
      setRecipe(nextRecipe)
      setCopyStatus(`AI 已生成：${nextRecipe.title}`)
    })
  }

  const applyRecipe = () => {
    promptState.setPrompt(recipe.positive)
    promptState.setStyle(recipe.style)
    promptState.setNegativePrompt(recipe.negative)
    promptState.setSize(recipe.size)
    setCopyStatus('已套用到生成参数，可切换到文生图继续生成。')
  }

  const applyAndGenerate = () => {
    applyRecipe()
    onModeChange(targetMode)
  }

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(composedPreview)
    setCopyStatus('当前编辑后的组合提示词已复制。')
  }

  return (
    <div className="prompt-lab">
      <section className="prompt-lab-hero">
        <div>
          <p className="prompt-lab-kicker">Prompt Studio</p>
          <h3>用 AI 生成提示词，也保留你的手感</h3>
          <p>
            选择素材类型，写下你想要的游戏 UI 素材；AI 会生成可编辑的正向提示、风格、反向提示和尺寸。
          </p>
        </div>
        <div className="prompt-lab-status">{copyStatus}</div>
      </section>

      <section className="prompt-lab-board">
        <nav aria-label="提示词素材类型" className="prompt-lab-tabs">
          {promptTabs.map((tab) => (
            <button
              className={activeTab.id === tab.id ? 'active' : ''}
              key={tab.id}
              onClick={() => {
                setActiveTabId(tab.id)
                setCopyStatus(`已切换到：${tab.label}`)
              }}
              type="button"
            >
              <span>{tab.accent}</span>
              <strong>{tab.label}</strong>
              <small>{tab.hint}</small>
            </button>
          ))}
        </nav>

        <div className="prompt-lab-recipes prompt-lab-inputs">
          <div className="prompt-lab-section-title">
            <p>{activeTab.label}需求输入</p>
            <small>越具体越好：主体、用途、风格、背景、是否透明、不要出现什么。</small>
          </div>

          <div className="prompt-lab-targets">
            {targetModes.map((item) => (
              <button
                className={activeTarget.id === item.id ? 'active' : ''}
                key={item.id}
                onClick={() => {
                  setTargetMode(item.id)
                  setCopyStatus(`提示词目标任务：${item.label}`)
                }}
                type="button"
              >
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </button>
            ))}
          </div>

          <label>
            <span>素材需求</span>
            <textarea
              onChange={(event) => setIdea(event.target.value)}
              placeholder="例如：做一个幻想 RPG 的金色宝箱奖励图标，透明背景，适合活动弹窗。"
              value={idea}
            />
          </label>

          <div className="prompt-lab-mini-grid">
            <label>
              <span>风格倾向（可选）</span>
              <input
                onChange={(event) => setStyleHint(event.target.value)}
                placeholder="例如：暗黑地牢、Q 版、赛博朋克 HUD"
                value={styleHint}
              />
            </label>
            <label>
              <span>尺寸倾向（可选）</span>
              <input
                onChange={(event) => setSizeHint(event.target.value)}
                placeholder="例如：1024x1024"
                value={sizeHint}
              />
            </label>
          </div>

          <button
            className="primary-button full-button"
            disabled={busy}
            onClick={generatePrompt}
            type="button"
          >
            {busy ? 'AI 生成中…' : '让 AI 生成提示词配方'}
          </button>
        </div>

        <aside className="prompt-lab-inspector">
          <div className="prompt-lab-preview-orb">{activeTab.accent}</div>
          <label className="prompt-lab-title-input">
            <span>配方标题</span>
            <input
              onChange={(event) => updateRecipe('title', event.target.value)}
              value={recipe.title}
            />
          </label>

          <div className="prompt-lab-editor">
            <label>
              <span>正向提示</span>
              <textarea
                onChange={(event) => updateRecipe('positive', event.target.value)}
                placeholder="AI 生成后会出现在这里，你也可以直接手写。"
                value={recipe.positive}
              />
            </label>
            <label>
              <span>风格描述</span>
              <input
                onChange={(event) => updateRecipe('style', event.target.value)}
                placeholder="例如：16-bit 像素风，清晰轮廓"
                value={recipe.style}
              />
            </label>
            <div className="prompt-lab-mini-grid">
              <label>
                <span>反向提示</span>
                <input
                  onChange={(event) => updateRecipe('negative', event.target.value)}
                  placeholder="例如：文字、水印、模糊边缘"
                  value={recipe.negative}
                />
              </label>
              <label>
                <span>图片尺寸</span>
                <input
                  onChange={(event) => updateRecipe('size', event.target.value)}
                  placeholder="例如：1024x1024"
                  value={recipe.size}
                />
              </label>
            </div>
          </div>

          <div className="prompt-lab-script">
            <span>组合预览</span>
            <p>{composedPreview || '生成或手写提示词后，这里会显示最终组合内容。'}</p>
          </div>

          <div className="prompt-lab-actions">
            <button className="primary-button" onClick={applyRecipe} type="button">
              套用当前编辑
            </button>
            <button className="ghost-button" onClick={applyAndGenerate} type="button">
              套用并去{activeTarget.label}
            </button>
            <button className="ghost-button" onClick={copyPrompt} type="button">
              复制组合提示词
            </button>
          </div>
        </aside>
      </section>
    </div>
  )
}
