
import { FullBackupData } from '../types';

const FILE_NAME = 'cashmap_data.json';
const MIME_TYPE = 'application/json';

// Helper to find our specific file
export const findFile = async (accessToken: string): Promise<string | null> => {
  const query = `name = '${FILE_NAME}' and mimeType = '${MIME_TYPE}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) throw new Error('Failed to search Drive');
  
  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};

// Create the file initially
export const createFile = async (accessToken: string, data: FullBackupData): Promise<string> => {
  const metadata = {
    name: FILE_NAME,
    mimeType: MIME_TYPE
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: form
  });

  if (!response.ok) throw new Error('Failed to create file in Drive');
  const result = await response.json();
  return result.id;
};

// Update existing file
export const updateFile = async (accessToken: string, fileId: string, data: FullBackupData): Promise<void> => {
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) throw new Error('Failed to save to Drive');
};

// Download file content
export const downloadFile = async (accessToken: string, fileId: string): Promise<FullBackupData> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) throw new Error('Failed to download file');
  return await response.json();
};
