require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { assertSecureEnv, isProduction } = require('./config/secureEnv');
const { installMongooseQueryCounter } = require('./utils/perfContext');
const { requestTimingMiddleware, isPerfEnabled } = require('./middleware/requestTimingMiddleware');
const { csrfProtection } = require('./middleware/csrfMiddleware');
const routes = require('./routes');
const errorMiddleware = require('./middleware/errorMiddleware');
const { repairPublishedCodingLessons } = require('./services/codingLessonService');
const { tryMatchWaitingTickets, expireStaleTickets, startBattleIfReady } = require('./services/matchmakingService');
const { finalizeBattleIfNeeded } = require('./services/battleService');
const { Battle } = require('./models');

if (isPerfEnabled()) {
  installMongooseQueryCounter();
}

let battleTickRunning = false;

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

const parseAllowedOrigins = () => {
  const raw = process.env.CLIENT_URLS || process.env.CLIENT_URL;
  const production = isProduction();

  if (!raw || !String(raw).trim()) {
    if (production) {
      return [];
    }
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }

  if (String(raw).trim() === '*') {
    if (production) {
      return [];
    }
    console.warn(
      '[security] CLIENT_URL=* is allowed only in development. Set an explicit allowlist for production.',
    );
    return true;
  }

  return String(raw)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins === true) {
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

app.use(express.json({ limit: '512kb' }));
app.use(cookieParser());
app.use(requestTimingMiddleware);
app.use('/api', csrfProtection);
app.use('/api', routes);

app.use(errorMiddleware);

const start = async () => {
  try {
    assertSecureEnv();
    await connectDB();
    await repairPublishedCodingLessons();
    app.listen(PORT, () => {
      console.log(`Skill Arena API running on http://localhost:${PORT}`);
    });

    setInterval(async () => {
      if (battleTickRunning) return;
      battleTickRunning = true;
      const tickStarted = process.hrtime.bigint();
      let dueCount = 0;
      let inProgressCount = 0;
      try {
        await tryMatchWaitingTickets();
        await expireStaleTickets();

        const now = new Date();
        // Only battles whose countdown has elapsed — avoids scanning future STARTING battles.
        const dueStarting = await Battle.find({
          status: 'STARTING',
          scheduledAt: { $lte: now },
        })
          .select('_id')
          .limit(50)
          .lean();
        dueCount = dueStarting.length;

        for (const battle of dueStarting) {
          await startBattleIfReady(battle._id);
        }

        // Cap IN_PROGRESS scans; finalizeBattleIfNeeded loads details as needed.
        const inProgressBattles = await Battle.find({ status: 'IN_PROGRESS' })
          .select('_id')
          .sort({ startedAt: 1 })
          .limit(100)
          .lean();
        inProgressCount = inProgressBattles.length;

        for (const battle of inProgressBattles) {
          await finalizeBattleIfNeeded(battle._id);
        }
      } catch (error) {
        console.error('Battle scheduler error:', error.message);
      } finally {
        battleTickRunning = false;
        if (isPerfEnabled() && (dueCount > 0 || inProgressCount > 0 || process.env.PERF_LOG === '1')) {
          const durationMs = Number(process.hrtime.bigint() - tickStarted) / 1e6;
          console.info('[perf-scheduler]', {
            durationMs: Math.round(durationMs * 100) / 100,
            dueStarting: dueCount,
            inProgress: inProgressCount,
            note: 'Single-instance in-process scheduler; multi-instance may double-process',
          });
        }
      }
    }, 2000);
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();
