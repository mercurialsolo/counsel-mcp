import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root if it exists (mostly for dev)
const __dirname = process.cwd();
dotenv.config({ path: path.resolve(__dirname, '.env') });

const ConfigSchema = z.object({
  COUNSEL_API_URL: z.string().default('https://counsel.getmason.dev'),
});

export const config = ConfigSchema.parse(process.env);
