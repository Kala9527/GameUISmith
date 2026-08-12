import type { AssetMode, ProviderConfig } from '../types/workflow'
import { fileToDataUrl } from '../utils/file'

type ImageRequest = {
  mode: Extract<AssetMode, 'text-to-image' | 'image-to-image' | 'image-text-to-image'>
  config: ProviderConfig
  prompt: string
  size: string
  quality: string
  referenceFiles: File[]
}

type VideoRequest = {
  mode: Extract<AssetMode, 'text-to-video' | 'image-text-to-video'>
  config: ProviderConfig
  prompt: string
  size: string
}

export type PromptRecipeRequest = {
  targetMode: Extract<
    AssetMode,
    | 'text-to-image'
    | 'image-to-image'
    | 'image-text-to-image'
    | 'text-to-video'
    | 'image-text-to-video'
  >
  targetModeTitle: string
  category: string
  categoryHint: string
  idea: string
  styleHint: string
  sizeHint: string
}

export const getPromptModel = (config: ProviderConfig) =>
  config.promptModel || config.responseModel || 'gpt-5.5'

export const getImageModelForMode = (
  config: ProviderConfig,
  mode: Extract<AssetMode, 'text-to-image' | 'image-to-image' | 'image-text-to-image'>,
) => {
  if (mode === 'text-to-image') {
    return config.textToImageModel || config.imageModel || 'gpt-image-2'
  }
  if (mode === 'image-to-image') {
    return config.imageToImageModel || config.imageModel || 'gpt-image-2'
  }
  return config.imageTextToImageModel || config.responseModel || 'gpt-5.5'
}

export const getVideoModelForMode = (
  config: ProviderConfig,
  mode: Extract<AssetMode, 'text-to-video' | 'image-text-to-video'>,
) =>
  mode === 'text-to-video'
    ? config.textToVideoModel || config.videoModel || 'gpt-5.5'
    : config.imageTextToVideoModel || config.videoModel || 'gpt-5.5'

export type PromptRecipeResponse = {
  title: string
  positive: string
  style: string
  negative: string
  size: string
}

type ChatContentPart = {
  type?: string
  text?: string
  image_url?: string | { url?: string }
}

export const normalizeOpenAIBaseUrl = (baseUrl: string) => {
  const trimmed = (baseUrl.trim() || 'https://api.openai.com').replace(/\/$/, '')
  if (trimmed.endsWith('/v1')) {
    return trimmed
  }
  return `${trimmed}/v1`
}

const headersOf = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
})

const shouldUseDevProxy = (baseUrl: string) =>
  typeof window !== 'undefined' &&
  window.location.hostname !== '' &&
  /^https?:\/\//.test(baseUrl)

const postJson = async (
  endpoint: string,
  apiKey: string,
  payload: Record<string, unknown>,
  baseUrl: string,
) => {
  try {
    return await fetch(endpoint, {
      method: 'POST',
      headers: headersOf(apiKey),
      body: JSON.stringify(payload),
    })
  } catch (error) {
    if (!shouldUseDevProxy(baseUrl)) {
      throw error
    }

    return fetch('/__openai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: endpoint,
        apiKey,
        payload,
      }),
    })
  }
}

const asDataUrl = (image: string) =>
  image.startsWith('http') || image.startsWith('data:')
    ? image
    : `data:image/png;base64,${image}`

const extractText = (data: Record<string, any>) => {
  const chatContent = data?.choices?.[0]?.message?.content
  if (typeof chatContent === 'string') {
    return chatContent
  }

  if (Array.isArray(chatContent)) {
    return chatContent
      .map((part) => part?.text ?? '')
      .filter(Boolean)
      .join('\n')
  }

  if (typeof data?.output_text === 'string') {
    return data.output_text
  }

  const outputText = data?.output
    ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
    ?.map((item: { text?: string }) => item.text)
    ?.filter(Boolean)
    ?.join('\n')

  return outputText || ''
}

