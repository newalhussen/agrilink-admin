/** Shapes of the AgriLink REST API (see backend/README.md). Only fields the admin app uses are listed. */

export type Role = "FARMER" | "BUYER" | "DRIVER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
export type VerificationStatus = "UNVERIFIED" | "PENDING" | "INFO_NEEDED" | "VERIFIED" | "REJECTED";

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
}

export interface User {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  role: Role;
  accountStatus: AccountStatus;
  verificationStatus: VerificationStatus;
  phoneVerified: boolean;
  preferredLanguage: "en" | "am" | "om";
  profilePhotoUrl: string | null;
  ratingAverage: number | string;
  ratingCount: number;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: User;
}

export interface Address {
  regionId?: string | null;
  regionName?: string | null;
  zone?: string | null;
  woreda?: string | null;
  town?: string | null;
  addressLine?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Region {
  id: string;
  code: string;
  nameEn: string;
  nameAm: string | null;
  nameOm: string | null;
}

export interface ProductSummary {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string | null;
  nameOm: string | null;
  categoryId: string;
  categoryName: string;
  defaultUnit: string;
  description: string | null;
  active: boolean;
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string | null;
  nameOm: string | null;
  icon: string | null;
  sortOrder: number;
  active: boolean;
}

export interface VerificationDocument {
  id: string;
  type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  fileUrl: string;
  note: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
}

export interface VerificationReview {
  id: string;
  reviewerId: string;
  decision: "APPROVE" | "REJECT" | "REQUEST_INFO";
  previousStatus: VerificationStatus;
  newStatus: VerificationStatus;
  note: string | null;
  at: string;
}

export interface FarmerProfile {
  userId: string;
  farmerType: "INDIVIDUAL" | "COOPERATIVE";
  farmName: string | null;
  memberCount: number | null;
  address: Address | null;
  landSizeHectares: number | string | null;
  irrigated: boolean;
  expectedMonthlySupplyKg: number | string | null;
  bio: string | null;
  faydaIdNumber: string | null;
  payoutMethod: string | null;
  payoutAccountName: string | null;
  payoutAccountNumber: string | null;
  completedTrades: number;
  products: ProductSummary[];
}

export interface BuyerProfile {
  userId: string;
  buyerType: string;
  businessName: string | null;
  contactPerson: string | null;
  tinNumber: string | null;
  tradeLicenseNumber: string | null;
  address: Address | null;
  deliveryInstructions: string | null;
  completedOrders: number;
}

export interface DriverProfile {
  userId: string;
  licenseNumber: string | null;
  licenseExpiryDate: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  vehicleMakeModel: string | null;
  vehicleYear: number | null;
  capacityKg: number | string | null;
  refrigerated: boolean;
  regionName: string | null;
  availability: "AVAILABLE" | "BUSY" | "OFFLINE";
  payoutMethod: string | null;
  payoutAccountNumber: string | null;
  completedDeliveries: number;
}

export interface UserDetail {
  user: User;
  profile: (FarmerProfile | BuyerProfile | DriverProfile) | null;
  documents: VerificationDocument[];
  reviews: VerificationReview[];
  walletBalance: number | string | null;
  statusReason: string | null;
}

export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED"
  | "DISPUTED";

export interface Deadlines {
  farmerResponseDeadline: string | null;
  paymentDeadline: string | null;
  checkWindowEndsAt: string | null;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  itemsSummary: string;
  itemCount: number;
  buyerName: string;
  farmerName: string;
  driverName: string | null;
  totalAmount: number | string;
  currency: string;
  totalWeightKg: number | string;
  deliveryTown: string | null;
  deadlines: Deadlines;
  createdAt: string;
  allowedActions: string[];
}

export interface PartyView {
  id: string;
  fullName: string;
  displayName: string | null;
  phone: string | null;
  ratingAverage: number | string;
  ratingCount: number;
  verified: boolean;
}

export interface OrderItem {
  id: string;
  listingId: string;
  productName: string;
  qualityGrade: string | null;
  unit: string;
  quantity: number | string;
  unitPrice: number | string;
  lineTotal: number | string;
  weightKg: number | string;
}

export interface PaymentSummary {
  id: string;
  status: PaymentStatus;
  method: string;
  amount: number | string;
  failureReason: string | null;
  expiresAt: string | null;
}

export interface DeliverySummary {
  id: string;
  status: DeliveryStatus;
  driverFee: number | string;
  distanceKm: number | string | null;
  scheduledPickupDate: string | null;
  pickupCode: string | null;
  deliveryCode: string | null;
  pickedUpWeightKg: number | string | null;
  pickedUpCrateCount: number | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  statusReason: string | null;
  buyer: PartyView;
  farmer: PartyView;
  driver: PartyView | null;
  items: OrderItem[];
  amounts: { subtotal: number | string; deliveryFee: number | string; platformFee: number | string; total: number | string; currency: string };
  totalWeightKg: number | string;
  deliveryAddress: Address | null;
  deliveryContactName: string | null;
  deliveryContactPhone: string | null;
  pickupAddress: Address | null;
  requestedDeliveryDate: string | null;
  buyerNotes: string | null;
  deadlines: Deadlines;
  timestamps: Record<string, string | null>;
  allowedActions: string[];
  payment: PaymentSummary | null;
  delivery: DeliverySummary | null;
}

export interface TimelineEntry {
  from: OrderStatus | null;
  to: OrderStatus;
  at: string;
  actorRole: string;
  note: string | null;
}

export type PaymentStatus = "PENDING" | "HELD" | "FAILED" | "CANCELLED" | "EXPIRED" | "RELEASED" | "REFUNDED" | "PARTIALLY_REFUNDED";

export interface Payment {
  id: string;
  orderId: string;
  status: PaymentStatus;
  method: string;
  provider: string;
  transactionReference: string;
  amount: number | string;
  goodsAmount: number | string;
  deliveryAmount: number | string;
  platformFeeAmount: number | string;
  currency: string;
  failureReason: string | null;
  initiatedAt: string;
  paidAt: string | null;
  refundedAmount: number | string;
}

export interface AdminPayment {
  payment: Payment;
  payerId: string;
  providerReference: string | null;
  releasedFarmerAmount: number | string;
  releasedDriverAmount: number | string;
  platformFeeRetained: number | string;
  releasedAt: string | null;
}

export interface Payout {
  id: string;
  amount: number | string;
  method: string;
  destinationAccount: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED";
  failureReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface AdminPayout {
  payout: Payout;
  userId: string;
  destinationName: string | null;
  provider: string;
  providerReference: string | null;
}

export type DeliveryStatus = "OPEN" | "ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

export interface LoadLine {
  name: string;
  quantity: number | string;
  unit: string;
  weightKg: number | string;
}

export interface Stop {
  address: Address | null;
  contactName: string | null;
  contactPhone: string | null;
}

export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  status: DeliveryStatus;
  pickup: Stop | null;
  dropoff: Stop | null;
  distanceKm: number | string | null;
  totalWeightKg: number | string;
  driverFee: number | string;
  scheduledPickupDate: string | null;
  load: LoadLine[];
  driver: PartyView | null;
  pickupCode: string | null;
  deliveryCode: string | null;
  pickedUpWeightKg: number | string | null;
  pickedUpCrateCount: number | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  pickupFailedAttempts: number;
  deliveryFailedAttempts: number;
}

export interface DeliveryEvent {
  type: string;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  at: string;
}

export interface DriverOption {
  id: string;
  fullName: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  capacityKg: number | string;
  availability: string;
  activeJobs: number;
  verified: boolean;
}

export interface Listing {
  id: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "SOLD_OUT" | "EXPIRED" | "REMOVED" | "SUSPENDED";
  product: ProductSummary;
  title: string;
  description: string | null;
  qualityGrade: "A" | "B" | "C";
  qualityNotes: string | null;
  packaging: string | null;
  harvestDate: string | null;
  availableFrom: string;
  availableUntil: string | null;
  unit: string;
  unitWeightKg: number | string;
  quantityTotal: number | string;
  quantityAvailable: number | string;
  minOrderQuantity: number | string;
  pricePerUnit: number | string;
  currency: string;
  organic: boolean;
  address: Address | null;
  photos: { id: string; url: string; primary: boolean }[];
  farmer: { id: string; fullName: string; farmName: string | null; ratingAverage: number | string; ratingCount: number; completedTrades: number; verified: boolean };
  createdAt: string;
}

export interface PersonRef {
  id: string;
  fullName: string;
  role: Role;
}

export interface Dispute {
  id: string;
  disputeNumber: string;
  orderId: string;
  orderNumber: string;
  type: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED";
  description: string | null;
  claimedReceivedQuantityKg: number | string | null;
  orderedWeightKg: number | string;
  totalHeldAmount: number | string;
  raisedBy: PersonRef | null;
  against: PersonRef | null;
  dueAt: string;
  overdue: boolean;
  assignedAdminId: string | null;
  resolution: {
    type: "RELEASE_ALL" | "FULL_REFUND" | "PARTIAL";
    farmerAmount: number | string;
    driverAmount: number | string;
    buyerRefundAmount: number | string;
    platformRetainedAmount: number | string;
    notes: string | null;
    resolvedAt: string;
  } | null;
  evidence: { id: string; kind: string; note: string | null; fileUrl: string | null; submittedBy: PersonRef | null; createdAt: string }[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  referenceType: string | null;
  referenceId: string | null;
  read: boolean;
  createdAt: string;
}

export interface AttentionItem {
  kind: string;
  title: string;
  detail: string;
  referenceType: string | null;
  referenceId: string | null;
  count: number;
}

export interface Money {
  amount: number | string;
  currency: string;
}

export interface Dashboard {
  period: "TODAY" | "WEEK" | "MONTH";
  usersByRole: Record<string, number>;
  pendingVerifications: Record<string, number>;
  activeListings: number;
  ordersByStatus: Record<string, number>;
  ordersInPeriod: number;
  fundedOrderValueInPeriod: Money;
  heldInEscrow: Money;
  releasedInPeriod: Money;
  platformFeeInPeriod: Money;
  openDeliveryJobs: number;
  deliveriesOnTheRoad: number;
  openDisputes: number;
  overdueDisputes: number;
  failedPayouts: number;
  needsAttention: AttentionItem[];
}

export interface Report {
  from: string;
  to: string;
  daily: { date: string; orders: number; orderValue: number | string; completedOrders: number }[];
  topProducts: TopEntry[];
  topFarmers: TopEntry[];
  topDrivers: TopEntry[];
  ordersByStatus: Record<string, number>;
  totalOrderValue: number | string;
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number | string;
}

export interface TopEntry {
  id: string;
  name: string;
  count: number;
  value: number | string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  at: string;
}

export interface Settings {
  pricing: Record<string, string | number>;
  orders: Record<string, string | number>;
  otp: Record<string, string | number>;
  disputes: Record<string, string | number>;
  marketplace: Record<string, string | number | boolean>;
  payment: Record<string, string>;
  note: string;
}
