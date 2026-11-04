import assert from "node:assert/strict";
import { validatePublicMembershipPlans } from "./membership-plans.js";

const validPlan = {
  name: "Gaming Cafe 10 Hours",
  category: "PC",
  durationHours: 10,
  validityDays: 30,
  regularPrice: 3_000,
  membershipPrice: 2_000,
  benefits: "10 hours of PC gaming",
  notice: "Valid for 30 days",
};

const valid = validatePublicMembershipPlans([{
  ...validPlan,
  memberName: "must never be public",
  phone: "0000000000",
  purchases: [{ paymentMethod: "cash" }],
}]);
assert.equal(valid.valid, true);
if (valid.valid) {
  assert.deepEqual(valid.plans, [{
    ...validPlan,
    discountPercent: 33.3,
  }]);
  assert.equal("memberName" in valid.plans[0], false);
  assert.equal("phone" in valid.plans[0], false);
  assert.equal("purchases" in valid.plans[0], false);
}

const fallbackHours = validatePublicMembershipPlans([{
  ...validPlan,
  durationHours: undefined,
  totalHours: 5,
  regularPrice: null,
}]);
assert.equal(fallbackHours.valid, true);
if (fallbackHours.valid) {
  assert.equal(fallbackHours.plans[0].durationHours, 5);
  assert.equal(fallbackHours.plans[0].regularPrice, null);
  assert.equal(fallbackHours.plans[0].discountPercent, null);
}

assert.deepEqual(validatePublicMembershipPlans([]), { valid: true, plans: [] });
assert.equal(validatePublicMembershipPlans(undefined).valid, false);
assert.equal(validatePublicMembershipPlans([{ ...validPlan, membershipPrice: -1 }]).valid, false);
assert.equal(validatePublicMembershipPlans([{ ...validPlan, validityDays: 0 }]).valid, false);
assert.equal(validatePublicMembershipPlans([{ ...validPlan, benefits: "x".repeat(1_001) }]).valid, false);
assert.equal(validatePublicMembershipPlans(Array.from({ length: 26 }, (_, i) => ({ ...validPlan, name: `Plan ${i}` }))).valid, false);

console.log("Membership-plan validation tests passed.");
