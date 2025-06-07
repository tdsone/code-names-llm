import express, { Request, Response } from 'express';
import { generateCodenamesCards } from '../ai';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const cards = await generateCodenamesCards();
    res.json({ success: true, cards });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate game cards.' });
  }
});

export default router;