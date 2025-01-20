// Copyright 2024 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export const timeToSecs = timecode => {
  const split = timecode.split(':').map(parseFloat)

  return split.length === 2
    ? split[0] * 60 + split[1]
    : split[0] * 3600 + split[1] * 60 + split[2]
}

export const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks
export const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024 // 10GB

export async function* createChunkGenerator(file, chunkSize = CHUNK_SIZE) {
  let offset = 0
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize)
    yield {
      chunk,
      offset,
      index: Math.floor(offset / chunkSize),
      total: Math.ceil(file.size / chunkSize)
    }
    offset += chunkSize
  }
}

export const uploadChunk = async ({chunk, index, offset, fileId, fileName, fileType}) => {
  const formData = new FormData()
  formData.append('chunk', chunk)
  formData.append('metadata', JSON.stringify({
    fileId,
    fileName,
    fileType,
    index,
    offset,
    size: chunk.size
  }))

  const response = await fetch('/api/upload/chunk', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Failed to upload chunk ${index}`)
  }

  return response.json()
}