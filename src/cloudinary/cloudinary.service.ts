import { Injectable, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  v2 as cloudinary,
  type UploadApiResponse,
  type UploadApiErrorResponse,
} from 'cloudinary'
import { Readable } from 'stream'
import type { CloudinaryUploadResult } from './types'

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    })
  }
  /**
   * COnvert Buffer to readable stream using built-in Readable in node
   */
  private bufferToStream(buffer: Buffer): Readable {
    const readable = new Readable()
    readable.push(buffer)
    readable.push(null)
    return readable
  }
  async uploadImage(
    file: Express.Multer.File,
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const savePath = this.config.get('CLOUDINARY_TARGET_FOLDER') + '/images'
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: savePath,
          resource_type: 'image',
          allowed_formats: ['jpg', 'png', 'gif', 'webp', 'jpeg'],
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' }, // max dimension
            { quality: 'auto' }, // auth quality
            { fetch_format: 'auto' }, // auto format (WebP for supported browsers)
          ],
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            reject(new BadRequestException(error.message))
          }
          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            resourceType: result.resource_type,
          })
        },
      )
      this.bufferToStream(file.buffer).pipe(uploadStream)
    })
  }

  async uploadPostImage(
    file: Express.Multer.File,
    userId: number,
  ): Promise<CloudinaryUploadResult> {
    const folder = this.config.get('CLOUDINARY_TARGET_FOLDER')

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${folder}/posts`,
          public_id: `post-${userId}-${Date.now()}`,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' }, // Max dimensions for posts
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) reject(new BadRequestException(error.message))
          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            resourceType: result.resource_type,
          })
        },
      )
      this.bufferToStream(file.buffer).pipe(uploadStream)
    })
  }

  async uploadProfileImage(
    file: Express.Multer.File,
    userId: number,
  ): Promise<CloudinaryUploadResult> {
    const folder =
      this.config.get('CLOUDINARY_TARGET_FOLDER') + `/profile-${userId}`
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: `avatar-${userId}-${Date.now()}`,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' }, // square crop face detection
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
          overwrite: true,
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) reject(new BadRequestException(error.message))
          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            resourceType: result.resource_type,
          })
        },
      )
      this.bufferToStream(file.buffer).pipe(uploadStream)
    })
  }

  async deleteImage(publicId: string) {
    try {
      await cloudinary.uploader.destroy(publicId)
    } catch (error) {
      throw new BadRequestException('Failed to delete image from cloudinary')
    }
  }

  async deleteProfileImage(userId: number) {
    const folder = this.config.get('CLOUDINARY_TARGET_FOLDER')
    const prefix = `${folder}/profile-${userId}`
    try {
      const res = await cloudinary.api.delete_resources_by_prefix(prefix)
      return res
    } catch (error) {
      throw new BadRequestException('Failed to delete profile images')
    }
  }

  getOptimizedUrl(publicId: string, width?: number, height?: number): string {
    return cloudinary.url(publicId, {
      width: width || 500,
      height: height || 500,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
    })
  }
}
