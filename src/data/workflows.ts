import type { ProviderConfig, WorkflowCard } from '../types/workflow'

export const workflowCards: WorkflowCard[] = [
  {
    id: 'prompt-generator',
    title: '提示词生成',
    desc: '用标签导航快速生成图标、按钮、背景、角色、特效等素材提示词。',
    badge: 'PROMPT',
    group: 'ai',
  },
  {
    id: 'text-to-image',
    title: '文生图',
    desc: '角色头像、按钮、道具、背景图，一句描述生成一张图。',
    badge: 'AI',
    group: 'ai',
  },
  {
    id: 'image-to-image',
    title: '图生图',
    desc: '上传草图、截图或参考图，重绘为目标游戏美术风格。',
    badge: 'IMG',
    group: 'ai',
  },
  {
    id: 'image-text-to-image',
    title: '图文生图',
    desc: '参考图 + 提示词，生成 UI 变体、材质替换、像素化版本。',
    badge: 'MIX',
    group: 'ai',
  },
  {
    id: 'text-to-video',
    title: '文生视频',
    desc: '生成特效循环、动态背景、宝箱开启等短片段。',
    badge: 'VID',
    group: 'ai',
  },
  {
    id: 'image-text-to-video',
    title: '文图生视频',
    desc: '把静态素材变成粒子闪光、呼吸动画或过场片段。',
    badge: 'MOV',
    group: 'ai',
  },
  {
    id: 'image-editor',
    title: '图片处理',
    desc: '拖入结果图或上传图片，添加文字、图像、颜色填充并合成。',
    badge: 'EDIT',
    group: 'compose',
  },
  {
    id: 'sprite-sheet',
    title: '精灵图 / 序列帧',
    desc: '从多帧图片合成 sprite sheet，适合角色动作和特效。',
    badge: 'SPR',
    group: 'compose',
  },
  {
    id: 'slice-sheet',
    title: '切片图',
    desc: '把整张 UI 图切成网格切片，快速导出按钮、面板、图标。',
    badge: 'CUT',
    group: 'compose',
  },
  {
    id: 'video-to-gif',
    title: '视频 / 序列帧转 GIF',
    desc: '上传视频片段或图片序列帧，抽帧并合成可预览的动图。',
    badge: 'GIF',
    group: 'compose',
  },
]

export const stylePresets = [
  '16-bit 像素风，清晰轮廓，有限调色板',
  '高质量奇幻 RPG 背景，电影感光照',
  '赛博朋克 HUD，霓虹玻璃拟态',
  '手绘童话风 UI，温暖纸张质感',
  '暗黑地牢物品图标，高对比边缘光',
  '休闲手游 Q 版图标，饱满颜色，高可读性',
]

export const defaultConfig: ProviderConfig = {
  name: 'OpenAI Compatible',
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  promptModel: 'gpt-5.5',
  textToImageModel: 'gpt-image-2',
  imageToImageModel: 'gpt-image-2',
  imageTextToImageModel: 'gpt-5.5',
  textToVideoModel: 'gpt-5.5',
  imageTextToVideoModel: 'gpt-5.5',
}

export const imageSizes = ['1024x1024', '1536x1024', '1024x1536', '720x720', '1280x720']
export const qualityOptions = ['auto', 'high', 'medium', 'low']

export const validateImageSize = (value: string) => {
  const normalized = value.trim().toLowerCase()
  const match = /^(\d{2,5})x(\d{2,5})$/.exec(normalized)

  if (!match) {
    return {
      valid: false,
      message: '请使用“宽x高”格式，例如 1024x1024。',
    }
  }

  const width = Number(match[1])
  const height = Number(match[2])

  if (width < 256 || height < 256) {
    return {
      valid: false,
      message: '宽高建议至少 256px，否则生成素材可用性较差。',
    }
  }

  if (width > 4096 || height > 4096) {
    return {
      valid: false,
      message: '单边不建议超过 4096px，请拆分或降低尺寸。',
    }
  }

  if (width * height > 2048 * 2048) {
    return {
      valid: false,
      message: '总像素不建议超过 2048x2048，容易超出多数图像模型限制。',
    }
  }

  const aspectRatio = Math.max(width, height) / Math.min(width, height)
  if (aspectRatio > 4) {
    return {
      valid: false,
      message: '长宽比不建议超过 4:1，游戏 UI 素材会更难稳定生成。',
    }
  }

  return { valid: true, message: '' }
}
