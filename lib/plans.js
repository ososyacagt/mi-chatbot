export const PLANS = {
  basic: {
    nombre: "Basic",
    mensajesLimite: 100,
    precio: "$9.99/mes",
    color: "#6366f1",
  },
  pro: {
    nombre: "Pro",
    mensajesLimite: 1000,
    precio: "$29.99/mes",
    color: "#0ea5e9",
  },
  enterprise: {
    nombre: "Enterprise",
    mensajesLimite: 10000,
    precio: "$99.99/mes",
    color: "#f97316",
  },
  unlimited: {
    nombre: "Unlimited",
    mensajesLimite: -1,
    precio: "Custom",
    color: "#22c55e",
  },
};

export function getPlanInfo(planId) {
  return PLANS[planId] || PLANS.basic;
}
