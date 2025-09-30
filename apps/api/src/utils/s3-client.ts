import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const s3client = new S3Client({
  region: "auto",
  endpoint: process.env.S3_URL,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY as string,
    secretAccessKey: process.env.S3_SECRET_KEY as string,
  },
});

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  key: string;
  location: string;
  etag: string;
  bucket: string;
}

export class S3MultipartUploadService {
  private bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async uploadFile(
    key: string,
    body: Buffer | Uint8Array | ReadableStream,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const upload = new Upload({
        client: s3client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: this.getContentType(key),
        },
      });

      if (onProgress) {
        upload.on("httpUploadProgress", (progress) => {
          if (progress.loaded && progress.total) {
            onProgress({
              loaded: progress.loaded,
              total: progress.total,
              percentage: Math.round((progress.loaded / progress.total) * 100),
            });
          }
        });
      }

      const result = await upload.done();

      // Construct URL manually for S3-compatible services
      const s3Url = process.env.S3_PUBLIC_URL?.replace(/\/$/, ""); // Remove trailing slash if present
      const location = `${s3Url}/${key}`;

      // if (!location) {
      //   const s3Url = process.env.S3_PUBLIC_URL?.replace(/\/$/, ""); // Remove trailing slash if present
      //   location = `${s3Url}/${key}`;
      // }

      // // Validate URL format and fix common issues
      // if (
      //   location &&
      //   !location.startsWith("http://") &&
      //   !location.startsWith("https://")
      // ) {
      //   const s3Url = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
      //   location = `${s3Url}/${location}`;
      // }

      // Final validation - ensure we have a valid URL
      if (!location) {
        throw new Error("Failed to generate valid S3 URL");
      }

      try {
        new URL(location); // Validate URL format
      } catch (error) {
        throw new Error(`Invalid S3 URL generated: ${location}`);
      }

      return {
        key: result.Key || key,
        location: location,
        etag: result.ETag || "",
        bucket: result.Bucket || this.bucket,
      };
    } catch (error) {
      console.error("Upload failed:", error);
      throw new Error(
        `Failed to upload file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async checkFileExists(key: string): Promise<boolean> {
    try {
      await s3client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (error: any) {
      if (error.name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  generateKey(originalFileName: string, userId: string): string {
    const timestamp = Date.now();
    const extension = originalFileName.split(".").pop();
    const sanitizedName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `videos/${userId}/${timestamp}_${sanitizedName}`;
  }

  private getContentType(fileName: string): string {
    const extension = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      mp4: "video/mp4",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
      wmv: "video/x-ms-wmv",
      flv: "video/x-flv",
      webm: "video/webm",
      mkv: "video/x-matroska",
    };
    return mimeTypes[extension || ""] || "application/octet-stream";
  }
}

export { s3client };
