import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const YEAR_ONLY = /^\d{4}$/
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

function isPlaceholderYearDate(year: string, month: string, day: string) {
  return month === "00" || (month === "01" && (day === "01" || day === "00"))
}

/** Format an obituary date. Year-only values stay as the year, without "1. siječnja". */
export function formatObituaryDate(
  dateString?: string | null,
  options?: { yearOnlyIfJan1?: boolean }
): string | null {
  if (!dateString || !String(dateString).trim()) return null

  const raw = String(dateString).trim()
  if (YEAR_ONLY.test(raw)) return raw

  const iso = ISO_DATE.exec(raw)
  if (iso) {
    const [, year, month, day] = iso
    if (options?.yearOnlyIfJan1 && isPlaceholderYearDate(year, month, day)) {
      return year
    }
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null

  if (options?.yearOnlyIfJan1 && date.getMonth() === 0 && date.getDate() === 1) {
    return String(date.getFullYear())
  }

  return date.toLocaleDateString("hr-HR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatLifespan(birth?: string | null, death?: string | null): string {
  const birthFormatted = formatObituaryDate(birth, { yearOnlyIfJan1: true })
  const deathFormatted = formatObituaryDate(death)

  if (birthFormatted && deathFormatted) return `${birthFormatted} - ${deathFormatted}`
  if (deathFormatted) return deathFormatted
  if (birthFormatted) return birthFormatted
  return ""
}

export function formatObituaryLocation(
  birthPlace?: string | null,
  deathPlace?: string | null
): string | null {
  const parts = [birthPlace, deathPlace]
    .map((place) => place?.trim())
    .filter((place): place is string => Boolean(place))

  return parts.length ? parts.join(" • ") : null
}

export function calculateObituaryAge(
  birthDate?: string | null,
  deathDate?: string | null
): number | null {
  if (!birthDate?.trim() || !deathDate?.trim()) return null

  const birthYear = YEAR_ONLY.test(birthDate.trim())
    ? Number(birthDate.trim())
    : new Date(birthDate).getFullYear()
  const deathYear = YEAR_ONLY.test(deathDate.trim())
    ? Number(deathDate.trim())
    : new Date(deathDate).getFullYear()

  if (!Number.isFinite(birthYear) || !Number.isFinite(deathYear)) return null
  return deathYear - birthYear
}

/** Format a blog date as d/m/yyyy without exposing the stored time value. */
export function formatBlogDate(dateValue?: string | null): string {
  if (!dateValue?.trim()) return ""

  const raw = dateValue.trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (iso) return `${Number(iso[3])}/${Number(iso[2])}/${iso[1]}`

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw

  return new Intl.DateTimeFormat("hr-HR", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(date).replace(/\s/g, "")
}
