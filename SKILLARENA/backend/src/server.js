require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const routes = require('./routes');
const errorMiddleware = require('./middleware/errorMiddleware');
const { tryMatchWaitingTickets, expireStaleTickets, startBattleIfReady } = require('./services/matchmakingService');
const { finalizeBattleIfNeeded } = require('./services/battleService');
const { Battle } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

const parseAllowedOrigins = () => {
  const raw = process.env.CLIENT_URLS || process.env.CLIENT_URL;
  if (!raw || raw.trim() === '*') {
    return true;
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins === true) {
        callback(null, true);
        return;
      }

      if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());

app.use('/api', routes);

app.use(errorMiddleware);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Skill Arena API running on http://localhost:${PORT}`);
    });

    setInterval(async () => {
      try {
        await tryMatchWaitingTickets();
        await expireStaleTickets();
        const startingBattles = await Battle.find({ status: { $in: ['STARTING', 'IN_PROGRESS'] } });
        for (const battle of startingBattles) {
          await startBattleIfReady(battle._id);
        }
        const inProgressBattles = await Battle.find({ status: 'IN_PROGRESS' });
        for (const battle of inProgressBattles) {
          await finalizeBattleIfNeeded(battle._id);
        }
      } catch (error) {
        console.error('Battle scheduler error:', error.message);
      }
    }, 2000);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();
