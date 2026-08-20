export const CURRENCIES = [
  { code: 'INR', symbol: '₹',   rate: 1,       flag: '🇮🇳' },
  { code: 'USD', symbol: '$',   rate: 0.012,   flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',   rate: 0.011,   flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   rate: 0.0094,  flag: '🇬🇧' },
  { code: 'AED', symbol: 'د.إ', rate: 0.044,   flag: '🇦🇪' },
  { code: 'SGD', symbol: 'S$',  rate: 0.016,   flag: '🇸🇬' },
]

export function fmt(inr, cur) {
  const v = inr * cur.rate
  return `${cur.symbol}${v.toLocaleString('en-IN', {
    maximumFractionDigits: cur.code === 'INR' ? 0 : 2,
  })}`
}
