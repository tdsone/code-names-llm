import express, { Request, Response } from 'express'
import axios from 'axios'


const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {

    const payload = {
      model: 'gpt-4.1',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_file',
              file_id: 'file-Aep2ne51i85kigrsvN6ZGm',
            },
            {
              type: 'input_text',
              text: 'Generate a JSON array of 25 unique Codenames cards. Each card should have:\n- a word (string),\n- a type (one of "red", "blue", "neutral", "assassin").\nMake sure there are 9 red, 8 blue, 7 neutral, 1 assassin.\nRespond with ONLY raw JSON. Do NOT include markdown or explanations.'
            }
          ]
        }
      ]
    };

    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/responses',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const rawText = openaiResponse.data.output[0].content[0].text;

    // Strip ```json ... ```
    const jsonText = rawText.replace(/^```json\n/, '').replace(/\n```$/, '');

    // Parse it
    const game = JSON.parse(jsonText);

    res.json({
      success: true,
      game
    });

  } catch (error: any) {
    console.error('Error sending PDF to OpenAI:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;