const extractImage = (data: unknown): string | undefined => {
  const responseData = data as {
    output?: Array<{
      type?: string
      result?: string
      content?: Array<{ type?: string; result?: string; image_url?: string }>
    }>
    data?: Array<{ b64_json?: string; url?: string }>
    choices?: Array<{
      message?: {
        content?: string | ChatContentPart[]
      }
    }>
  }

  const outputImage =
    responseData.output
      ?.flatMap((item) => [
        item.result ? { type: item.type, result: item.result } : undefined,
        ...(item.content ?? []),
      ])
      .filter(Boolean)
      .find((item) => item?.type?.includes('image'))?.result ??
    responseData.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.image_url)?.image_url

  const imageData = responseData.data?.[0]?.b64_json ?? responseData.data?.[0]?.url
  const chatContent = responseData.choices?.[0]?.message?.content
  const chatImage = Array.isArray(chatContent)
    ? chatContent.find((part) => part.type?.includes('image'))?.image_url
    : undefined

  if (typeof chatImage === 'string') {
    return chatImage
  }
  if (chatImage && typeof chatImage === 'object') {
    return chatImage.url
  }

  return outputImage ?? imageData
}

const parseJsonResponse = async (
  response: Response,
  endpoint: string,
): Promise<Record<string, any>> => {
  const text = await response.text()
  let data: Record<string, any> = {}

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { error: { message: text || `${endpoint} 返回了非 JSON 响应` } }
  }

  if (!response.ok) {
    const message = data?.error?.message
    if (typeof message === 'string' && message.includes('Image generation is not enabled')) {
      throw new Error(
        `图像接口已连通，但服务端未给当前 API Key / group 开启图像生成权限。Endpoint: ${endpoint}`,
      )
    }
    throw new Error(message ?? `${endpoint} 请求失败：${response.status}`)
  }

  return data
}

export async function testTextModel(config: ProviderConfig) {
  if (!config.apiKey.trim()) {
    throw new Error('请先填写 API Key。')
  }

  const baseUrl = normalizeOpenAIBaseUrl(config.baseUrl)
  const endpoint = `${baseUrl}/chat/completions`
  const response = await postJson(
    endpoint,
    config.apiKey,
    {
      model: getPromptModel(config),
      messages: [
        {
          role: 'user',
          content: '请只回复一句话：API 测试成功。',
        },
      ],
    },
    config.baseUrl,
  )

  const data = await parseJsonResponse(response, endpoint)
  const text = extractText(data).trim()
  if (!text) {
    throw new Error('文本模型已响应，但没有返回可显示文本。')
  }
  return text
}

const parsePromptRecipe = (text: string): PromptRecipeResponse => {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()
  const data = JSON.parse(cleaned) as Partial<PromptRecipeResponse>

  if (!data.positive) {
    throw new Error('文本模型已响应，但没有返回可用的正向提示词。')
  }

  return {
    title: data.title || 'AI 提示词配方',
    positive: data.positive,
    style: data.style || '',
    negative: data.negative || '低清晰度、文字错误、水印、模糊边缘、复杂背景',
    size: data.size || '1024x1024',
  }
}

