import { supabase } from './supabase';

export async function uploadFile(file: File, userId: string): Promise<string> {
  try {
    // Create a unique file path including user ID and timestamp
    const timestamp = new Date().getTime();
    const filePath = `${userId}/${timestamp}-${file.name}`;

    // Check if file already exists
    const { data: existingFiles } = await supabase.storage
      .from('user-project-files')
      .list(userId);

    const fileExists = existingFiles?.some(f => f.name === filePath);
    if (fileExists) {
      console.log('File already exists, using existing file');
      const { data: { publicUrl } } = supabase.storage
        .from('user-project-files')
        .getPublicUrl(filePath);
      return publicUrl;
    }

    // Upload new file
    const { error: uploadError } = await supabase.storage
      .from('user-project-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('user-project-files')
      .getPublicUrl(filePath);

    if (!publicUrl) {
      throw new Error('Failed to get public URL for uploaded file');
    }

    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    // Validate file path
    if (!filePath) {
      console.warn('No file path provided for deletion');
      return;
    }

    const { error } = await supabase.storage
      .from('user-project-files')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

export async function getUserFiles(userId: string): Promise<string[]> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { data, error } = await supabase.storage
      .from('user-project-files')
      .list(userId);

    if (error) {
      console.error('List error:', error);
      throw error;
    }

    return data.map(file => file.name);
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}