import { AppError } from "./inspection-service";
import { hasUserPurchasedEvent, isEventEnded, upsertEventRating, getEventRatingSummary } from "@vieticket/repos/ratings";

export async function submitEventRating(
  userId: string,
  eventId: string,
  stars: number,
  comment?: string
) {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new AppError("Số sao phải từ 1 đến 5", "INVALID_STARS");
  }

  const purchased = await hasUserPurchasedEvent(userId, eventId);
  if (!purchased) {
    throw new AppError("Chỉ người đã mua vé mới được đánh giá", "NOT_PURCHASER");
  }

  const ended = await isEventEnded(eventId);
  if (!ended) {
    throw new AppError("Sự kiện chưa kết thúc, chưa thể đánh giá", "EVENT_NOT_ENDED");
  }

  await upsertEventRating(userId, eventId, stars, comment);
  return await getEventRatingSummary(eventId);
}


