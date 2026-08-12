import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent } from 'react'
import { Field } from '../../components/shared/Field'
import { UploadBox } from '../../components/shared/UploadBox'
import type { GenerationResult, SliceSelection, SliceShape } from '../../types/workflow'
import { fileToDataUrl, loadImage } from '../../utils/file'

type SliceSource = 'original' | 'helper'

type SliceSheetPanelProps = {
  busy: boolean
  rows: number
  columns: number
  referenceCount: number
  sourceUrl: string
  helperUrl: string
  selection?: SliceSelection
  shape: SliceShape
  sourceMode: SliceSource
  setRows: (value: number) => void
  setColumns: (value: number) => void
  setSelection: (selection?: SliceSelection) => void
  setShape: (shape: SliceShape) => void
  setSourceMode: (mode: SliceSource) => void
  onReferenceUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onGenerateHelper: () => void
  onGenerateSlice: () => void
  onGenerateGridSlices: () => void
  latestSlice?: GenerationResult
}

type DragState = {
  startX: number
  startY: number
}

const normalizeSelection = (selection: SliceSelection): SliceSelection => {
  const x = selection.width < 0 ? selection.x + selection.width : selection.x
  const y = selection.height < 0 ? selection.y + selection.height : selection.y
  return {
    x,
    y,
    width: Math.abs(selection.width),
    height: Math.abs(selection.height),
  }
}

