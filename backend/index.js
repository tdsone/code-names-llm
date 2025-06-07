
require('dotenv').config();
const express = require('express');
const app = express();
const port = 3000;
const Game = require('../shared/game').default
const gameRoutes = require('./routes/game')


app.use(express.json())
app.use('/game', gameRoutes)

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});