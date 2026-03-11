import Anthropic from '@anthropic-ai/sdk';
import db from './db.js';
import { searchFlightPrices, mockRebook } from './flights.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'search_flights',
    description:
      'Search for current flight prices for a given route and date. Returns available fares sorted by price.',
    input_schema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'IATA airport code, e.g. JFK' },
        destination: { type: 'string', description: 'IATA airport code, e.g. LAX' },
        depart_date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
        return_date: {
          type: 'string',
          description: 'ISO date YYYY-MM-DD for round trips. Omit for one-way.',
        },
        cabin: {
          type: 'string',
          enum: ['economy', 'premium_economy', 'business', 'first'],
          description: 'Cabin class to search',
        },
        passengers: { type: 'integer', description: 'Number of passengers' },
      },
      required: ['origin', 'destination', 'depart_date', 'cabin', 'passengers'],
    },
  },
  {
    name: 'get_cancellation_fee',
    description:
      'Get the cancellation/change fee for an existing booking. Returns the fee in USD.',
    input_schema: {
      type: 'object',
      properties: {
        booking_ref: { type: 'string', description: 'Booking reference number' },
      },
      required: ['booking_ref'],
    },
  },
  {
    name: 'rebook_flight',
    description:
      'Cancel the existing booking and rebook at a lower fare. Only call this when the net savings (price drop minus cancellation fee) are clearly positive and the refundable flag is true.',
    input_schema: {
      type: 'object',
      properties: {
        booking_ref: { type: 'string', description: 'Existing booking reference to cancel' },
        new_fare_id: { type: 'string', description: 'Fare ID from search_flights to book' },
        new_price: { type: 'number', description: 'Total new price to confirm before booking' },
        justification: {
          type: 'string',
          description: 'One-sentence justification for rebooking',
        },
      },
      required: ['booking_ref', 'new_fare_id', 'new_price', 'justification'],
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────

function executeTool(name, input, trip) {
  switch (name) {
    case 'search_flights': {
      const results = searchFlightPrices(input);
      return JSON.stringify(results);
    }

    case 'get_cancellation_fee': {
      // Return the stored cancellation fee for this booking
      const fee = trip ? trip.cancellation_fee : 0;
      return JSON.stringify({ booking_ref: input.booking_ref, cancellation_fee: fee, currency: 'USD' });
    }

    case 'rebook_flight': {
      if (!trip || !trip.refundable) {
        return JSON.stringify({ error: 'Ticket is non-refundable. Rebooking aborted.' });
      }
      const result = mockRebook(input.booking_ref, input.new_fare_id, input.new_price);
      return JSON.stringify(result);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ── Log helper ────────────────────────────────────────────────────────────────

function log(tripId, level, message) {
  db.prepare('INSERT INTO agent_logs (trip_id, level, message) VALUES (?, ?, ?)').run(
    tripId,
    level,
    message
  );
  console.log(`[agent][trip=${tripId}][${level}] ${message}`);
}

// ── Main agent entry point ────────────────────────────────────────────────────

export async function analyzeAndRebook(trip) {
  log(trip.id, 'info', `Starting price analysis for ${trip.origin}→${trip.destination} (${trip.depart_date})`);

  const systemPrompt = `You are a smart flight rebooking agent. Your job is to:
1. Search for current flight prices for a given trip
2. Compare them to the customer's booked price
3. Factor in cancellation/change fees
4. Rebook ONLY if the net savings are positive (price drop > cancellation fee) AND the ticket is refundable
5. Be conservative — only rebook when savings are meaningful (at least $20 net after fees)

Always explain your reasoning clearly. If you decide NOT to rebook, explain why.`;

  const userMessage = `
Analyze this booked trip and determine if it should be automatically rebooked at a lower price:

- Trip: ${trip.label}
- Route: ${trip.origin} → ${trip.destination}
- Depart: ${trip.depart_date}${trip.return_date ? ` | Return: ${trip.return_date}` : ' (one-way)'}
- Cabin: ${trip.cabin}, Passengers: ${trip.passengers}
- Original booked price: $${trip.booked_price.toFixed(2)}
- Current known price: $${trip.current_price.toFixed(2)}
- Booking reference: ${trip.booking_ref}
- Refundable ticket: ${trip.refundable ? 'Yes' : 'No'}

Please:
1. Search for current prices
2. Get the cancellation fee for booking ref ${trip.booking_ref}
3. Calculate net savings (price difference minus cancellation fee)
4. Rebook if worthwhile, otherwise explain why not
`.trim();

  const messages = [{ role: 'user', content: userMessage }];

  let lastResponse = null;
  let rebookEvent = null;

  // Agentic loop with Claude Opus 4.6 + adaptive thinking + streaming
  while (true) {
    log(trip.id, 'info', 'Calling Claude...');

    const stream = await client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    // Stream thinking + text to logs
    let currentBlockType = null;
    let buffer = '';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        currentBlockType = event.content_block.type;
        buffer = '';
        if (currentBlockType === 'thinking') log(trip.id, 'thinking', '[reasoning...]');
      }
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'thinking_delta') {
          buffer += event.delta.thinking;
        } else if (event.delta.type === 'text_delta') {
          buffer += event.delta.text;
        }
      }
      if (event.type === 'content_block_stop') {
        if (currentBlockType === 'thinking' && buffer) {
          log(trip.id, 'thinking', buffer.slice(0, 500) + (buffer.length > 500 ? '…' : ''));
        } else if (currentBlockType === 'text' && buffer) {
          log(trip.id, 'analysis', buffer);
        }
      }
    }

    lastResponse = await stream.finalMessage();

    if (lastResponse.stop_reason === 'end_turn') {
      log(trip.id, 'info', 'Analysis complete.');
      break;
    }

    if (lastResponse.stop_reason === 'tool_use') {
      const toolUseBlocks = lastResponse.content.filter((b) => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: lastResponse.content });

      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        log(trip.id, 'tool', `Calling ${toolUse.name}(${JSON.stringify(toolUse.input)})`);
        const result = executeTool(toolUse.name, toolUse.input, trip);
        log(trip.id, 'tool_result', `${toolUse.name} → ${result.slice(0, 200)}`);

        // Capture rebook action
        if (toolUse.name === 'rebook_flight') {
          const parsed = JSON.parse(result);
          if (parsed.success) {
            const savings = trip.current_price - toolUse.input.new_price;
            rebookEvent = {
              trip_id: trip.id,
              old_price: trip.current_price,
              new_price: toolUse.input.new_price,
              savings,
              new_booking_ref: parsed.new_booking_ref,
              agent_reasoning: toolUse.input.justification,
            };
          }
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      messages.push({ role: 'user', content: toolResults });
    }
  }

  // Persist rebook event and update trip if rebooking happened
  if (rebookEvent) {
    db.prepare(`
      INSERT INTO rebook_events (trip_id, old_price, new_price, savings, new_booking_ref, agent_reasoning)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      rebookEvent.trip_id,
      rebookEvent.old_price,
      rebookEvent.new_price,
      rebookEvent.savings,
      rebookEvent.new_booking_ref,
      rebookEvent.agent_reasoning
    );

    db.prepare(`
      UPDATE watched_trips
      SET booked_price = ?, current_price = ?, booking_ref = ?
      WHERE id = ?
    `).run(rebookEvent.new_price, rebookEvent.new_price, rebookEvent.new_booking_ref, trip.id);

    log(
      trip.id,
      'rebook',
      `Rebooked! Saved $${rebookEvent.savings.toFixed(2)}. New ref: ${rebookEvent.new_booking_ref}`
    );
  }

  return { rebooked: !!rebookEvent, event: rebookEvent };
}
