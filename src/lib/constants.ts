import type { DeliveryStatus, OrderStatus, PaymentStatus, Role, VerificationStatus } from "./types";

/** Visual tone of a status tag; the tones map onto the Organic design system's tag variants. */
export type Tone = "accent" | "sage" | "neutral" | "outline" | "danger" | "solid-sage" | "solid-dark";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Awaiting farmer", tone: "neutral" },
  ACCEPTED: { label: "Awaiting payment", tone: "accent" },
  PAYMENT_PENDING: { label: "Payment pending", tone: "accent" },
  PAID: { label: "Paid · held", tone: "sage" },
  READY_FOR_PICKUP: { label: "Ready for pickup", tone: "sage" },
  PICKED_UP: { label: "Picked up", tone: "accent" },
  IN_TRANSIT: { label: "On the road", tone: "accent" },
  DELIVERED: { label: "Check window", tone: "sage" },
  COMPLETED: { label: "Completed", tone: "solid-sage" },
  REJECTED: { label: "Declined", tone: "outline" },
  CANCELLED: { label: "Cancelled", tone: "outline" },
  EXPIRED: { label: "Expired", tone: "outline" },
  DISPUTED: { label: "In dispute", tone: "solid-dark" },
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "PENDING", "ACCEPTED", "PAYMENT_PENDING", "PAID", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "COMPLETED",
];

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "accent" },
  HELD: { label: "Held", tone: "sage" },
  FAILED: { label: "Failed", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "outline" },
  EXPIRED: { label: "Expired", tone: "outline" },
  RELEASED: { label: "Released", tone: "solid-sage" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
  PARTIALLY_REFUNDED: { label: "Part refunded", tone: "neutral" },
};

export const DELIVERY_STATUS: Record<DeliveryStatus, { label: string; tone: Tone }> = {
  OPEN: { label: "Needs driver", tone: "accent" },
  ASSIGNED: { label: "Assigned", tone: "neutral" },
  PICKED_UP: { label: "Picked up", tone: "accent" },
  IN_TRANSIT: { label: "On the road", tone: "accent" },
  DELIVERED: { label: "Delivered", tone: "solid-sage" },
  CANCELLED: { label: "Cancelled", tone: "outline" },
};

export const VERIFICATION_STATUS: Record<VerificationStatus, { label: string; tone: Tone }> = {
  UNVERIFIED: { label: "Unverified", tone: "outline" },
  PENDING: { label: "Ready for review", tone: "sage" },
  INFO_NEEDED: { label: "Info needed", tone: "accent" },
  VERIFIED: { label: "Verified", tone: "solid-sage" },
  REJECTED: { label: "Rejected", tone: "solid-dark" },
};

export const ROLE_LABEL: Record<Role, string> = {
  FARMER: "Farmer",
  BUYER: "Buyer",
  DRIVER: "Driver",
  ADMIN: "Admin",
};

export const LISTING_STATUS: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "outline" },
  ACTIVE: { label: "Live", tone: "solid-sage" },
  PAUSED: { label: "Paused", tone: "neutral" },
  SOLD_OUT: { label: "Sold out", tone: "accent" },
  EXPIRED: { label: "Expired", tone: "outline" },
  REMOVED: { label: "Removed", tone: "outline" },
  SUSPENDED: { label: "Suspended", tone: "solid-dark" },
};

export const DISPUTE_TYPE_LABEL: Record<string, string> = {
  LESS_THAN_ORDERED: "Short weight",
  POOR_QUALITY: "Poor quality",
  DAMAGED: "Damaged",
  WRONG_PRODUCT: "Wrong product",
  NOT_DELIVERED: "Not delivered",
  PAYMENT_ISSUE: "Payment issue",
  OTHER: "Other",
};

export const DOCUMENT_LABEL: Record<string, string> = {
  FAYDA_ID: "Fayda ID",
  FARM_PHOTO: "Farm photo",
  KEBELE_LETTER: "Kebele letter",
  COOPERATIVE_LICENSE: "Cooperative licence",
  BUSINESS_LICENSE: "Business licence",
  TIN_CERTIFICATE: "TIN certificate",
  DRIVING_LICENSE: "Driving licence",
  VEHICLE_REGISTRATION: "Vehicle registration",
  VEHICLE_PHOTO: "Vehicle photo",
  OTHER: "Other document",
};

export const ORDER_FILTERS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "all", label: "All", statuses: [] },
  { key: "awaiting", label: "Awaiting farmer", statuses: ["PENDING"] },
  { key: "payment", label: "Awaiting payment", statuses: ["ACCEPTED", "PAYMENT_PENDING"] },
  { key: "transit", label: "In transit", statuses: ["PAID", "READY_FOR_PICKUP", "PICKED_UP", "IN_TRANSIT"] },
  { key: "window", label: "Check window", statuses: ["DELIVERED"] },
  { key: "disputed", label: "Disputed", statuses: ["DISPUTED"] },
  { key: "done", label: "Closed", statuses: ["COMPLETED", "REJECTED", "CANCELLED", "EXPIRED"] },
];
