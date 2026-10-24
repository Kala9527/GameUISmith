# 图片生成 API 调用文档

更新日期：2026-10-24

> 本文面向提供 OpenAI 兼容接口的服务。`https://api.yunzhancloud.com` 是占位符，调用前须替换为实际 HTTPS 域名。下文以 `data[].url` 为主要返回值，是**该服务网关预期提供的扩展行为**，并非 OpenAI 官方 GPT Image 接口的原生返回格式。请与服务提供方确认 URL 转存功能已启用。官方参数核对日期：2026-10-24；网关的实际支持范围以服务提供方为准。

## 1. 接口概览

| 项目 | 内容 |
| --- | --- |
| 请求地址 | `https://api.yunzhancloud.com/v1/images/generations` |
| 请求方法 | `POST` |
| 请求类型 | `application/json` |
| 鉴权 | `Authorization: Bearer YOUR_API_KEY` |
| 主要结果 | `data[0].url`，多图时遍历 `data[].url` |

API Key 应存放在服务端环境变量中，不要写入网页前端、公开仓库或日志。这里的 Key 应是**该域名所对应服务**颁发的密钥；不要默认 OpenAI 官方 Key 可用于第三方域名。

## 2. 快速调用

以下为 bash/macOS/Linux 下的 `curl` 示例（替换域名和密钥）：

```bash
curl -X POST "https://api.yunzhancloud.com/v1/images/generations" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-2.5-flare",
    "prompt": "一张清晰的产品摄影图：白色陶瓷杯放在木桌上，自然日光，简洁背景",
    "n": 1,
    "size": "1024x1024",
    "quality": "medium",
    "output_format": "png"
  }'
```

Windows PowerShell 示例：

```powershell
$headers = @{ Authorization = "Bearer $env:IMAGE_API_KEY" }
$body = @{
    model = "gpt-image-2.5-flare"
    prompt = "一张清晰的产品摄影图：白色陶瓷杯放在木桌上，自然日光，简洁背景"
    n = 1
    size = "1024x1024"
    quality = "medium"
    output_format = "png"
} | ConvertTo-Json

$result = Invoke-RestMethod -Method Post `
    -Uri "https://api.yunzhancloud.com/v1/images/generations" `
    -Headers $headers -ContentType "application/json" -Body $body
$result.data[0].url
```

官方支持示例模型 `gpt-image-2.5-flare`，但第三方网关不一定开放它；若未开放，请将 `model` 改为服务提供方公布的模型 ID。

## 3. 请求参数

以下按 2026-10-24 的 OpenAI 官方 Images API 参考整理。第三方网关可能只实现其中一部分，实际支持范围与默认值以该服务为准。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `model` | string | 建议显式填写 | 官方示例模型 `gpt-image-2.5-flare`；须确认网关已开放。 |
| `prompt` | string | 是 | 图片描述，官方上限 32,000 字符。 |
| `n` | integer | 否 | 生成张数，官方范围 1–10；多张图读取 `data` 数组。 |
| `size` | string | 否 | 标准尺寸及自定义尺寸约束见下节；生成与编辑接口均可使用，实际支持范围由模型和网关决定。 |
| `quality` | string | 否 | `auto`（默认）、`low`、`medium`、`high`；`gpt-image-2.5-flare` 和 `gpt-image-2.5-sunburst` 另支持 `xhigh`、`max`。 |
| `output_format` | string | 否 | `png`、`jpeg` 或 `webp`。 |
| `background` | string | 否 | `auto`（默认）、`opaque`、`transparent`；透明背景须用 `png` 或 `webp`。 |
| `output_compression` | integer | 否 | 0–100，仅适用于 `jpeg` 或 `webp`。 |
| `moderation` | string | 否 | `auto`（默认）或 `low`。 |
| `safety_identifier` | string | 否 | 终端用户稳定标识，官方最大 128 字符；建议使用不可逆哈希。 |
| `stream` | boolean | 否 | 官方默认 `false`；本文 URL JSON 示例为非流式调用，网关是否支持流式 URL 返回需确认。 |
| `partial_images` | integer | 否 | 0–3，仅用于流式模式；本文示例不传。 |

**不要为了获取 URL 向 GPT Image 模型发送 `response_format: "url"`。** 官方文档明确该旧参数已弃用且不支持 GPT Image 模型；官方原生图片数据返回 `b64_json`。旧的 `style`、`standard`/`hd` 品质值也不适用于当前 GPT Image 模型。官方文档注明 `gpt-image-1` 于 2026-10-23 关闭，`dall-e-2` 和 `dall-e-3` 于 2026-05-12 退役，不建议在新接入中使用。

## 4. 支持的图片大小

`size` 指**输出图片**的宽和高，单位为像素。OpenAI 官方 GPT Image 的常用标准尺寸如下，生成和编辑接口均有这些选项：

| `size` 值 | 形状 | 适用场景 |
| --- | --- | --- |
| `1024x1024` | 正方形 | 方形配图、头像、产品图 |
| `1536x1024` | 横图 | 横幅、桌面场景 |
| `1024x1536` | 竖图 | 海报、竖版内容 |
| `auto` | 自动选择 | 仅适用于支持自动尺寸的模型 |

