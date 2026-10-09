// Compress before sending, keeping phone photos below the hosting/Storage body limits.
export async function prepareProfilePhoto(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)
    throw new Error('Choose a JPG, PNG or WebP photo up to 10 MB.');
  const url = URL.createObjectURL(file), image = new window.Image();
  try {
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 50000000) throw new Error();
    const scale = Math.min(1, 512 / image.naturalWidth, 512 / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error();
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error()), 'image/webp', 0.85));
    if (blob.size > 2097152) throw new Error();
    return new File([blob], 'profile-photo', {type: blob.type});
  } catch {
    throw new Error('This photo could not be read. Choose a JPG, PNG or WebP image.');
  } finally { URL.revokeObjectURL(url); }
}
