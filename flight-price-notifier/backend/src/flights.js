/**
 * Mock flight price engine.
 * In production, replace with Amadeus, Skyscanner, or Google Flights API.
 *
 * Prices vary realistically based on route, dates, and a small random component
 * to simulate market fluctuations — so the agent will encounter real savings
 * opportunities when you add a trip at a higher price.
 */

const BASE_PRICES = {
  // [origin-destination]: base economy price per person
  'JFK-LAX': 280, 'LAX-JFK': 280,
  'JFK-LHR': 520, 'LHR-JFK': 520,
  'JFK-CDG': 510, 'CDG-JFK': 510,
  'JFK-NRT': 780, 'NRT-JFK': 780,
  'LAX-ORD': 190, 'ORD-LAX': 190,
  'LAX-MIA': 220, 'MIA-LAX': 220,
  'ORD-MIA': 160, 'MIA-ORD': 160,
  'SFO-LAX': 110, 'LAX-SFO': 110,
  'SFO-ORD': 240, 'ORD-SFO': 240,
  'BOS-MIA': 180, 'MIA-BOS': 180,
  'ATL-LHR': 600, 'LHR-ATL': 600,
  'DFW-CDG': 580, 'CDG-DFW': 580,
};

const CABIN_MULTIPLIERS = {
  economy: 1,
  premium_economy: 1.8,
  business: 3.5,
  first: 6,
};

const AIRLINES = ['Delta', 'United', 'American', 'British Airways', 'Air France', 'Lufthansa', 'Emirates'];

function getBasePrice(origin, destination) {
  const key = `${origin.toUpperCase()}-${destination.toUpperCase()}`;
  return BASE_PRICES[key] ?? 350; // fallback for unknown routes
}

function seededRandom(seed) {
  // Simple deterministic pseudo-random based on string seed
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) / 0xffffffff);
}

function marketVariation(origin, destination, departDate) {
  // Simulate current-day market price — varies day to day but is deterministic
  const today = new Date().toISOString().split('T')[0];
  const seed = `${origin}-${destination}-${departDate}-${today}`;
  const rand = seededRandom(seed);
  // ±25% variation
  return 0.75 + rand * 0.5;
}

export function searchFlightPrices({ origin, destination, depart_date, return_date, cabin, passengers }) {
  const base = getBasePrice(origin, destination);
  const cabinMult = CABIN_MULTIPLIERS[cabin] ?? 1;
  const pax = passengers ?? 1;
  const variation = marketVariation(origin, destination, depart_date);

  // Generate 4 realistic fare options
  const fares = AIRLINES.slice(0, 4).map((airline, i) => {
    const airlineVariation = 0.9 + i * 0.07; // spread between airlines
    const price = Math.round(base * cabinMult * variation * airlineVariation * pax * 100) / 100;
    const fareId = `FARE-${origin}-${destination}-${depart_date.replace(/-/g, '')}-${airline.slice(0, 2).toUpperCase()}-${i}`;
    return {
      fare_id: fareId,
      airline,
      cabin,
      price_per_person: Math.round((price / pax) * 100) / 100,
      total_price: price,
      depart_date,
      return_date: return_date ?? null,
      seats_remaining: Math.floor(2 + seededRandom(fareId) * 7),
      refundable: i < 2, // first two options are refundable
    };
  });

  return {
    origin,
    destination,
    depart_date,
    cabin,
    passengers: pax,
    fares: fares.sort((a, b) => a.total_price - b.total_price),
    searched_at: new Date().toISOString(),
  };
}

let rebookCounter = 1000;

export function mockRebook(oldBookingRef, newFareId, newPrice) {
  rebookCounter++;
  return {
    success: true,
    old_booking_ref: oldBookingRef,
    new_booking_ref: `RB${rebookCounter}`,
    new_fare_id: newFareId,
    new_price: newPrice,
    rebooked_at: new Date().toISOString(),
    message: 'Booking cancelled and new ticket issued.',
  };
}
