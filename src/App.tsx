import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ResultGallery } from './components/gallery/ResultGallery'
import { ConfigPanel } from './components/layout/ConfigPanel'
import { ModelConfigModal } from './components/layout/ModelConfigModal'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { defaultConfig, stylePresets, validateImageSize, workflowCards } from './data/workflows'
import { GifMakerPanel } from './features/gif-maker/GifMakerPanel'
import { ImageEditorPanel } from './features/image-editor/ImageEditorPanel'
import { PromptGeneratorPanel } from './features/prompt-generator/PromptGeneratorPanel'
import { SliceSheetPanel } from './features/slice-sheet/SliceSheetPanel'
import { SpriteSheetPanel } from './features/sprite-sheet/SpriteSheetPanel'
import { TextToImagePanel } from './features/text-to-image/TextToImagePanel'
import { VideoGenerationPanel } from './features/video-generation/VideoGenerationPanel'
import {
  buildGifFromFrames,
  buildSliceHelperFromUrl,
  buildSpriteSheet,
  cropGridSlicesFromUrl,
  cropSliceFromUrl,
  extractVideoFrames,
} from './services/canvasAssets'
import {
  getImageModelForMode,
  getPromptModel,
  getVideoModelForMode,
  requestImageGeneration,
  requestVideoGeneration,
} from './services/openaiCompatible'
import type {
  AssetMode,
  FramePreview,
  GenerationResult,
  PromptState,
  ProviderConfig,
  SliceSelection,
  SliceShape,
} from './types/workflow'
import { fileToDataUrl, loadImage } from './utils/file'
import './App.css'

type SliceSource = 'original' | 'helper'

const isVideoMode = (mode: AssetMode) =>
  mode === 'text-to-video' || mode === 'image-text-to-video'

const isImageMode = (
  mode: AssetMode,
): mode is Extract<AssetMode, 'text-to-image' | 'image-to-image' | 'image-text-to-image'> =>
  mode === 'text-to-image' || mode === 'image-to-image' || mode === 'image-text-to-image'

