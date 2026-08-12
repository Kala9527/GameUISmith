function appendAscii(bytes: number[], text: string) {
  for (const char of text) {
    bytes.push(char.charCodeAt(0))
  }
}

function writeShort(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >> 8) & 0xff)
}

function lzwEncodeIndexed(indices: number[], minCodeSize: number) {
  const clearCode = 1 << minCodeSize
  const endCode = clearCode + 1
  let codeSize = minCodeSize + 1
  let nextCode = endCode + 1
  let bitBuffer = 0
  let bitCount = 0
  const output: number[] = []
  const dict = new Map<string, number>()

  const resetDict = () => {
    dict.clear()
    for (let index = 0; index < clearCode; index += 1) {
      dict.set(String(index), index)
    }
    codeSize = minCodeSize + 1
    nextCode = endCode + 1
  }

  const writeCode = (code: number) => {
    bitBuffer |= code << bitCount
    bitCount += codeSize
    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff)
      bitBuffer >>= 8
      bitCount -= 8
    }
  }

  resetDict()
  writeCode(clearCode)
  let phrase = String(indices[0] ?? 0)

  for (let index = 1; index < indices.length; index += 1) {
    const symbol = indices[index]
    const combo = `${phrase},${symbol}`
    if (dict.has(combo)) {
      phrase = combo
    } else {
      writeCode(dict.get(phrase) ?? symbol)
      if (nextCode < 4096) {
        dict.set(combo, nextCode)
        nextCode += 1
        if (nextCode === 1 << codeSize && codeSize < 12) {
          codeSize += 1
        }
      } else {
        writeCode(clearCode)
        resetDict()
      }
      phrase = String(symbol)
    }
  }

  writeCode(dict.get(phrase) ?? 0)
  writeCode(endCode)
  if (bitCount > 0) {
    output.push(bitBuffer & 0xff)
  }

  return output
}

function quantizeToWebSafe(imageData: ImageData) {
  const indices: number[] = []
  const data = imageData.data
  for (let index = 0; index < data.length; index += 4) {
    const red = Math.round(data[index] / 51)
    const green = Math.round(data[index + 1] / 51)
    const blue = Math.round(data[index + 2] / 51)
    indices.push(red * 36 + green * 6 + blue)
  }
  return indices
}

export function createGifBlob(
  frames: ImageData[],
  width: number,
  height: number,
  delayMs: number,
) {
  const bytes: number[] = []
  appendAscii(bytes, 'GIF89a')
  writeShort(bytes, width)
  writeShort(bytes, height)
  bytes.push(0xf7, 0, 0)

  for (let red = 0; red < 6; red += 1) {
    for (let green = 0; green < 6; green += 1) {
      for (let blue = 0; blue < 6; blue += 1) {
        bytes.push(red * 51, green * 51, blue * 51)
      }
    }
  }
  for (let index = 216; index < 256; index += 1) {
    bytes.push(0, 0, 0)
  }

  appendAscii(bytes, '!\xff\x0bNETSCAPE2.0\x03\x01')
  writeShort(bytes, 0)
  bytes.push(0)

  for (const frame of frames) {
    appendAscii(bytes, '!\xf9\x04')
    bytes.push(0x04)
    writeShort(bytes, Math.max(2, Math.round(delayMs / 10)))
    bytes.push(0, 0)
    bytes.push(0x2c)
    writeShort(bytes, 0)
    writeShort(bytes, 0)
    writeShort(bytes, width)
    writeShort(bytes, height)
    bytes.push(0)
    bytes.push(8)

    const encoded = lzwEncodeIndexed(quantizeToWebSafe(frame), 8)
    for (let index = 0; index < encoded.length; index += 255) {
      const chunk = encoded.slice(index, index + 255)
      bytes.push(chunk.length, ...chunk)
    }
    bytes.push(0)
  }

  bytes.push(0x3b)
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' })
}
