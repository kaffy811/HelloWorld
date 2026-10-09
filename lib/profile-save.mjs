import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
export class ProfileSaveError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function profileFields(input) {
  const fields = Object.fromEntries(['display_name', 'first_name', 'last_name'].map(key => [key, typeof input[key] === 'string' ? input[key].trim() : '']));
  if (!fields.display_name || fields.display_name.length > 40)
    throw new ProfileSaveError(400, 'Enter a display name of 1–40 characters.');
  if (!fields.first_name || !fields.last_name || fields.first_name.length > 80 || fields.last_name.length > 80)
    throw new ProfileSaveError(400, 'Enter both names, up to 80 characters each.');
  return fields;
}
export async function avatarBytes(bytes) {
  try {
    if (!bytes.length || bytes.length > 2097152) throw new Error();
    const image = sharp(bytes, {limitInputPixels: 20000000, animated: false, failOn: 'warning'});
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error();
    return await image.rotate().resize({width: 512, height: 512, fit: 'inside', withoutEnlargement: true}).webp({quality: 85}).toBuffer();
  } catch {
    throw new ProfileSaveError(400, 'This photo could not be read. Choose a JPG, PNG or WebP image.');
  }
}
// Use the authenticated user's client, so profile and private Storage RLS still apply.
/** @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} owner
 * @param {Record<string, unknown>} input
 * @param {Buffer|null} [photo] */
export async function saveProfile(supabase, owner, input, photo = null) {
  const fields = profileFields(input);
  let path = null;
  if (photo) {
    const bytes = await avatarBytes(photo);
    path = `${owner}/${randomUUID()}.webp`;
    const {error} = await supabase.storage.from('avatars').upload(path, bytes, {contentType: 'image/webp', upsert: false});
    if (error) throw new ProfileSaveError(503, 'Photo upload failed. Retry, or remove the selected photo to continue.');
  }
  try {
    const {data, error} = await supabase.from('profiles').update({...fields, ...(path ? {avatar_path: path} : {})}).eq('id', owner).select('id').single();
    if (error || !data) throw new ProfileSaveError(503, 'Your profile could not be saved. Please retry.');
  } catch (error) {
    if (path) await supabase.storage.from('avatars').remove([path]);
    throw error;
  }
}