export function SliceSheetPanel({
  busy,
  rows,
  columns,
  referenceCount,
  sourceUrl,
  helperUrl,
  selection,
  shape,
  sourceMode,
  setRows,
  setColumns,
  setSelection,
  setShape,
  setSourceMode,
  onReferenceUpload,
  onGenerateHelper,
  onGenerateSlice,
  onGenerateGridSlices,
  latestSlice,
}: SliceSheetPanelProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)

  const activePreviewUrl = sourceMode === 'helper' && helperUrl ? helperUrl : sourceUrl
  const normalizedSelection = useMemo(
    () => (selection ? normalizeSelection(selection) : undefined),
    [selection],
  )

  const getImagePoint = (event: PointerEvent<HTMLDivElement>) => {
    const image = imageRef.current
    if (!image) {
      return { x: 0, y: 0 }
    }

    const rect = image.getBoundingClientRect()
    const naturalWidth = image.naturalWidth || rect.width
    const naturalHeight = image.naturalHeight || rect.height
    const x = ((event.clientX - rect.left) / rect.width) * naturalWidth
    const y = ((event.clientY - rect.top) / rect.height) * naturalHeight
    return {
      x: Math.max(0, Math.min(naturalWidth, x)),
      y: Math.max(0, Math.min(naturalHeight, y)),
    }
  }

  const selectionStyle = (() => {
    const image = imageRef.current
    if (!image || !normalizedSelection) {
      return undefined
    }
    const widthRatio = image.clientWidth / image.naturalWidth
    const heightRatio = image.clientHeight / image.naturalHeight
    return {
      left: normalizedSelection.x * widthRatio,
      top: normalizedSelection.y * heightRatio,
      width: normalizedSelection.width * widthRatio,
      height: normalizedSelection.height * heightRatio,
      borderRadius: shape === 'circle' ? '999px' : '8px',
    }
  })()

  const loadFirstImage = async (event: ChangeEvent<HTMLInputElement>) => {
    onReferenceUpload(event)
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const url = await fileToDataUrl(file)
    const image = await loadImage(url)
    setSelection({
      x: Math.round(image.naturalWidth * 0.15),
      y: Math.round(image.naturalHeight * 0.15),
      width: Math.round(image.naturalWidth * 0.35),
      height: Math.round(image.naturalHeight * 0.35),
    })
  }

  const startDraw = (event: PointerEvent<HTMLDivElement>) => {
    if (!activePreviewUrl) {
      return
    }
    const point = getImagePoint(event)
    setDragState({ startX: point.x, startY: point.y })
    setSelection({ x: point.x, y: point.y, width: 1, height: 1 })
  }

  const moveDraw = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState) {
      return
    }
    const point = getImagePoint(event)
    setSelection(
      normalizeSelection({
        x: dragState.startX,
        y: dragState.startY,
        width: point.x - dragState.startX,
        height: point.y - dragState.startY,
      }),
    )
  }

  const stopDraw = () => {
    setDragState(null)
  }

  return (
    <div className="feature-stack">
      <section className="panel hero-tool-panel">
        <div>
          <p className="eyebrow">Slicer</p>
          <h3>UI 切片工具</h3>
          <p>可以手动框选生成单张切片，也可以直接按照辅助线行列批量生成多张图片。</p>
        </div>
        <div className="button-cluster">
          <button className="ghost-button" disabled={busy} onClick={onGenerateHelper} type="button">
            生成切片辅助图
          </button>
          <button className="ghost-button" disabled={busy} onClick={onGenerateGridSlices} type="button">
            按辅助线批量生成
          </button>
          <button className="primary-button" disabled={busy} onClick={onGenerateSlice} type="button">
            生成框选切片图
          </button>
        </div>
      </section>

      <section className="feature-grid slicer-workbench">
        <div className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Source Atlas</p>
              <h3>整图与切片参数</h3>
            </div>
          </div>
          <UploadBox
            accept="image/*"
            hint={`已选 ${referenceCount} 张，使用第一张`}
            onChange={loadFirstImage}
            title="上传 UI 整图"
          />
          <div className="field-grid compact-two settings-row">
            <Field label="辅助线列数">
              <input
                min={1}
                onChange={(event) => setColumns(Number(event.target.value))}
                type="number"
                value={columns}
              />
            </Field>
            <Field label="辅助线行数">
              <input
                min={1}
                onChange={(event) => setRows(Number(event.target.value))}
                type="number"
                value={rows}
              />
            </Field>
            <Field label="框选形状">
              <select onChange={(event) => setShape(event.target.value as SliceShape)} value={shape}>
                <option value="rectangle">方框</option>
                <option value="circle">圆形 / 椭圆</option>
              </select>
            </Field>
            <Field label="切图来源">
              <select onChange={(event) => setSourceMode(event.target.value as SliceSource)} value={sourceMode}>
                <option value="original">从原图切</option>
                <option value="helper">从预处理辅助图切</option>
              </select>
            </Field>
          </div>

          <div className="mini-note">
            <strong>批量切片</strong>
            <span>
              “按辅助线批量生成”会按照当前行列数切出 {rows * columns} 张图片，并逐张放入结果区。
            </span>
          </div>
        </div>

        <div className="panel preview-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Draw & Slice</p>
              <h3>框选切片区域</h3>
            </div>
            <small>{sourceMode === 'helper' ? '当前：预处理辅助图' : '当前：原图'}</small>
          </div>
          {activePreviewUrl ? (
            <div
              className="slice-canvas-stage"
              onPointerDown={startDraw}
              onPointerLeave={stopDraw}
              onPointerMove={moveDraw}
              onPointerUp={stopDraw}
              role="presentation"
            >
              <img alt="切片源预览" draggable={false} ref={imageRef} src={activePreviewUrl} />
              {selectionStyle && <span className="slice-selection" style={selectionStyle} />}
            </div>
          ) : (
            <div className="slice-wireframe">
              {Array.from({ length: Math.min(rows * columns, 24) }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="feature-grid">
        <div className="panel preview-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Helper Preview</p>
              <h3>切片辅助图</h3>
            </div>
          </div>
          {helperUrl ? (
            <img alt="切片辅助图" src={helperUrl} />
          ) : (
            <div className="preview-placeholder">点击“生成切片辅助图”后显示网格和框选标记</div>
          )}
        </div>

        <div className="panel preview-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Slice Output</p>
              <h3>最近切片图</h3>
            </div>
          </div>
          {latestSlice ? (
            <img alt={latestSlice.title} src={latestSlice.url} />
          ) : (
            <div className="preview-placeholder">框选区域后点击“生成框选切片图”，或直接按辅助线批量生成</div>
          )}
        </div>
      </section>
    </div>
  )
}
