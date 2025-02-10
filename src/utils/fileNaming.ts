import { format } from 'date-fns';
import { ImageMetadata } from '../types';

export const formatDate = (date: string): string => {
  if (!date) {
    throw new Error('Date is required');
  }

  try {
    return format(new Date(date), 'dd-MM-yy');
  } catch (error) {
    throw new Error('Invalid date format');
  }
};

export const generateImageFileName = (
  image: ImageMetadata,
  date: string
): string => {
  if (!image) {
    throw new Error('Image metadata is required');
  }

  if (!date) {
    throw new Error('Date is required');
  }

  if (!image.photoNumber?.trim()) {
    throw new Error(`Missing photo number for image: ${image.file.name}`);
  }

  const formattedDate = formatDate(date);
  
  if (image.isSketch) {
    return `Sketch ${image.photoNumber.trim()}.JPG`;
  }
  
  if (!image.description?.trim()) {
    throw new Error(`Missing description for defect image: ${image.file.name}`);
  }

  return `Photo ${image.photoNumber.trim()} ^ ${image.description.trim()} ^ ${formattedDate}.JPG`;
};

export const generateMetadataFileName = (elr: string, structureNo: string, date: string): string => {
  if (!elr?.trim() || !structureNo?.trim() || !date) {
    throw new Error('ELR, structure number, and date are required for metadata filename');
  }

  const formattedDate = formatDate(date);
  return `${elr.trim().toUpperCase()}_${structureNo.trim()}_${formattedDate}.txt`;
};

export const generateZipFileName = (elr: string, structureNo: string, date: string): string => {
  if (!elr?.trim() || !structureNo?.trim() || !date) {
    throw new Error('ELR, structure number, and date are required for zip filename');
  }

  const formattedDate = formatDate(date);
  return `${elr.trim().toUpperCase()}_${structureNo.trim()}_${formattedDate}.zip`;
};