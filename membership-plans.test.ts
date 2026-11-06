import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildCafePublicDetails, validatePublicMembershipPlans } from "./membership-plans.js";
import { CafeMembershipPlansPanel } from "./src/components/CafeMembershipPlansPanel.js";

const userMappedPlan = {
  id: "plan-10-hour",
  name: "Gaming Cafe 10 Hours",
  category: "PC",
  membershipPrice: 2_000,
  durationHours: 10,
  duration: "10 hours",
  validityDays: 30,
  validity: "30 days",
  benefits: "10 hours of PC gaming\nPriority booking",
  notice: "Valid for 30 days",
};
const expectedPublicPlan = {
  id: userMappedPlan.id,
  name: userMappedPlan.name,
  category: userMappedPlan.category,
  membershipPrice: userMappedPlan.membershipPrice,
  duration: userMappedPlan.duration,
  validity: userMappedPlan.validity,
  benefits: userMappedPlan.benefits,
  notice: userMappedPlan.notice,
};

const mapped = validatePublicMembershipPlans([{
  ...userMappedPlan,
  memberName: "must never be public",
  phone: "0000000000",
  purchases: [{ paymentMethod: "cash" }],
}]);
assert.equal(mapped.valid, true);
if (mapped.valid) {
  assert.deepEqual(mapped.plans, [expectedPublicPlan]);
  assert.equal("memberName" in mapped.plans[0], false);
  assert.equal("phone" in mapped.plans[0], false);
  assert.equal("purchases" in mapped.plans[0], false);
}

const legacy = validatePublicMembershipPlans([{
  name: "Legacy Hour Pass",
  category: "",
  durationHours: 5,
  validityDays: 14,
  regularPrice: 1_500,
  membershipPrice: 1_000,
  benefits: "Five hours of PC gaming",
  notice: "",
}]);
assert.equal(legacy.valid, true);
if (legacy.valid) {
  assert.deepEqual(legacy.plans[0], {
    name: "Legacy Hour Pass",
    category: "ALL",
    membershipPrice: 1_000,
    duration: "5 hours",
    validity: "14 days",
    benefits: "Five hours of PC gaming",
    notice: "",
    regularPrice: 1_500,
    discountPercent: 33.3,
  });
}

assert.deepEqual(validatePublicMembershipPlans([]), { valid: true, plans: [] });
assert.equal(validatePublicMembershipPlans(undefined).valid, false);
assert.equal(validatePublicMembershipPlans([{ ...userMappedPlan, membershipPrice: -1 }]).valid, false);
assert.equal(validatePublicMembershipPlans([{ ...userMappedPlan, validity: "0 days" }]).valid, false);
assert.equal(validatePublicMembershipPlans([{ ...userMappedPlan, validityDays: 0 }]).valid, false);
assert.equal(validatePublicMembershipPlans([{ ...userMappedPlan, validityDays: 31 }]).valid, false);
assert.equal(validatePublicMembershipPlans([{ ...userMappedPlan, duration: "free" }]).valid, false);
assert.equal(validatePublicMembershipPlans([{ ...userMappedPlan, benefits: "x".repeat(1_001) }]).valid, false);
assert.equal(validatePublicMembershipPlans(Array.from({ length: 26 }, (_, i) => ({ ...userMappedPlan, id: `plan-${i}` }))).valid, false);

// Admin live-status details must retain plans from the saved public metadata.
const adminCafeDetails = buildCafePublicDetails(
  { city: "Bhuj", membershipPlans: [expectedPublicPlan] },
  { categories: ["Gaming"] },
);
assert.deepEqual(adminCafeDetails.membershipPlans, [expectedPublicPlan]);
assert.equal(adminCafeDetails.city, "Bhuj");
assert.deepEqual(adminCafeDetails.categories, ["Gaming"]);

// Regression: the café detail panel visibly renders every requested plan field.
const renderedPanel = renderToStaticMarkup(createElement(CafeMembershipPlansPanel, { plans: [expectedPublicPlan] }));
for (const expectedText of [
  "Membership Plans",
  "Gaming Cafe 10 Hours",
  "PC",
  "Membership price",
  "₹2,000",
  "Duration",
  "10 hours",
  "Validity",
  "30 days",
  "Benefits",
  "10 hours of PC gaming",
  "Priority booking",
  "Important notice",
  "Valid for 30 days",
]) {
  assert.ok(renderedPanel.includes(expectedText), `Dashboard membership panel should render: ${expectedText}`);
}
assert.equal(renderToStaticMarkup(createElement(CafeMembershipPlansPanel, { plans: [] })), "");

console.log("Membership-plan validation, admin metadata, and dashboard display tests passed.");
