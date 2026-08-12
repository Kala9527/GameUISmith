import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, PointerEvent } from 'react'
import { Field } from '../../components/shared/Field'
import { trimTransparentCanvas } from '../../services/canvasAssets'
import { loadImage } from '../../utils/file'

type ImageEditorPanelProps = {
  onExportImage: (url: string) => void
}

type ImageLayer = {
  id: string
  type: 'image'
  url: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  flipX: boolean
  flipY: boolean
}

type TextLayer = {
  id: string
  type: 'text'
  text: string
  x: number
  y: number
  color: string
  fontSize: number
}

type FillLayer = {
  id: string
  type: 'fill'
  x: number
  y: number
  width: number
  height: number
  color: string
}

type EditorLayer = ImageLayer | TextLayer | FillLayer

type EditorState = {
  background: string
  layers: EditorLayer[]
}

type SelectionRegion = {
  x: number
  y: number
  width: number
  height: number
}

type MoveInteraction = {
  type: 'move'
  layerId: string
  offsetX: number
  offsetY: number
}

type RegionInteraction = {
  type: 'region'
  startX: number
  startY: number
}

type InteractionState = MoveInteraction | RegionInteraction
type EditorTool = 'select' | 'region'

const canvasWidth = 1024
const canvasHeight = 1024

const emptyState: EditorState = {
  background: 'transparent',
  layers: [],
}

const normalizeRegion = (startX: number, startY: number, currentX: number, currentY: number): SelectionRegion => ({
  x: Math.max(0, Math.min(startX, currentX)),
  y: Math.max(0, Math.min(startY, currentY)),
  width: Math.min(canvasWidth, Math.max(startX, currentX)) - Math.max(0, Math.min(startX, currentX)),
  height: Math.min(canvasHeight, Math.max(startY, currentY)) - Math.max(0, Math.min(startY, currentY)),
})

const getTextBounds = (layer: TextLayer): SelectionRegion => {
  const width = Math.max(layer.fontSize, layer.text.length * layer.fontSize * 0.56)
  return {
    x: layer.x - width / 2,
    y: layer.y - layer.fontSize * 0.62,
    width,
    height: layer.fontSize * 1.18,
  }
}

const rotatePoint = (x: number, y: number, radians: number) => ({
  x: x * Math.cos(radians) - y * Math.sin(radians),
  y: x * Math.sin(radians) + y * Math.cos(radians),
})

const selectedLayerName = (layer: EditorLayer | undefined) => {
  if (!layer) {
    return '未选中图层'
  }
  if (layer.type === 'image') {
    return '图片图层'
  }
  if (layer.type === 'text') {
    return '文字图层'
  }
  return '颜色填充图层'
}

