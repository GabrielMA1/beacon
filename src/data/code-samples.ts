/**
 * Integration examples shown on the home page. Kept here so tests can check
 * that each one is syntactically valid. They use the documented contract
 * (OpenAI-compatible Chat Completions at /v1, bearer key) and nothing that
 * depends on unconfirmed API features such as streaming.
 *
 * YOUR_API_KEY is a placeholder. Never put a real key in this repository.
 */
import { links } from '../config/site';

export interface CodeSample {
  id: string;
  label: string;
  lang: 'bash' | 'python' | 'ts';
  code: string;
}

export function codeSamples(model: string): CodeSample[] {
  return [
    {
      id: 'curl',
      label: 'cURL',
      lang: 'bash',
      code: `export GABNODE_API_KEY="YOUR_API_KEY"

curl ${links.apiBase}/chat/completions \\
  -H "Authorization: Bearer $GABNODE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [
      {"role": "user", "content": "Summarise this changelog in three bullet points."}
    ]
  }'`,
    },
    {
      id: 'python',
      label: 'Python',
      lang: 'python',
      code: `# pip install openai
# export GABNODE_API_KEY="YOUR_API_KEY"
import os
from openai import OpenAI

client = OpenAI(
    base_url="${links.apiBase}",
    api_key=os.environ["GABNODE_API_KEY"],
)

response = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Summarise this changelog in three bullet points."}],
)

print(response.choices[0].message.content)`,
    },
    {
      id: 'typescript',
      label: 'TypeScript',
      lang: 'ts',
      code: `// npm install openai
// export GABNODE_API_KEY="YOUR_API_KEY"
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${links.apiBase}",
  apiKey: process.env.GABNODE_API_KEY,
});

const response = await client.chat.completions.create({
  model: "${model}",
  messages: [{ role: "user", content: "Summarise this changelog in three bullet points." }],
});

console.log(response.choices[0].message.content);`,
    },
  ];
}
