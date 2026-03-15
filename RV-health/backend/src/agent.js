import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateResultSummary(diagnosticType, results, patientName) {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `You are a compassionate medical translator. A patient named ${patientName} just received diagnostic results and needs a clear, reassuring plain-English summary.

Diagnostic type: ${diagnosticType}
Raw results: ${results}

Write a 3–4 sentence plain-English summary for the patient. Be warm but accurate. Highlight what is normal, flag anything that needs attention without causing unnecessary alarm, and mention what the next step is (doctor will review). Do not use medical jargon. Do not give medical advice. Keep it under 80 words.`
      }
    ]
  });

  return msg.content[0].text;
}

export async function generateMedicationInstructions(medication, dosage, frequency, rawInstructions) {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Rewrite this prescription instruction in simple, friendly language a patient can easily understand and remember. Keep it under 40 words.

Medication: ${medication} ${dosage}
Frequency: ${frequency}
Instructions: ${rawInstructions}`
      }
    ]
  });

  return msg.content[0].text;
}
