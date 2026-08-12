import type { DragEvent } from 'react'
import type { GenerationResult } from '../../types/workflow'

type ResultGalleryProps = {
  results: GenerationResult[]
  onDeleteResult: (id: string) => void
}

const extensionByKind = {
  gif: 'gif',
  image: 'png',
  json: 'json',
  sheet: 'png',
  slice: 'png',
  'slice-helper': 'png',
  video: 'mp4',
}

const draggableKinds = new Set<GenerationResult['kind']>([
  'image',
  'gif',
  'sheet',
  'slice',
  'slice-helper',
])

export function ResultGallery({ results, onDeleteResult }: ResultGalleryProps) {
  const startDrag = (event: DragEvent<HTMLElement>, result: GenerationResult) => {
    if (!draggableKinds.has(result.kind)) {
      return
    }
    event.dataTransfer.setData('application/game-ui-smith-result', result.url)
    event.dataTransfer.setData('text/uri-list', result.url)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <section className="panel gallery-panel">
      <div className="section-title">
        <div>
          <p className="eyebrow">Output Shelf</p>
          <h3>生成结果</h3>
        </div>
        <small>{results.length} 个素材</small>
      </div>

      {results.length === 0 ? (
        <div className="empty-state">
          <div className="pixel-orb" />
          <p>还没有素材。生成图片后可拖到“图片处理”画布里继续拼接。</p>
        </div>
      ) : (
        <div className="result-grid">
          {results.map((result) => (
            <article
              className="result-card"
              draggable={draggableKinds.has(result.kind)}
              key={result.id}
              onDragStart={(event) => startDrag(event, result)}
            >
              <button
                aria-label={`删除 ${result.title}`}
                className="delete-result-button"
                onClick={() => onDeleteResult(result.id)}
                type="button"
              >
                ×
              </button>
              {result.kind === 'video' && result.url.startsWith('http') ? (
                <video controls src={result.url} />
              ) : result.kind === 'video' ? (
                <div className="job-card">{result.url}</div>
              ) : result.kind === 'json' ? (
                <div className="job-card">提示词配方 JSON</div>
              ) : (
                <img alt={result.title} src={result.url} />
              )}
              <div>
                <strong>{result.title}</strong>
                <small>{result.meta}</small>
                <a download={`${result.title}.${extensionByKind[result.kind]}`} href={result.url}>
                  下载
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
