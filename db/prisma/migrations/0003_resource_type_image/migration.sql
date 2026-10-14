-- Allow image uploads (png/jpg) in community resources.
ALTER TYPE "ResourceType" ADD VALUE IF NOT EXISTS 'image';
