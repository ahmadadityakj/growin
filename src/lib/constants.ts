export const LEAD_STATUSES = [
  "new",
  "researching",
  "qualified",
  "contacted",
  "replied",
  "interested",
  "follow_up",
  "negotiation",
  "converted",
  "not_interested",
  "invalid",
] as const;

export const CHANNELS = ["email", "whatsapp"] as const;

export const CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
] as const;

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;

export const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  researching: "bg-purple-100 text-purple-800",
  qualified: "bg-cyan-100 text-cyan-800",
  contacted: "bg-amber-100 text-amber-800",
  replied: "bg-indigo-100 text-indigo-800",
  interested: "bg-emerald-100 text-emerald-800",
  follow_up: "bg-orange-100 text-orange-800",
  negotiation: "bg-yellow-100 text-yellow-800",
  converted: "bg-green-100 text-green-800",
  not_interested: "bg-gray-100 text-gray-800",
  invalid: "bg-red-100 text-red-800",
};

export const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-blue-100 text-blue-800",
  archived: "bg-slate-100 text-slate-800",
};