export function ImageEditorPanel({ onExportImage }: ImageEditorPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageCache = useRef(new Map<string, HTMLImageElement>())
  const [editorState, setEditorState] = useState<EditorState>(emptyState)
  const [history, setHistory] = useState<EditorState[]>([])
  const [future, setFuture] = useState<EditorState[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState('')
  const [interaction, setInteraction] = useState<InteractionState | null>(null)
  const [selectionRegion, setSelectionRegion] = useState<SelectionRegion | null>(null)
  const [tool, setTool] = useState<EditorTool>('select')
  const [fillColor, setFillColor] = useState('#20263a')
  const [text, setText] = useState('Start')
  const [textColor, setTextColor] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(72)
  const [status, setStatus] = useState('拖入生成结果，或使用左侧工具开始作图。')

  const selectedLayer = useMemo(
    () => editorState.layers.find((layer) => layer.id === selectedLayerId),
    [editorState.layers, selectedLayerId],
  )

  const selectedImageLayer = selectedLayer?.type === 'image' ? selectedLayer : undefined
  const hasValidRegion = Boolean(selectionRegion && selectionRegion.width > 4 && selectionRegion.height > 4)

  const pushHistory = () => {
    setHistory((current) => [...current, structuredClone(editorState)])
    setFuture([])
  }

  const drawImageLayer = async (context: CanvasRenderingContext2D, layer: ImageLayer) => {
    let image = imageCache.current.get(layer.url)
    if (!image) {
      image = await loadImage(layer.url)
      imageCache.current.set(layer.url, image)
    }

    context.save()
    context.imageSmoothingEnabled = false
    context.translate(layer.x + layer.width / 2, layer.y + layer.height / 2)
    context.rotate((layer.rotation * Math.PI) / 180)
    context.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1)
    context.drawImage(image, -layer.width / 2, -layer.height / 2, layer.width, layer.height)
    context.restore()
  }

  const drawTextLayer = (context: CanvasRenderingContext2D, layer: TextLayer) => {
    context.save()
    context.font = `800 ${layer.fontSize}px Inter, system-ui, sans-serif`
    context.fillStyle = layer.color
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.shadowColor = 'rgba(0, 0, 0, 0.45)'
    context.shadowBlur = 18
    context.fillText(layer.text, layer.x, layer.y)
    context.restore()
  }

  const drawFillLayer = (context: CanvasRenderingContext2D, layer: FillLayer) => {
    context.save()
    context.fillStyle = layer.color
    context.fillRect(layer.x, layer.y, layer.width, layer.height)
    context.restore()
  }

  const drawLayer = async (context: CanvasRenderingContext2D, layer: EditorLayer) => {
    if (layer.type === 'image') {
      await drawImageLayer(context, layer)
      return
    }
    if (layer.type === 'text') {
      drawTextLayer(context, layer)
      return
    }
    drawFillLayer(context, layer)
  }

  const drawSelectionOutline = (context: CanvasRenderingContext2D, layer: EditorLayer) => {
    context.save()
    context.strokeStyle = '#7cffd4'
    context.lineWidth = 4
    context.setLineDash([10, 8])

    if (layer.type === 'image') {
      context.translate(layer.x + layer.width / 2, layer.y + layer.height / 2)
      context.rotate((layer.rotation * Math.PI) / 180)
      context.strokeRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height)
    } else {
      const bounds = layer.type === 'text' ? getTextBounds(layer) : layer
      context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }

    context.restore()
  }

  const drawMarquee = (context: CanvasRenderingContext2D, region: SelectionRegion) => {
    context.save()
    context.fillStyle = 'rgba(124, 255, 212, 0.12)'
    context.strokeStyle = '#ffc75f'
    context.lineWidth = 3
    context.setLineDash([12, 8])
    context.fillRect(region.x, region.y, region.width, region.height)
    context.strokeRect(region.x, region.y, region.width, region.height)
    context.restore()
  }

  const renderToCanvas = async (
    state: EditorState,
    targetCanvas: HTMLCanvasElement,
    options: { showHelpers?: boolean } = {},
  ) => {
    const context = targetCanvas.getContext('2d')
    if (!context) {
      return
    }

    context.clearRect(0, 0, targetCanvas.width, targetCanvas.height)
    if (state.background !== 'transparent') {
      context.fillStyle = state.background
      context.fillRect(0, 0, targetCanvas.width, targetCanvas.height)
    }

    for (const layer of state.layers) {
      await drawLayer(context, layer)
    }

    if (options.showHelpers) {
      const selected = state.layers.find((layer) => layer.id === selectedLayerId)
      if (selected) {
        drawSelectionOutline(context, selected)
      }
      if (selectionRegion && selectionRegion.width > 2 && selectionRegion.height > 2) {
        drawMarquee(context, selectionRegion)
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    void renderToCanvas(editorState, canvas, { showHelpers: true })
  }, [editorState, selectedLayerId, selectionRegion])

  const canvasPoint = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return { x: 0, y: 0 }
    }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const hitTestImage = (layer: ImageLayer, x: number, y: number) => {
    const centerX = layer.x + layer.width / 2
    const centerY = layer.y + layer.height / 2
    const radians = (-layer.rotation * Math.PI) / 180
    const local = rotatePoint(x - centerX, y - centerY, radians)
    return Math.abs(local.x) <= layer.width / 2 && Math.abs(local.y) <= layer.height / 2
  }

  const hitTest = (x: number, y: number) => {
    for (const layer of [...editorState.layers].reverse()) {
      if (layer.type === 'image') {
        if (hitTestImage(layer, x, y)) {
          return layer
        }
      } else {
        const bounds = layer.type === 'text' ? getTextBounds(layer) : layer
        if (
          x >= bounds.x &&
          x <= bounds.x + bounds.width &&
          y >= bounds.y &&
          y <= bounds.y + bounds.height
        ) {
          return layer
        }
      }
    }
    return undefined
  }

  const updateSelectedLayer = (updater: (layer: EditorLayer) => EditorLayer, successStatus: string) => {
    if (!selectedLayerId) {
      setStatus('请先在画布中选中一个图层。')
      return
    }
    pushHistory()
    setEditorState((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === selectedLayerId ? updater(layer) : layer)),
    }))
    setStatus(successStatus)
  }

  const fillCanvas = () => {
    pushHistory()
    setEditorState((current) => ({ ...current, background: fillColor }))
    setStatus('已填充整个画布背景色。')
  }

  const fillSelectedRegion = () => {
    if (!selectionRegion || selectionRegion.width < 4 || selectionRegion.height < 4) {
      setStatus('请先切换到“框选区域”，在画布上拖拽出一个区域。')
      return
    }

    pushHistory()
    const layer: FillLayer = {
      id: crypto.randomUUID(),
      type: 'fill',
      x: selectionRegion.x,
      y: selectionRegion.y,
      width: selectionRegion.width,
      height: selectionRegion.height,
      color: fillColor,
    }
    setEditorState((current) => ({ ...current, layers: [...current.layers, layer] }))
    setSelectedLayerId(layer.id)
    setStatus('已在框选区域添加颜色填充图层。')
  }

  const addTextLayer = (x = canvasWidth / 2, y = canvasHeight / 2, size = fontSize) => {
    pushHistory()
    const layer: TextLayer = {
      id: crypto.randomUUID(),
      type: 'text',
      text,
      x,
      y,
      color: textColor,
      fontSize: size,
    }
    setEditorState((current) => ({ ...current, layers: [...current.layers, layer] }))
    setSelectedLayerId(layer.id)
    setStatus('已添加文字图层，可点选、拖动、重叠摆放。')
  }

  const addTextToSelectedRegion = () => {
    if (!selectionRegion || selectionRegion.width < 4 || selectionRegion.height < 4) {
      setStatus('请先切换到“框选区域”，在画布上拖拽出一个区域。')
      return
    }
    addTextLayer(
      selectionRegion.x + selectionRegion.width / 2,
      selectionRegion.y + selectionRegion.height / 2,
      Math.max(12, Math.min(fontSize, selectionRegion.height * 0.62, selectionRegion.width / Math.max(1, text.length) * 1.5)),
    )
  }

  const addImageLayer = async (url: string, clientX?: number, clientY?: number) => {
    const image = await loadImage(url)
    imageCache.current.set(url, image)
    const scale = Math.min(0.42, 360 / Math.max(image.naturalWidth, image.naturalHeight))
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    const point =
      clientX === undefined || clientY === undefined
        ? { x: canvasWidth / 2, y: canvasHeight / 2 }
        : canvasPoint({ clientX, clientY })

    pushHistory()
    const layer: ImageLayer = {
      id: crypto.randomUUID(),
      type: 'image',
      url,
      x: point.x - width / 2,
      y: point.y - height / 2,
      width,
      height,
      rotation: 0,
      flipX: false,
      flipY: false,
    }
    setEditorState((current) => ({ ...current, layers: [...current.layers, layer] }))
    setSelectedLayerId(layer.id)
    setStatus('已添加图片图层。图片可以相互重叠，也可以继续拖动、缩放、旋转和镜像。')
  }

  const addUploadedImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    await addImageLayer(URL.createObjectURL(file))
    event.target.value = ''
  }

  const undo = () => {
    const previous = history.at(-1)
    if (!previous) {
      return
    }
    setFuture((items) => [structuredClone(editorState), ...items])
    setHistory((items) => items.slice(0, -1))
    setEditorState(previous)
    setSelectedLayerId('')
    setSelectionRegion(null)
    setStatus('已返回上一步。')
  }

  const redo = () => {
    const next = future[0]
    if (!next) {
      return
    }
    setHistory((items) => [...items, structuredClone(editorState)])
    setFuture((items) => items.slice(1))
    setEditorState(next)
    setSelectedLayerId('')
    setSelectionRegion(null)
    setStatus('已重做。')
  }

  const exportCanvas = async (trimVisible: boolean) => {
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = canvasWidth
    outputCanvas.height = canvasHeight
    await renderToCanvas(editorState, outputCanvas, { showHelpers: false })
    const output = trimVisible ? trimTransparentCanvas(outputCanvas) : outputCanvas
    onExportImage(output.toDataURL('image/png'))
    setStatus(trimVisible ? '已只导出可见内容，多余透明空白已裁掉。' : '已导出完整画布。')
  }

  const dropImage = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const resultUrl = event.dataTransfer.getData('application/game-ui-smith-result')
    const plainUrl = event.dataTransfer.getData('text/uri-list')
    const file = event.dataTransfer.files?.[0]

    if (resultUrl || plainUrl) {
      await addImageLayer(resultUrl || plainUrl, event.clientX, event.clientY)
      return
    }

    if (file && file.type.startsWith('image/')) {
      await addImageLayer(URL.createObjectURL(file), event.clientX, event.clientY)
    }
  }

  const startInteraction = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event)
    event.currentTarget.setPointerCapture(event.pointerId)

    if (tool === 'region') {
      setSelectedLayerId('')
      setSelectionRegion({ x: point.x, y: point.y, width: 0, height: 0 })
      setInteraction({ type: 'region', startX: point.x, startY: point.y })
      return
    }

    const layer = hitTest(point.x, point.y)
    if (!layer) {
      setSelectedLayerId('')
      setInteraction(null)
      return
    }

    pushHistory()
    setSelectedLayerId(layer.id)
    setSelectionRegion(null)
    setInteraction({
      type: 'move',
      layerId: layer.id,
      offsetX: point.x - layer.x,
      offsetY: point.y - layer.y,
    })
  }

  const moveInteraction = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!interaction) {
      return
    }

    const point = canvasPoint(event)
    if (interaction.type === 'region') {
      setSelectionRegion(normalizeRegion(interaction.startX, interaction.startY, point.x, point.y))
      return
    }

    setEditorState((current) => ({
      ...current,
      layers: current.layers.map((layer) =>
        layer.id === interaction.layerId
          ? { ...layer, x: point.x - interaction.offsetX, y: point.y - interaction.offsetY }
          : layer,
      ),
    }))
  }

  const stopInteraction = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (interaction?.type === 'region' && selectionRegion && selectionRegion.width > 4 && selectionRegion.height > 4) {
      setStatus('已框选区域，可以填充颜色或把文字放入该区域。')
    }
    setInteraction(null)
  }

  const canvasClick = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.altKey && tool === 'select') {
      const point = canvasPoint(event)
      addTextLayer(point.x, point.y)
    }
  }

  const scaleSelectedImage = (factor: number) => {
    updateSelectedLayer((layer) => {
      if (layer.type !== 'image') {
        return layer
      }
      const centerX = layer.x + layer.width / 2
      const centerY = layer.y + layer.height / 2
      const width = Math.max(12, layer.width * factor)
      const height = Math.max(12, layer.height * factor)
      return {
        ...layer,
        width,
        height,
        x: centerX - width / 2,
        y: centerY - height / 2,
      }
    }, factor > 1 ? '已放大选中图片。' : '已缩小选中图片。')
  }

  const rotateSelectedImage = (degrees: number) => {
    updateSelectedLayer((layer) => {
      if (layer.type !== 'image') {
        return layer
      }
      return { ...layer, rotation: (layer.rotation + degrees + 360) % 360 }
    }, degrees > 0 ? '已顺时针旋转选中图片。' : '已逆时针旋转选中图片。')
  }

  const flipSelectedImage = (axis: 'x' | 'y') => {
    updateSelectedLayer((layer) => {
      if (layer.type !== 'image') {
        return layer
      }
      return axis === 'x' ? { ...layer, flipX: !layer.flipX } : { ...layer, flipY: !layer.flipY }
    }, axis === 'x' ? '已水平镜像选中图片。' : '已垂直镜像选中图片。')
  }

  const deleteSelectedLayer = () => {
    if (!selectedLayerId) {
      setStatus('请先选中要删除的图层。')
      return
    }
    pushHistory()
    setEditorState((current) => ({ ...current, layers: current.layers.filter((layer) => layer.id !== selectedLayerId) }))
    setSelectedLayerId('')
    setStatus('已删除选中图层。')
  }

  const bringForward = () => {
    if (!selectedLayerId) {
      setStatus('请先选中一个图层。')
      return
    }
    pushHistory()
    setEditorState((current) => {
      const index = current.layers.findIndex((layer) => layer.id === selectedLayerId)
      if (index < 0 || index === current.layers.length - 1) {
        return current
      }
      const layers = [...current.layers]
      const [layer] = layers.splice(index, 1)
      layers.splice(index + 1, 0, layer)
      return { ...current, layers }
    })
    setStatus('已将选中图层上移一层。')
  }

  const sendBackward = () => {
    if (!selectedLayerId) {
      setStatus('请先选中一个图层。')
      return
    }
    pushHistory()
    setEditorState((current) => {
      const index = current.layers.findIndex((layer) => layer.id === selectedLayerId)
      if (index <= 0) {
        return current
      }
      const layers = [...current.layers]
      const [layer] = layers.splice(index, 1)
      layers.splice(index - 1, 0, layer)
      return { ...current, layers }
    })
    setStatus('已将选中图层下移一层。')
  }

  return (
    <div className="feature-stack image-editor">
      <section className="panel hero-tool-panel">
        <div>
          <p className="eyebrow">Image Editor</p>
          <h3>图片处理</h3>
          <p>拖入生成结果后会变成独立图层，支持重叠拼接、框选区域、图层变换和透明边缘裁剪导出。</p>
        </div>
        <div className="button-cluster export-actions">
          <button className="ghost-button" onClick={() => void exportCanvas(false)} type="button">
            导出完整画布
          </button>
          <button className="primary-button" onClick={() => void exportCanvas(true)} type="button">
            只导出可见部分
          </button>
        </div>
      </section>

      <section className="image-editor-layout">
        <aside className="panel editor-toolbar">
          <p className="eyebrow">Tools</p>
          <h3>图片处理工具</h3>

          <div className="tool-mode-toggle">
            <button className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')} type="button">
              选择/移动
            </button>
            <button className={tool === 'region' ? 'active' : ''} onClick={() => setTool('region')} type="button">
              框选区域
            </button>
          </div>

          <Field label="颜色填充">
            <input onChange={(event) => setFillColor(event.target.value)} type="color" value={fillColor} />
          </Field>
          <div className="button-cluster editor-actions">
            <button className="ghost-button" onClick={fillCanvas} type="button">
              填充画布
            </button>
            <button className="ghost-button" disabled={!hasValidRegion} onClick={fillSelectedRegion} type="button">
              填充框选
            </button>
          </div>

          <Field label="文字">
            <input onChange={(event) => setText(event.target.value)} value={text} />
          </Field>
          <div className="field-grid compact-two">
            <Field label="文字颜色">
              <input onChange={(event) => setTextColor(event.target.value)} type="color" value={textColor} />
            </Field>
            <Field label="字号">
              <input
                min={12}
                onChange={(event) => setFontSize(Number(event.target.value))}
                type="number"
                value={fontSize}
              />
            </Field>
          </div>
          <div className="button-cluster editor-actions">
            <button className="ghost-button" onClick={() => addTextLayer()} type="button">
              添加文字
            </button>
            <button className="ghost-button" disabled={!hasValidRegion} onClick={addTextToSelectedRegion} type="button">
              文字放入框选
            </button>
          </div>

          <label className="upload-box compact-upload">
            <input accept="image/*" onChange={addUploadedImage} type="file" />
            <span>添加图像</span>
            <small>上传单张图片，可与其它素材重叠拼接</small>
          </label>

          <div className="selected-layer-card">
            <span>当前选择</span>
            <strong>{selectedLayerName(selectedLayer)}</strong>
            {selectedImageLayer ? (
              <small>
                {Math.round(selectedImageLayer.width)}×{Math.round(selectedImageLayer.height)} · 旋转{' '}
                {selectedImageLayer.rotation}°
              </small>
            ) : (
              <small>点击画布中的图层后，可进行删除或排序；图片图层可缩放、旋转、镜像。</small>
            )}
          </div>

          <div className="editor-transform-grid">
            <button className="ghost-button" disabled={!selectedImageLayer} onClick={() => scaleSelectedImage(1.12)} type="button">
              放大
            </button>
            <button className="ghost-button" disabled={!selectedImageLayer} onClick={() => scaleSelectedImage(0.88)} type="button">
              缩小
            </button>
            <button className="ghost-button" disabled={!selectedImageLayer} onClick={() => rotateSelectedImage(-15)} type="button">
              左转
            </button>
            <button className="ghost-button" disabled={!selectedImageLayer} onClick={() => rotateSelectedImage(15)} type="button">
              右转
            </button>
            <button className="ghost-button" disabled={!selectedImageLayer} onClick={() => flipSelectedImage('x')} type="button">
              水平镜像
            </button>
            <button className="ghost-button" disabled={!selectedImageLayer} onClick={() => flipSelectedImage('y')} type="button">
              垂直镜像
            </button>
          </div>

          <div className="button-cluster editor-actions">
            <button className="ghost-button" disabled={!selectedLayerId} onClick={sendBackward} type="button">
              下移图层
            </button>
            <button className="ghost-button" disabled={!selectedLayerId} onClick={bringForward} type="button">
              上移图层
            </button>
          </div>

          <div className="button-cluster editor-actions">
            <button className="ghost-button" disabled={history.length === 0} onClick={undo} type="button">
              返回
            </button>
            <button className="ghost-button" disabled={future.length === 0} onClick={redo} type="button">
              重做
            </button>
          </div>

          <button className="danger-button" disabled={!selectedLayerId} onClick={deleteSelectedLayer} type="button">
            删除选中图层
          </button>
        </aside>

        <div className="panel editor-canvas-panel" onDragOver={(event) => event.preventDefault()} onDrop={dropImage}>
          <div className="section-title">
            <div>
              <p className="eyebrow">Canvas</p>
              <h3>处理区域</h3>
            </div>
            <small>{status}</small>
          </div>
          <canvas
            className={`image-editor-canvas ${tool === 'region' ? 'is-region-tool' : ''}`}
            height={canvasHeight}
            onClick={canvasClick}
            onPointerDown={startInteraction}
            onPointerLeave={stopInteraction}
            onPointerMove={moveInteraction}
            onPointerUp={stopInteraction}
            ref={canvasRef}
            width={canvasWidth}
          />
          <p className="canvas-tip">
            提示：选择/移动模式可点选并拖动图层；框选区域模式可拖拽出矩形，再填充颜色或添加文字。Alt + 点击画布可快速在点击位置添加文字。
          </p>
        </div>
      </section>
    </div>
  )
}
