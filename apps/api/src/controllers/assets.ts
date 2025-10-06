import { Request, Response } from "express";
import { db } from "../db/index";
import {
  assets,
  createAssetSchema,
  assetSearchSchema,
} from "../schema/assets-schema";
import { S3MultipartUploadService } from "../utils/s3-client";
import { eq, and, desc, count } from "drizzle-orm";

const s3Service = new S3MultipartUploadService(
  process.env.S3_BUCKET_NAME || "uploads.rocket-ai.io"
);

// Helper function to determine file type from mimetype
const getFileType = (mimetype: string): "video" | "image" | "document" | "audio" | "other" => {
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("audio/")) return "audio";
  if (mimetype.includes("pdf") || mimetype.includes("document") || mimetype.includes("text/")) return "document";
  return "other";
};

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const file = req.file;
    const originalFileName = file.originalname;

    // Determine file type first
    const fileType = getFileType(file.mimetype);

    // Generate S3 key with file type folder
    const s3Key = s3Service.generateKey(originalFileName, userId, fileType);

    try {
      // Upload to S3 with multipart upload
      const uploadResult = await s3Service.uploadFile(s3Key, file.buffer);

      console.log('Upload result:', uploadResult); // Debug log

      // Create database record
      const assetData = {
        uploaderId: userId,
        originalFileName: originalFileName,
        fileName: originalFileName,
        s3Key: uploadResult.key,
        s3Bucket: uploadResult.bucket,
        s3Url: uploadResult.location,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileType: fileType,
        uploadStatus: "completed" as const,
        metadata: JSON.stringify({
          originalName: originalFileName,
          uploadTimestamp: new Date().toISOString(),
        }),
      };

      console.log('Asset data before validation:', assetData); // Debug log

      // Validate the asset data
      const validatedAssetData = createAssetSchema.parse(assetData);

      const [asset] = await db.insert(assets).values(validatedAssetData).returning();

      res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        data: asset,
      });
    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      res.status(500).json({
        success: false,
        message: "Failed to upload file to storage",
      });
    }
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAssets = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const queryParams = assetSearchSchema.parse(req.query);

    // Build query conditions
    const conditions = [eq(assets.uploaderId, userId)];

    if (queryParams.fileType) {
      conditions.push(eq(assets.fileType, queryParams.fileType));
    }

    if (queryParams.uploadStatus) {
      conditions.push(eq(assets.uploadStatus, queryParams.uploadStatus));
    }

    // Calculate offset for pagination
    const offset = (queryParams.page - 1) * queryParams.limit;

    const userAssets = await db
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(desc(assets.createdAt))
      .limit(queryParams.limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count: totalCount }] = await db
      .select({ count: count(assets.id) })
      .from(assets)
      .where(and(...conditions));

    res.json({
      success: true,
      data: {
        assets: userAssets,
        pagination: {
          page: queryParams.page,
          limit: queryParams.limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / queryParams.limit),
        },
      },
    });
  } catch (error) {
    console.error("Get assets error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.uploaderId, userId)));

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    console.error("Get asset error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.uploaderId, userId)));

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    // Delete from database first
    await db
      .delete(assets)
      .where(and(eq(assets.id, id), eq(assets.uploaderId, userId)));

    // Note: In a production environment, you might want to also delete from S3
    // For now, we'll keep the S3 object for safety

    res.json({
      success: true,
      message: "Asset deleted successfully",
    });
  } catch (error) {
    console.error("Delete asset error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
