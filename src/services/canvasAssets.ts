import type { FramePreview, SliceSelection, SliceShape } from '../types/workflow'
import { fileToDataUrl, loadImage } from '../utils/file'
import { createGifBlob } from '../utils/gif'

export function trimTransparentCanvas(source: HTMLCanvasElement, alphaThreshold = 4) {
  const context = source.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('浏览器不支持 Canvas。')
  }

  const { width, height } = source
  const imageData = context.getImageData(0, 0, width, height)
  const data = imageData.data
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > alphaThreshold) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return source
  }

  const output = document.createElement('canvas')
  output.width = maxX - minX + 1
  output.height = maxY - minY + 1
  const outputContext = output.getContext('2d')
  if (!outputContext) {
    throw new Error('浏览器不支持 Canvas。')
  }
  outputContext.drawImage(
    source,
    minX,
    minY,
    output.width,
    output.height,
    0,
    0,
    output.width,
    output.height,
  )
  return output
}

export async function buildSpriteSheet(framePreview: FramePreview[], columns: number) {
  if (framePreview.length === 0) {
    throw new Error('请先上传序列帧图片。')
  }

  const images = await Promise.all(framePreview.map((frame) => loadImage(frame.url)))
  const cellWidth = Math.max(...images.map((image) => image.naturalWidth))
  const cellHeight = Math.max(...images.map((image) => image.naturalHeight))
  const sheetColumns = Math.max(1, columns)
  const rows = Math.ceil(images.length / sheetColumns)
  const canvas = document.createElement('canvas')
  canvas.width = cellWidth * sheetColumns
  canvas.height = cellHeight * rows
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('浏览器不支持 Canvas。')
  }
  context.imageSmoothingEnabled = false
  images.forEach((image, index) => {
    const x = (index % sheetColumns) * cellWidth
    const y = Math.floor(index / sheetColumns) * cellHeight
    context.drawImage(image, x, y)
  })

  return canvas.toDataURL('image/png')
}

export async function buildSliceSheet(
  sourceFile: File | undefined,
  rows: number,
  columns: number,
) {
  if (!sourceFile) {
    throw new Error('请上传需要切片的 UI 整图。')
  }
  const url = await fileToDataUrl(sourceFile)
  return buildSliceHelperFromUrl(url, rows, columns)
}

export async function buildSliceHelperFromUrl(
  sourceUrl: string,
  rows: number,
  columns: number,
  selection?: SliceSelection,
  shape: SliceShape = 'rectangle',
) {
  const image = await loadImage(sourceUrl)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('浏览器不支持 Canvas。')
  }

  context.drawImage(image, 0, 0)
  context.strokeStyle = '#7cffd4'
  context.lineWidth = Math.max(2, Math.round(image.naturalWidth / 240))
  context.setLineDash([10, 8])

  for (let index = 1; index < columns; index += 1) {
    const x = (image.naturalWidth / columns) * index
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, image.naturalHeight)
    context.stroke()
  }
  for (let index = 1; index < rows; index += 1) {
    const y = (image.naturalHeight / rows) * index
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(image.naturalWidth, y)
    context.stroke()
  }

  if (selection && selection.width > 2 && selection.height > 2) {
    context.setLineDash([])
    context.strokeStyle = '#ffc75f'
    context.lineWidth = Math.max(3, Math.round(image.naturalWidth / 180))
    if (shape === 'circle') {
      context.beginPath()
      context.ellipse(
        selection.x + selection.width / 2,
        selection.y + selection.height / 2,
        Math.abs(selection.width / 2),
        Math.abs(selection.height / 2),
        0,
        0,
        Math.PI * 2,
      )
      context.stroke()
    } else {
      context.strokeRect(selection.x, selection.y, selection.width, selection.height)
    }
  }

  return canvas.toDataURL('image/png')
}

