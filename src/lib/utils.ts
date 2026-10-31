import { clsx, type ClassValue } from "clsx";
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const TEAM_COLORS = ["#ff3d71", "#3dc9ff", "#ffb800", "#7cff6b", "#b46bff", "#ff8a3d", "#ff6bd6", "#6bffe1"];

export function initials(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
}

export function kd(kills: number, deaths: number) {
  return deaths === 0 ? kills.toFixed(1) : (kills / deaths).toFixed(2);
}
