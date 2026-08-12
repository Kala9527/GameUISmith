import type { Dispatch, SetStateAction } from 'react'

export type AssetMode =
  | 'prompt-generator'
  | 'text-to-image'
  | 'image-to-image'
  | 'image-text-to-image'
  | 'text-to-video'
  | 'image-text-to-video'
  | 'sprite-sheet'
  | 'slice-sheet'
  | 'video-to-gif'
  | 'image-editor'

export type GenerationKind =
  | 'image'
  | 'video'
  | 'gif'
  | 'sheet'
  | 'slice'
  | 'slice-helper'
  | 'json'

export type ProviderConfig = {
  name: string
  baseUrl: string
  apiKey: string
  promptModel: string
  textToImageModel: string
  imageToImageModel: string
  imageTextToImageModel: string
  textToVideoModel: string
  imageTextToVideoModel: string
  imageModel?: string
  videoModel?: string
  responseModel?: string
}

export type GenerationResult = {
  id: string
  kind: GenerationKind
  url: string
  title: string
  meta: string
}

export type FramePreview = {
  url: string
  width: number
  height: number
}

export type SliceShape = 'rectangle' | 'circle'

export type SliceSelection = {
  x: number
  y: number
  width: number
  height: number
}

export type WorkflowCard = {
  id: AssetMode
  title: string
  desc: string
  badge: string
  group: 'ai' | 'compose'
}

export type PromptState = {
  prompt: string
  setPrompt: Dispatch<SetStateAction<string>>
  negativePrompt: string
  setNegativePrompt: Dispatch<SetStateAction<string>>
  style: string
  setStyle: Dispatch<SetStateAction<string>>
  size: string
  setSize: Dispatch<SetStateAction<string>>
  quality: string
  setQuality: Dispatch<SetStateAction<string>>
  composedPrompt: string
}