export async function cropSliceFromUrl(
  sourceUrl: string,
  selection: SliceSelection | undefined,
  shape: SliceShape,
) {
  if (!selection || selection.width < 2 || selection.height < 2) {
    throw new Error('请先在预览图上拖拽框选切片区域。')
  }

  const image = await loadImage(sourceUrl)
  const sourceX = Math.max(0, Math.min(selection.x, image.naturalWidth))
  const sourceY = Math.max(0, Math.min(selection.y, image.naturalHeight))
  const sourceWidth = Math.min(Math.abs(selection.width), image.naturalWidth - sourceX)
  const sourceHeight = Math.min(Math.abs(selection.height), image.naturalHeight - sourceY)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sourceWidth))
  canvas.height = Math.max(1, Math.round(sourceHeight))
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('浏览器不支持 Canvas。')
  }

  if (shape === 'circle') {
    context.beginPath()
    context.ellipse(
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2,
      canvas.height / 2,
      0,
      0,
      Math.PI * 2,
    )
    context.clip()
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return trimTransparentCanvas(canvas).toDataURL('image/png')
}

export async function cropGridSlicesFromUrl(
  sourceUrl: string,
  rows: number,
  columns: number,
) {
  if (rows < 1 || columns < 1) {
    throw new Error('辅助线行列数必须大于 0。')
  }

  const image = await loadImage(sourceUrl)
  const slices: Array<{
    url: string
    row: number
    column: number
    width: number
    height: number
  }> = []

  for (let row = 0; row < rows; row += 1) {
    const y0 = Math.round((image.naturalHeight / rows) * row)
    const y1 = Math.round((image.naturalHeight / rows) * (row + 1))
    for (let column = 0; column < columns; column += 1) {
      const x0 = Math.round((image.naturalWidth / columns) * column)
      const x1 = Math.round((image.naturalWidth / columns) * (column + 1))
      const width = Math.max(1, x1 - x0)
      const height = Math.max(1, y1 - y0)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('浏览器不支持 Canvas。')
      }
      context.drawImage(image, x0, y0, width, height, 0, 0, width, height)
      const trimmed = trimTransparentCanvas(canvas)
      slices.push({
        url: trimmed.toDataURL('image/png'),
        row: row + 1,
        column: column + 1,
        width: trimmed.width,
        height: trimmed.height,
      })
    }
  }

  return slices
}

export async function buildGifFromFrames(framePreview: FramePreview[], gifFps: number) {
  if (framePreview.length === 0) {
    throw new Error('请先上传图片序列帧。')
  }

  const targetWidth = Math.min(360, framePreview[0].width)
  const targetHeight = Math.round((targetWidth / framePreview[0].width) * framePreview[0].height)
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('浏览器不支持 Canvas。')
  }

  const frames: ImageData[] = []
  for (const preview of framePreview) {
    const image = await loadImage(preview.url)
    context.clearRect(0, 0, targetWidth, targetHeight)
    context.imageSmoothingEnabled = false
    context.drawImage(image, 0, 0, targetWidth, targetHeight)
    frames.push(context.getImageData(0, 0, targetWidth, targetHeight))
  }

  const blob = createGifBlob(frames, targetWidth, targetHeight, 1000 / gifFps)
  return URL.createObjectURL(blob)
}

export async function extractVideoFrames(
  video: HTMLVideoElement | null,
  videoFile: File | null,
  gifFps: number,
) {
  if (!videoFile || !video) {
    throw new Error('请先上传视频片段。')
  }

  await new Promise<void>((resolve) => {
    if (video.readyState >= 1) {
      resolve()
    } else {
      video.onloadedmetadata = () => resolve()
    }
  })

  const frameCount = Math.min(16, Math.max(4, Math.floor(video.duration * gifFps)))
  const canvas = document.createElement('canvas')
  const width = Math.min(360, video.videoWidth || 360)
  const height = Math.round((width / (video.videoWidth || width)) * (video.videoHeight || width))
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('浏览器不支持 Canvas。')
  }

  const frames: ImageData[] = []
  for (let index = 0; index < frameCount; index += 1) {
    video.currentTime = (video.duration / frameCount) * index
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
    })
    context.drawImage(video, 0, 0, width, height)
    frames.push(context.getImageData(0, 0, width, height))
  }

  const blob = createGifBlob(frames, width, height, 1000 / gifFps)
  return URL.createObjectURL(blob)
}
