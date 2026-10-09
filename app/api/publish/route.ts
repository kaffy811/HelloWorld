import { mutationUser, errorResponse, HttpError } from "@/lib/news/api";
export async function POST(request: Request) {
  try {
    await mutationUser(request);
    throw new HttpError(410, "Learning card sharing has been retired.");
  } catch (e) {
    return errorResponse(e);
  }
}
