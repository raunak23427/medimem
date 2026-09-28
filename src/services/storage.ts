import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from '../lib/firebase';

export interface UploadResult {
  storagePath: string;
  downloadUrl: string;
}

export async function uploadRecordFile(args: {
  uid: string;
  recordId: string;
  file: File;
}): Promise<UploadResult> {
  const { uid, recordId, file } = args;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const storagePath = `users/${uid}/records/${recordId}/${safeName}`;
  const r = ref(getFirebaseStorage(), storagePath);
  await uploadBytes(r, file, {
    contentType: file.type || 'application/octet-stream',
    customMetadata: { uid, recordId },
  });
  const downloadUrl = await getDownloadURL(r);
  return { storagePath, downloadUrl };
}

export async function deleteRecordFile(storagePath: string): Promise<void> {
  await deleteObject(ref(getFirebaseStorage(), storagePath));
}