function App() {
  const [mode, setMode] = useState<AssetMode>('text-to-image')
  const [prompt, setPrompt] = useState(
    '为像素风地牢游戏生成一组主菜单按钮：开始游戏、继续、设置、退出。黑曜石边框，金色符文高光，透明背景。',
  )
  const [negativePrompt, setNegativePrompt] = useState(
    '低清晰度、文字错误、水印、复杂背景、模糊边缘',
  )
  const [config, setConfig] = useState<ProviderConfig>(defaultConfig)
  const [size, setSize] = useState('1024x1024')
  const [quality, setQuality] = useState('high')
  const [style, setStyle] = useState(stylePresets[0])
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const [sourceImageUrl, setSourceImageUrl] = useState('')
  const [sliceHelperUrl, setSliceHelperUrl] = useState('')
  const [sliceSelection, setSliceSelection] = useState<SliceSelection | undefined>()
  const [sliceShape, setSliceShape] = useState<SliceShape>('rectangle')
  const [sliceSourceMode, setSliceSourceMode] = useState<SliceSource>('original')
  const [frameFiles, setFrameFiles] = useState<File[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [columns, setColumns] = useState(4)
  const [sliceRows, setSliceRows] = useState(3)
  const [sliceColumns, setSliceColumns] = useState(3)
  const [gifFps, setGifFps] = useState(10)
  const [status, setStatus] = useState('准备就绪：左侧选择功能，中间会切换到对应制作界面。')
  const [busy, setBusy] = useState(false)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [results, setResults] = useState<GenerationResult[]>([])
  const [framePreview, setFramePreview] = useState<FramePreview[]>([])
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const selectedWorkflow = useMemo(
    () => workflowCards.find((card) => card.id === mode) ?? workflowCards[0],
    [mode],
  )

  const composedPrompt = useMemo(
    () =>
      [
        prompt.trim(),
        style ? `美术风格：${style}` : '',
        negativePrompt ? `避免：${negativePrompt}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    [negativePrompt, prompt, style],
  )

  const promptState: PromptState = {
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
    composedPrompt,
  }

  const addResult = (result: Omit<GenerationResult, 'id'>) => {
    setResults((current) => [
      { ...result, id: crypto.randomUUID() },
      ...current,
    ])
  }

  const addResults = (items: Array<Omit<GenerationResult, 'id'>>) => {
    setResults((current) => [
      ...items.map((item) => ({ ...item, id: crypto.randomUUID() })),
      ...current,
    ])
  }

  const deleteResult = (id: string) => {
    setResults((current) => current.filter((result) => result.id !== id))
  }

  const updateConfig = (key: keyof ProviderConfig, value: string) => {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  const onReferenceUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setReferenceFiles(files)
    const firstFile = files[0]
    if (firstFile) {
      setSourceImageUrl(await fileToDataUrl(firstFile))
      setSliceHelperUrl('')
    }
  }

  const onFrameUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setFrameFiles(files)
    const previews = await Promise.all(
      files.map(async (file) => {
        const url = await fileToDataUrl(file)
        const image = await loadImage(url)
        return { url, width: image.naturalWidth, height: image.naturalHeight }
      }),
    )
    setFramePreview(previews)
  }

  const onVideoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    setVideoFile(event.target.files?.[0] ?? null)
  }

  const runBusyTask = async (label: string, task: () => Promise<void>) => {
    setBusy(true)
    setStatus(`正在处理：${label}……`)
    try {
      await task()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '处理失败，请检查配置。')
      return
    } finally {
      setBusy(false)
    }
  }

  const getSliceSourceUrl = () =>
    sliceSourceMode === 'helper' && sliceHelperUrl ? sliceHelperUrl : sourceImageUrl

  const generateSliceHelper = async () => {
    if (!sourceImageUrl) {
      throw new Error('请先上传 UI 整图。')
    }
    const url = await buildSliceHelperFromUrl(
      sourceImageUrl,
      sliceRows,
      sliceColumns,
      sliceSelection,
      sliceShape,
    )
    setSliceHelperUrl(url)
    addResult({
      kind: 'slice-helper',
      url,
      title: '切片辅助图',
      meta: `${sliceColumns} × ${sliceRows} 网格 · ${sliceShape === 'circle' ? '圆形标记' : '方框标记'}`,
    })
  }

  const generateSliceImage = async () => {
    const url = await cropSliceFromUrl(getSliceSourceUrl(), sliceSelection, sliceShape)
    addResult({
      kind: 'slice',
      url,
      title: '框选切片图',
      meta: `${sliceShape === 'circle' ? '圆形 / 椭圆' : '矩形'} · ${
        sliceSourceMode === 'helper' ? '来自预处理图' : '来自原图'
      }`,
    })
  }

  const generateGridSlices = async () => {
    const sourceUrl = getSliceSourceUrl()
    if (!sourceUrl) {
      throw new Error('请先上传 UI 整图。')
    }
    const slices = await cropGridSlicesFromUrl(sourceUrl, sliceRows, sliceColumns)
    addResults(
      slices.map((slice) => ({
        kind: 'slice',
        url: slice.url,
        title: `切片 R${slice.row} C${slice.column}`,
        meta: `${slice.width} × ${slice.height} · ${
          sliceSourceMode === 'helper' ? '来自预处理图' : '来自原图'
        }`,
      })),
    )
  }

  const handleGenerate = async () => {
    await runBusyTask(selectedWorkflow.title, async () => {
      const sizeValidation = validateImageSize(size)
      if (!sizeValidation.valid) {
        throw new Error(`图片尺寸不合理：${sizeValidation.message}`)
      }

      if (mode === 'sprite-sheet') {
        const url = await buildSpriteSheet(framePreview, columns)
        addResult({
          kind: 'sheet',
          url,
          title: 'Sprite Sheet',
          meta: `${framePreview.length} 帧 · ${columns} 列 · PNG`,
        })
        setStatus('精灵图已合成。')
      } else if (mode === 'video-to-gif') {
        const url = videoFile
          ? await extractVideoFrames(videoRef.current, videoFile, gifFps)
          : await buildGifFromFrames(framePreview, gifFps)
        addResult({
          kind: 'gif',
          url,
          title: 'Animated GIF',
          meta: `${gifFps} FPS · 浏览器本地编码`,
        })
        setStatus('GIF 已生成。')
      } else if (isVideoMode(mode)) {
        const url = await requestVideoGeneration({
          mode,
          config,
          prompt: composedPrompt,
          size,
        })
        addResult({
          kind: 'video',
          url,
          title: 'AI Video Job',
          meta: `${getVideoModelForMode(config, mode)} · ${selectedWorkflow.title}`,
        })
        setStatus('视频请求已提交；不同兼容服务可能需要继续轮询任务状态。')
      } else if (isImageMode(mode)) {
        const url = await requestImageGeneration({
          mode,
          config,
          prompt: composedPrompt,
          size,
          quality,
          referenceFiles,
        })
        addResult({
          kind: 'image',
          url,
          title: 'AI Image Asset',
          meta: `${getImageModelForMode(config, mode)} · ${size} · ${quality}`,
        })
        setStatus('图片素材已生成。')
      }
    })
  }

  const handleGenerateSliceHelper = async () => {
    await runBusyTask('生成切片辅助图', async () => {
      await generateSliceHelper()
      setStatus('切片辅助图已生成。')
    })
  }

  const handleGenerateSliceImage = async () => {
    await runBusyTask('生成框选切片图', async () => {
      await generateSliceImage()
      setStatus('框选切片图已生成，不满意可以在结果区删除。')
    })
  }

  const handleGenerateGridSlices = async () => {
    await runBusyTask('按辅助线批量生成切片', async () => {
      await generateGridSlices()
      setStatus(`已按 ${sliceColumns} × ${sliceRows} 辅助线生成 ${sliceColumns * sliceRows} 张切片。`)
    })
  }

  const modelForMode = () =>
    isVideoMode(mode)
      ? getVideoModelForMode(config, mode)
      : isImageMode(mode)
        ? getImageModelForMode(config, mode)
        : getPromptModel(config)

  const exportPrompt = () => {
    const payload = {
      schema: 'game-ui-smith.prompt-recipe',
      version: 2,
      createdAt: new Date().toISOString(),
      source: {
        app: 'Game UI Smith',
        workflowId: mode,
        workflowTitle: selectedWorkflow.title,
      },
      model: {
        provider: config.name,
        name: modelForMode(),
        task:
          mode === 'prompt-generator'
            ? 'prompt-generator'
            : isImageMode(mode) || isVideoMode(mode)
              ? mode
              : 'local-tool',
      },
      generation: {
        size,
        quality,
      },
      prompt: {
        positive: prompt,
        style,
        negative: negativePrompt,
        composed: composedPrompt,
      },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    addResult({
      kind: 'json',
      url: URL.createObjectURL(blob),
      title: '提示词配方 JSON',
      meta: `${selectedWorkflow.title} · 可导入复用`,
    })
  }

  const importPrompt = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    await runBusyTask('导入提示词配方', async () => {
      const text = await file.text()
      const recipe = JSON.parse(text) as {
        prompt?: string | {
          positive?: string
          style?: string
          negative?: string
          composed?: string
        }
        size?: string
        quality?: string
        generation?: {
          size?: string
          quality?: string
        }
      }

      if (typeof recipe.prompt === 'string') {
        setPrompt(recipe.prompt)
      } else if (recipe.prompt?.positive || recipe.prompt?.composed) {
        setPrompt(recipe.prompt.positive ?? recipe.prompt.composed ?? '')
        setStyle(recipe.prompt.style ?? '')
        setNegativePrompt(recipe.prompt.negative ?? '')
      } else {
        throw new Error('未识别到可导入的提示词字段。')
      }

      const importedSize = recipe.generation?.size ?? recipe.size
      if (importedSize) {
        const sizeValidation = validateImageSize(importedSize)
        if (!sizeValidation.valid) {
          throw new Error(`配方里的图片尺寸不合理：${sizeValidation.message}`)
        }
        setSize(importedSize)
      }

      const importedQuality = recipe.generation?.quality ?? recipe.quality
      if (importedQuality) {
        setQuality(importedQuality)
      }

      setStatus(`已导入提示词配方：${file.name}`)
    })
  }

  const latestByKind = (kind: GenerationResult['kind']) =>
    results.find((result) => result.kind === kind)

  const exportEditedImage = (url: string) => {
    addResult({
      kind: 'image',
      url,
      title: '图片处理结果',
      meta: 'Canvas 合成 · PNG',
    })
  }

  const renderActiveFeature = () => {
    if (mode === 'prompt-generator') {
      return (
        <PromptGeneratorPanel
          busy={busy}
          config={config}
          onModeChange={setMode}
          onRunTask={runBusyTask}
          promptState={promptState}
        />
      )
    }

    if (isImageMode(mode)) {
      return (
        <TextToImagePanel
          busy={busy}
          config={config}
          latestImage={latestByKind('image')}
          mode={mode}
          onExportPrompt={exportPrompt}
          onGenerate={handleGenerate}
          onImportPrompt={importPrompt}
          onReferenceUpload={onReferenceUpload}
          promptState={promptState}
          referenceFiles={referenceFiles}
        />
      )
    }

    if (isVideoMode(mode)) {
      return (
        <VideoGenerationPanel
          busy={busy}
          config={config}
          latestVideo={latestByKind('video')}
          mode={mode}
          onGenerate={handleGenerate}
          onReferenceUpload={onReferenceUpload}
          promptState={promptState}
          referenceFiles={referenceFiles}
        />
      )
    }

    if (mode === 'sprite-sheet') {
      return (
        <SpriteSheetPanel
          busy={busy}
          columns={columns}
          frameCount={frameFiles.length}
          framePreview={framePreview}
          latestSheet={latestByKind('sheet')}
          onFrameUpload={onFrameUpload}
          onGenerate={handleGenerate}
          setColumns={setColumns}
        />
      )
    }

    if (mode === 'slice-sheet') {
      return (
        <SliceSheetPanel
          busy={busy}
          columns={sliceColumns}
          helperUrl={sliceHelperUrl}
          latestSlice={latestByKind('slice')}
          onGenerateGridSlices={handleGenerateGridSlices}
          onGenerateHelper={handleGenerateSliceHelper}
          onGenerateSlice={handleGenerateSliceImage}
          onReferenceUpload={onReferenceUpload}
          referenceCount={referenceFiles.length}
          rows={sliceRows}
          selection={sliceSelection}
          setColumns={setSliceColumns}
          setRows={setSliceRows}
          setSelection={setSliceSelection}
          setShape={setSliceShape}
          setSourceMode={setSliceSourceMode}
          shape={sliceShape}
          sourceMode={sliceSourceMode}
          sourceUrl={sourceImageUrl}
        />
      )
    }

    if (mode === 'image-editor') {
      return <ImageEditorPanel onExportImage={exportEditedImage} />
    }

    return (
      <GifMakerPanel
        busy={busy}
        frameCount={frameFiles.length}
        framePreview={framePreview}
        gifFps={gifFps}
        latestGif={latestByKind('gif')}
        onFrameUpload={onFrameUpload}
        onGenerate={handleGenerate}
        onVideoUpload={onVideoUpload}
        setGifFps={setGifFps}
        videoFile={videoFile}
        videoRef={videoRef}
      />
    )
  }

  return (
    <main className="app-shell">
      <Sidebar mode={mode} onModeChange={setMode} workflows={workflowCards} />

      <section className="workspace">
        <Topbar status={status} workflow={selectedWorkflow} />
        {renderActiveFeature()}
      </section>

      <aside className="right-panel">
        <ConfigPanel
          config={config}
          onOpenConfig={() => setConfigModalOpen(true)}
        />
        <ResultGallery onDeleteResult={deleteResult} results={results} />
      </aside>

      <ModelConfigModal
        config={config}
        onClose={() => setConfigModalOpen(false)}
        open={configModalOpen}
        updateConfig={updateConfig}
      />
    </main>
  )
}

export default App
