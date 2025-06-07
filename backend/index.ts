import 'dotenv/config';
import express, { Request, Response } from 'express';
import Game from '../shared/game';
import gameRoutes from './routes/game';

const app = express();
const port = 3000;

app.use(express.json());
app.use('/game', gameRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});