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

import {GoogleGenerativeAI} from '@google/generative-ai'
import {GoogleAIFileManager} from '@google/generative-ai/server'

const key = process.env.VITE_GEMINI_API_KEY
const fileManager = new GoogleAIFileManager(key)
const genAI = new GoogleGenerativeAI(key)

export const uploadVideo = async file => {
  try {
    console.log('Starting video upload process:', {
      filename: file?.originalname,
      size: file?.buffer?.length,
      mimetype: file?.mimetype
    })

    if (!file) {
      console.error('Upload failed: No file provided')
      throw new Error('No file uploaded')
    }
    
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov']
    if (!allowedTypes.includes(file.mimetype)) {
      console.error('Upload failed: Invalid file type', {
        provided: file.mimetype,
        allowed: allowedTypes
      })
      throw new Error('Invalid file type. Please upload a video file (MP4, WebM, MOV, or QuickTime).')
    }
    
    if (!file.buffer) {
      console.error('Upload failed: Missing file buffer')
      throw new Error('Invalid file data')
    }

    console.log('Uploading file to Google AI FileManager...')
    const uploadResult = await fileManager.uploadFile(file.buffer, {
      displayName: file.originalname,
      mimeType: file.mimetype,
      timeout: 300000 // 5 minutes timeout for large files
    })

    if (!uploadResult?.file) {
      console.error('Upload failed: No file response from FileManager')
      throw new Error('Failed to process video file')
    }

    console.log('Video upload successful:', {
      fileId: uploadResult.file.name,
      uri: uploadResult.file.uri
    })
    return uploadResult.file
  } catch (error) {
    console.error('Video upload error:', {
      message: error.message,
      stack: error.stack,
      details: error
    })
    throw new Error(error.message || 'Failed to upload video')
  }
}

export const checkProgress = async fileId => {
  try {
    console.log('Checking progress for file:', fileId)
    if (!fileId) {
      console.error('Progress check failed: No file ID provided')
      throw new Error('No file ID provided')
    }

    const result = await fileManager.getFile(fileId)
    console.log('Progress check result:', {
      state: result.state,
      progress: result.metadata?.progress,
      error: result.error
    })
    
    // Add progress calculation if available
    if (result.state === 'PROCESSING' && result.metadata?.progress) {
      result.progress = Math.round(result.metadata.progress * 100)
    }
    
    return result
  } catch (error) {
    console.error('Progress check error:', {
      message: error.message,
      stack: error.stack,
      details: error
    })
    return {error}
  }
}

export const promptVideo = async (uploadResult, prompt, model) => {
  try {
    const req = [
      {text: prompt},
      {
        fileData: {
          mimeType: uploadResult.mimeType,
          fileUri: uploadResult.uri
        }
      }
    ]
    const result = await genAI.getGenerativeModel({model}).generateContent(req)

    return {
      text: result.response.text(),
      candidates: result.response.candidates,
      feedback: result.response.promptFeedback
    }
  } catch (error) {
    console.error(error)
    return {error}
  }
}
