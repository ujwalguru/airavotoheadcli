export type PublicMembershipPlan = {
  name: string;
  category: string;
  durationHours: number;
  validityDays: number;
  regularPrice: number | null;
  membershipPrice: number;
  discountPercent: number | null;
  benefits: string;
  notice: string;
};

export type MembershipPlanValidation =
  | { valid: true; plans: PublicMembershipPlan[] }
  | { valid: false; message: string };

const MAX_PLANS = 25;
const MAX_NAME_LENGTH = 120;
const MAX_CATEGORY_LENGTH = 80;
const MAX_COPY_LENGTH = 1_000;
const MAX_DURATION_HOURS = 10_000;
const MAX_VALIDITY_DAYS = 3_650;
const MAX_PRICE = 1_000_000_000;

function boundedText(value: unknown, maxLength: number, fallback = ""): string | null {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length <= maxLength ? text : null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundedMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Validate and whitelist website-visible plans from a POS heartbeat. */
export function validatePublicMembershipPlans(input: unknown): MembershipPlanValidation {
  if (!Array.isArray(input)) {
    return { valid: false, message: "membershipPlans must be an array." };
  }
  if (input.length > MAX_PLANS) {
    return { valid: false, message: `membershipPlans may contain at most ${MAX_PLANS} plans.` };
  }

  const plans: PublicMembershipPlan[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const raw = input[index];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { valid: false, message: `membershipPlans[${index}] must be an object.` };
    }

    const source = raw as Record<string, unknown>;
    const name = boundedText(source.name, MAX_NAME_LENGTH);
    const category = boundedText(source.category, MAX_CATEGORY_LENGTH, "ALL");
    const benefits = boundedText(source.benefits, MAX_COPY_LENGTH, "");
    const notice = boundedText(source.notice, MAX_COPY_LENGTH, "");
    const durationHours = finiteNumber(source.durationHours ?? source.totalHours);
    const validityDays = finiteNumber(source.validityDays);
    const membershipPrice = finiteNumber(source.membershipPrice);
    const regularPrice = source.regularPrice === null || source.regularPrice === undefined
      ? null
      : finiteNumber(source.regularPrice);

    if (name === null || !name) {
      return { valid: false, message: `membershipPlans[${index}].name is required and must be at most ${MAX_NAME_LENGTH} characters.` };
    }
    if (category === null || benefits === null || notice === null) {
      return { valid: false, message: `membershipPlans[${index}] contains text that is too long or has an invalid type.` };
    }
    if (durationHours === null || durationHours <= 0 || durationHours > MAX_DURATION_HOURS) {
      return { valid: false, message: `membershipPlans[${index}].durationHours must be greater than 0 and no more than ${MAX_DURATION_HOURS}.` };
    }
    if (validityDays === null || !Number.isInteger(validityDays) || validityDays < 1 || validityDays > MAX_VALIDITY_DAYS) {
      return { valid: false, message: `membershipPlans[${index}].validityDays must be an integer from 1 to ${MAX_VALIDITY_DAYS}.` };
    }
    if (membershipPrice === null || membershipPrice <= 0 || membershipPrice > MAX_PRICE) {
      return { valid: false, message: `membershipPlans[${index}].membershipPrice must be greater than 0 and no more than ${MAX_PRICE}.` };
    }
    if (source.regularPrice !== null && source.regularPrice !== undefined
      && (regularPrice === null || regularPrice < 0 || regularPrice > MAX_PRICE)) {
      return { valid: false, message: `membershipPlans[${index}].regularPrice must be null or a non-negative amount no more than ${MAX_PRICE}.` };
    }

    const safeRegularPrice = regularPrice === null ? null : roundedMoney(regularPrice);
    const safeMembershipPrice = roundedMoney(membershipPrice);
    const discountPercent = safeRegularPrice && safeRegularPrice > 0
      ? Math.round(Math.max(0, (safeRegularPrice - safeMembershipPrice) / safeRegularPrice * 100) * 10) / 10
      : null;

    plans.push({
      name,
      category,
      durationHours: Math.round(durationHours * 100) / 100,
      validityDays,
      regularPrice: safeRegularPrice,
      membershipPrice: safeMembershipPrice,
      discountPercent,
      benefits,
      notice,
    });
  }

  return { valid: true, plans };
}
