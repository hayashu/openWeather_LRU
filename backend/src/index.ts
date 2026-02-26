import dotenv from 'dotenv';
import express from 'express';
import prefectureRouter from './routes/prefecture';
import citiesRouter from './routes/cities';
import forecastRouter from './routes/forecast';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/prefectures', prefectureRouter);
app.use('/cities', citiesRouter);
app.use('/forecast', forecastRouter);

app.get('/', (_req, res) => {
  res.json({ message: 'Hello from Express!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});