export async function requestPromptRecipe(
  config: ProviderConfig,
  request: PromptRecipeRequest,
): Promise<PromptRecipeResponse> {
  if (!config.apiKey.trim()) {
    throw new Error('请先填写 API Key。')
  }

  if (!request.idea.trim()) {
    throw new Error('请先输入你想生成的素材需求。')
  }

  const baseUrl = normalizeOpenAIBaseUrl(config.baseUrl)
  const endpoint = `${baseUrl}/chat/completions`
  const response = await postJson(
    endpoint,
    config.apiKey,
    {
      model: getPromptModel(config),
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            '你是游戏 UI 素材提示词设计师。请根据用户需求，生成适合图像生成模型的中文提示词配方。只返回 JSON，不要 Markdown，不要解释。',
        },
        {
          role: 'user',
          content: [
            `目标 AI 任务：${request.targetModeTitle}`,
            `素材类型：${request.category}`,
            `类型说明：${request.categoryHint}`,
            `用户需求：${request.idea}`,
            `风格倾向：${request.styleHint || '由你根据需求决定'}`,
            `尺寸倾向：${request.sizeHint || '由你选择合理尺寸'}`,
            '请返回 JSON：{"title":"短标题","positive":"正向提示词","style":"风格描述","negative":"反向提示词","size":"宽x高"}。',
            '要求：positive 具体、可执行，说明主体、构图、背景、透明背景需求、UI 使用场景和质量要求；negative 用逗号分隔；size 必须是合理的宽x高格式。',
            '如果目标任务是图生图或图文生图，请让提示词强调如何保留/重绘/变体参考图；如果是视频任务，请强调运动、镜头、节奏、循环和时长感。',
          ].join('\n'),
        },
      ],
    },
    config.baseUrl,
  )

  const data = await parseJsonResponse(response, endpoint)
  const text = extractText(data)
  if (!text.trim()) {
    throw new Error('文本模型已响应，但没有返回提示词内容。')
  }

  return parsePromptRecipe(text)
}

export async function requestImageGeneration({
  mode,
  config,
  prompt,
  size,
  quality,
  referenceFiles,
}: ImageRequest) {
  if (!config.apiKey.trim()) {
    throw new Error('请先填写 API Key。')
  }

  const baseUrl = normalizeOpenAIBaseUrl(config.baseUrl)

  if (mode === 'image-to-image' && referenceFiles.length === 0) {
    throw new Error('图生图需要先上传草图、截图或参考图。')
  }

  if (mode === 'image-text-to-image' && referenceFiles.length === 0) {
    throw new Error('图文生图需要先上传至少 1 张参考图。')
  }

  if (mode === 'image-to-image' || mode === 'image-text-to-image') {
    const imageContents = await Promise.all(
      referenceFiles.map(async (file) => ({
        type: 'input_image',
        image_url: await fileToDataUrl(file),
      })),
    )

    const endpoint = `${baseUrl}/responses`
    const response = await postJson(
      endpoint,
      config.apiKey,
      {
        model: getImageModelForMode(config, mode),
        input: [
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }, ...imageContents],
          },
        ],
        tools: [{ type: 'image_generation' }],
      },
      config.baseUrl,
    )

    const data = await parseJsonResponse(response, endpoint)
    const image = extractImage(data)
    if (!image) {
      throw new Error('接口返回成功，但没有找到图片数据。')
    }
    return asDataUrl(image)
  }

  const endpoint = `${baseUrl}/images/generations`
  const payload: Record<string, unknown> = {
    model: getImageModelForMode(config, mode),
    prompt,
    size,
  }

  if (quality !== 'auto') {
    payload.quality = quality
  }

  const response = await postJson(endpoint, config.apiKey, payload, config.baseUrl)
  const data = await parseJsonResponse(response, endpoint)
  const image = extractImage(data)
  if (!image) {
    throw new Error('接口返回成功，但没有找到图片地址或 base64。')
  }
  return asDataUrl(image)
}

export async function requestVideoGeneration({ mode, config, prompt, size }: VideoRequest) {
  if (!config.apiKey.trim()) {
    throw new Error('请先填写 API Key。')
  }

  const baseUrl = normalizeOpenAIBaseUrl(config.baseUrl)
  const endpoint = `${baseUrl}/videos`
  const response = await postJson(
    endpoint,
    config.apiKey,
    {
      model: getVideoModelForMode(config, mode),
      prompt,
      size: size === '1024x1024' ? '720x720' : size,
    },
    config.baseUrl,
  )

  const data = await parseJsonResponse(response, endpoint)
  return data?.url ?? data?.data?.[0]?.url ?? `生成任务已创建：${data?.id ?? 'unknown'}`
}
