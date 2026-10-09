import {mutationUser, boundedBytes, HttpError, errorResponse} from '@/lib/news/api';
import {saveProfile, ProfileSaveError} from '@/lib/profile-save.mjs';
import {revalidatePath} from 'next/cache';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const {supabase, user} = await mutationUser(request);
    const type = request.headers.get('content-type') || '';
    if (!type.startsWith('multipart/form-data;')) throw new HttpError(400, 'Invalid profile request.');
    const bytes = await boundedBytes(request, 2200000);
    let form: FormData;
    try { form = await new Response(bytes, {headers: {'Content-Type': type}}).formData(); }
    catch { throw new HttpError(400, 'Invalid profile request.'); }
    const photo = form.get('photo');
    if (photo && (!(photo instanceof File) || !['image/png', 'image/jpeg', 'image/webp'].includes(photo.type)))
      throw new HttpError(400, 'This photo could not be read. Choose a JPG, PNG or WebP image.');
    await saveProfile(supabase, user.id, Object.fromEntries(['display_name', 'first_name', 'last_name'].map(key => [key, form.get(key)])), photo instanceof File ? Buffer.from(await photo.arrayBuffer()) : null);
    revalidatePath('/profile'); revalidatePath('/onboarding'); revalidatePath('/');
    return Response.json({saved: true}, {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) {
    if (error instanceof ProfileSaveError) return errorResponse(new HttpError(error.status, error.message));
    return errorResponse(error);
  }
}
