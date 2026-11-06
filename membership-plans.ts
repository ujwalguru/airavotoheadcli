export type PublicMembershipPlan = {
  id?: string;
  name: string;
  category: string;
  membershipPrice: number;
  duration: string;
  validity: string;
  benefits: string;
  notice: string;
  regularPrice?: number | null;
  discountPercent?: number | null;
};

export type MembershipPlanValidation =
  | { valid: true; plans: PublicMembershipPlan[] }
  | { valid: false; message: string };

const MAX_PLANS = 25;
const MAX_ID_LENGTH = 120;
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
  if (!text) return fallback;
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

function normalizeDuration(source: Record<string, unknown>): string | null {
  const hasNumericDuration = source.durationHours !== undefined && source.durationHours !== null
    || source.totalHours !== undefined && source.totalHours !== null;
  const numericHours = finiteNumber(source.durationHours ?? source.totalHours);
  let displayHours: number | null = null;
  if (source.duration !== undefined && source.duration !== null) {
    const value = boundedText(source.duration, 80);
    const match = value?.match(/^(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)$/i);
    if (!match) return null;
    displayHours = Number(match[1]);
  }

  if (hasNumericDuration) {
    if (numericHours === null || numericHours <= 0 || numericHours > MAX_DURATION_HOURS) return null;
    if (displayHours !== null && Math.round(displayHours * 100) !== Math.round(numericHours * 100)) return null;
    return `${Math.round(numericHours * 100) / 100} hours`;
  }
  if (displayHours === null || !Number.isFinite(displayHours) || displayHours <= 0 || displayHours > MAX_DURATION_HOURS) return null;
  return `${Math.round(displayHours * 100) / 100} hours`;
}

function normalizeValidity(source: Record<string, unknown>): string | null {
  const hasNumericValidity = source.validityDays !== undefined && source.validityDays !== null;
  const numericDays = finiteNumber(source.validityDays);
  let displayDays: number | null = null;
  if (source.validity !== undefined && source.validity !== null) {
    const value = boundedText(source.validity, 80);
    const match = value?.match(/^(\d+)\s*days?$/i);
    if (!match) return null;
    displayDays = Number(match[1]);
  }

  if (hasNumericValidity) {
    if (numericDays === null || !Number.isInteger(numericDays) || numericDays < 1 || numericDays > MAX_VALIDITY_DAYS) return null;
    if (displayDays !== null && displayDays !== numericDays) return null;
    return `${numericDays} days`;
  }
  if (displayDays === null || !Number.isInteger(displayDays) || displayDays < 1 || displayDays > MAX_VALIDITY_DAYS) return null;
  return `${displayDays} days`;
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
    const id = source.id === undefined || source.id === null
      ? undefined
      : boundedText(String(source.id), MAX_ID_LENGTH);
    const name = boundedText(source.name, MAX_NAME_LENGTH);
    const category = boundedText(source.category, MAX_CATEGORY_LENGTH, "ALL");
    const benefits = boundedText(source.benefits, MAX_COPY_LENGTH, "");
    const notice = boundedText(source.notice, MAX_COPY_LENGTH, "");
    const duration = normalizeDuration(source);
    const validity = normalizeValidity(source);
    const membershipPrice = finiteNumber(source.membershipPrice);
    const regularPrice = source.regularPrice === null || source.regularPrice === undefined
      ? null
      : finiteNumber(source.regularPrice);

    if (id === null || (id !== undefined && !id)) {
      return { valid: false, message: `membershipPlans[${index}].id must be a non-empty value of at most ${MAX_ID_LENGTH} characters.` };
    }
    if (name === null || !name) {
      return { valid: false, message: `membershipPlans[${index}].name is required and must be at most ${MAX_NAME_LENGTH} characters.` };
    }
    if (category === null || benefits === null || notice === null) {
      return { valid: false, message: `membershipPlans[${index}] contains text that is too long or has an invalid type.` };
    }
    if (!duration) {
      return { valid: false, message: `membershipPlans[${index}].duration must be a positive number of hours.` };
    }
    if (!validity) {
      return { valid: false, message: `membershipPlans[${index}].validity must be a positive number of days.` };
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
    const plan: PublicMembershipPlan = {
      name,
      category,
      membershipPrice: safeMembershipPrice,
      duration,
      validity,
      benefits,
      notice,
    };
    if (id !== undefined) plan.id = id;
    if (source.regularPrice !== undefined) {
      plan.regularPrice = safeRegularPrice;
      plan.discountPercent = safeRegularPrice && safeRegularPrice > 0
        ? Math.round(Math.max(0, (safeRegularPrice - safeMembershipPrice) / safeRegularPrice * 100) * 10) / 10
        : null;
    }
    plans.push(plan);
  }

  return { valid: true, plans };
}