`gpt-image-2`、`gpt-image-2.5-flare`、`gpt-image-2.5-sunburst` 及其官方文档列出的相应快照支持 `宽x高` 自定义尺寸，例如 `1536x864`。宽、高都必须能被 16 整除，宽高比须在 **1:3 至 3:1** 之间；高于 `2560x1440` 的分辨率属于实验性范围，官方标示的最大尺寸为 `3840x2160`，还须满足具体模型的像素数及单边限制。**这不是任意组合均保证可用**，尤其第三方网关可能另有限制。其他模型请优先使用上表的标准尺寸。

## 5. 编辑已有图片

| 项目 | 内容 |
| --- | --- |
| 请求地址 | `https://api.yunzhancloud.com/v1/images/edits` |
| 请求方法 | `POST` |
| 请求类型 | `multipart/form-data`（文件上传） |
| 鉴权 | `Authorization: Bearer YOUR_API_KEY` |
| 主要结果 | 网关启用转存时读取 `data[0].url` |

单图编辑示例（bash/macOS/Linux，在图片所在目录运行）：

```bash
curl -X POST "https://api.yunzhancloud.com/v1/images/edits" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "model=gpt-image-2.5-flare" \
  -F "image[]=@source.png" \
  -F "prompt=保留原图主体与构图，将背景改为明亮的摄影棚白色背景" \
  -F "size=1024x1024" \
  -F "quality=medium"
```

`curl -F` 会自动设置 multipart 边界，**不要**同时手动指定 `Content-Type: application/json`。`source.png` 应替换为实际本地文件路径。多个参考图可重复传入 `image[]`；官方 GPT Image 编辑接口最多支持 16 张输入图，但网关可有更严格限制。`prompt` 必填，描述需要保留和修改的内容；`model`、`size`、`quality`、`n`、`output_format` 等输出配置与生图类似，以目标服务支持为准。

局部编辑可在上面请求中额外添加 `-F "mask=@mask.png"`。蒙版与待编辑原图必须是**相同格式和尺寸**（官方指南要求小于 50 MB），且蒙版须有 alpha 透明通道；透明区域指示待修改部分。多图时蒙版作用于第一张图。GPT Image 将蒙版当作编辑指引，**不能保证**边缘完全按像素精确匹配。若网关不支持 `image[]` 或蒙版上传，请按其文档调整字段。

编辑接口的 URL 响应仍属于网关扩展约定；若返回 `b64_json`，处理方式与下节相同。

## 6. 返回格式：以图片 URL 为主

**以下是网关预期响应示例，不是 OpenAI 官方 GPT Image 原生响应，也不是对尚未验证的服务行为作保证。**

```json
{
  "created": 1792828800,
  "data": [
    {
      "url": "https://你的图片域名/images/example-001.png"
    }
  ]
}
```

- `created`：响应创建时间，Unix 秒级时间戳；网关是否保留该字段需确认。
- `data`：生成结果数组。`n` 大于 1 时逐项读取。
- `data[i].url`：最主要的结果，供展示或下载。不要假定它永久有效；链接访问权限、有效期和防盗链策略由网关/存储服务决定。
- 若没有 `url`，但返回 `b64_json`，说明当前响应未转成链接。应由**服务端**解码图片、存入对象存储/CDN，再返回可访问的 URL，或直接处理 Base64；不要把巨大的 Base64 写入业务日志。

OpenAI 官方 GPT Image 的原生响应示意：

```json
{
  "created": 1792828800,
  "data": [
    {
      "b64_json": "<BASE64_IMAGE_DATA>"
    }
  ]
}
```

## 7. 客户端处理与排错

1. 检查 HTTP 状态码；成功后验证 `data` 是非空数组，并读取每一项的 `url`。
2. 如果只收到 `b64_json`，请确认网关是否提供“图片转存并返回 URL”功能；不要通过 `response_format: "url"` 尝试强制官方 GPT Image 输出链接。
3. `401/403`：检查 Key、权限与模型访问范围；`400`：检查参数、模型 ID 和内容限制；`429`：检查频率或额度限制；`5xx`：记录请求标识并按服务方建议重试。具体错误体和额度由实际服务决定。
4. 生产环境设置合理超时、有限次数的退避重试；不要对鉴权失败或参数错误无限重试。图片生成可能耗时较长，按服务 SLA 配置。
5. 网关应只在图片成功存储并可访问后返回 URL；建议明确 URL 的有效期、是否允许匿名读取，以及删除/续期策略。

## 8. 官方资料与适用边界

- [OpenAI Docs：Images API / Create image](https://developers.openai.com/api/reference/resources/images/methods/generate)
- [OpenAI Docs：Images API / Create image edit](https://developers.openai.com/api/reference/resources/images/methods/edit)
- [OpenAI Docs：Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)

以上官方资料用于核对请求路径、参数和 GPT Image 原生 Base64 行为。自定义域名、Key、URL 托管及链接期限属于目标网关配置，须向服务提供方确认。
