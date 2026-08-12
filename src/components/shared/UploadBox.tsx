import type { ChangeEvent } from 'react'

type UploadBoxProps = {
  title: string
  hint: string
  accept: string
  multiple?: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export function UploadBox({
  title,
  hint,
  accept,
  multiple = false,
  onChange,
}: UploadBoxProps) {
  return (
    <label className="upload-box">
      <input accept={accept} multiple={multiple} onChange={onChange} type="file" />
      <span>{title}</span>
      <small>{hint}</small>
    </label>
  )
}
