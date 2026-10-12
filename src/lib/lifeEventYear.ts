export const validLifeEventYear = (year: unknown, currentYear = new Date().getFullYear()): year is number =>
  typeof year === 'number' && Number.isInteger(year) && year >= 1 && year <= currentYear;