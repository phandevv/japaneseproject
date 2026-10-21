/**
 * Seed the "Tong On Nguyen Phap" (Grammar Review) collections in MongoDB.
 *
 * - Reads the Mongo connection string from the environment variable MONGODB_SEED_URI
 *   (and optionally MONGODB_SEED_DB). NEVER hardcodes credentials.
 * - Reads the seed payload from SEED_FILE (default ../backend/src/main/resources/data/grammar-review-seed.json).
 * - Inserts groups into collection `jlpt_n3_grammar_groups` (Long _id, unique groupCode).
 * - Inserts one quiz per group into `jlpt_n3_grammar_quizzes`.
 * - Bumps the `database_sequences` counters (like SequenceGeneratorService.setSequenceIfHigher)
 *   so the running Spring app will not hand out colliding ids.
 * - Safe to re-run: uses upsert on groupCode and skips quizzes whose questionsJson
 *   already exist for that groupCode+questionsHash.
 */

import { MongoClient, Long } from 'mongodb';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MONGO_URI = process.env.MONGODB_SEED_URI || '';
const DB_NAME = process.env.MONGODB_SEED_DB || 'japanesedb';
const SEED_FILE = process.env.SEED_FILE ||
  resolve(__dirname, '../backend/src/main/resources/data/grammar-review-seed.json');

const SEQ_COLL = 'database_sequences';
const GROUP_SEQ = 'jlpt_n3_grammar_group_seq';
const QUIZ_SEQ = 'jlpt_n3_grammar_quiz_seq';
const GROUPS_COLL = 'jlpt_n3_grammar_groups';
const QUIZZES_COLL = 'jlpt_n3_grammar_quizzes';

if (!MONGO_URI) {
  console.error('ERROR: set MONGODB_SEED_URI env var (your MongoDB Atlas/connection URI).');
  console.error('       e.g. set MONGODB_SEED_URI=mongodb+srv://user:pass@cluster/... && npm run seed:grammar-review');
  process.exit(2);
}

if (!existsSync(SEED_FILE)) {
  console.error(`ERROR: seed file not found at ${SEED_FILE}`);
  process.exit(2);
}

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'));

function now() {
  return new Date();
}

const client = new MongoClient(MONGO_URI, {
  // Atlas requires these; keep conservative timeouts.
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
});

try {
  await client.connect();
  console.log('Connected to MongoDB.');

  const db = client.db(DB_NAME);

  const groupsColl = db.collection(GROUPS_COLL);
  const quizzesColl = db.collection(QUIZZES_COLL);
  const seqColl = db.collection(SEQ_COLL);

  // Reserve a block of Long ids starting above the current max in each collection,
  // and keep the sequence counter in sync so the Spring SequenceGeneratorService
  // will not hand out colliding ids afterwards.
  const nextGroupId = await reserveLongId(groupsColl, seqColl, GROUP_SEQ);
  const nextQuizId = await reserveLongId(quizzesColl, seqColl, QUIZ_SEQ);

  let groupsInserted = 0;
  let groupsUpserted = 0;
  let quizzesInserted = 0;

  for (const g of seed.groups) {
    const patternsJson = JSON.stringify(g.patterns || []);
    const allExamples = (g.patterns || [])
      .flatMap(p => (Array.isArray(p.examples) ? p.examples : []));
    const exampleSentencesJson = JSON.stringify(allExamples);

    const groupId = nextGroupId + groupsInserted;

    const groupDoc = {
      _id: Long.fromNumber(groupId),
      groupCode: g.group_code,
      title: g.title ?? null,
      description: g.description ?? null,
      usageGuide: g.usage_guide ?? null,
      usageCases: g.usage_cases ?? null,
      grammarPatternIds: patternsJson,
      exampleSentencesJson: exampleSentencesJson,
      sortOrder: g.sort_order ?? 0,
      totalPatterns: g.patterns ? g.patterns.length : 0,
      createdAt: now(),
      updatedAt: now(),
    };

    // upsert by groupCode (unique index) -> idempotent re-runs.
    const res = await groupsColl.updateOne(
      { groupCode: g.group_code },
      { $set: {
          title: groupDoc.title,
          description: groupDoc.description,
          usageGuide: groupDoc.usageGuide,
          usageCases: groupDoc.usageCases,
          grammarPatternIds: groupDoc.grammarPatternIds,
          exampleSentencesJson: groupDoc.exampleSentencesJson,
          sortOrder: groupDoc.sortOrder,
          totalPatterns: groupDoc.totalPatterns,
          updatedAt: groupDoc.updatedAt,
        },
        $setOnInsert: { _id: groupDoc._id, createdAt: groupDoc.createdAt }
      },
      { upsert: true }
    );
    if (res.upsertedId !== undefined && res.upsertedId !== null) groupsInserted++;
    else groupsUpserted++;

    // Ensure groupId on the (possibly pre-existing) doc matches what we use below
    const existingGroupDoc = await groupsColl.findOne({ groupCode: g.group_code });
    const effectiveGroupId = existingGroupDoc._id; // Long (could be pre-existing id)

    if (Array.isArray(g.questions) && g.questions.length > 0) {
      const questionsJson = JSON.stringify(g.questions);
      const questionsHash = hash(questionsJson);

      // avoid duplicate quizzes on re-run
      const already = await quizzesColl.findOne({
        groupCode: g.group_code,
        questionsHash
      });
      if (!already) {
        const quizId = nextQuizId + quizzesInserted;
        await quizzesColl.insertOne({
          _id: Long.fromNumber(quizId),
          chapterId: null,
          lessonId: null,
          questionsJson: questionsJson,
          groupId: Long.fromNumber(effectiveGroupId),
          groupCode: g.group_code,
          questionType: 'MCQ',
          createdAt: now(),
          questionsHash,             // de-dup marker
          updatedAt: now(),
        });
        quizzesInserted++;
      }
    }
  }

  // bump counters to the max id actually used
  await bumpCounterIfHigher(seqColl, GROUP_SEQ, nextGroupId + Math.max(0, seed.groups.length - 1));
  await bumpCounterIfHigher(seqColl, QUIZ_SEQ, nextQuizId + Math.max(0, quizzesInserted - 1));

  console.log('--- Seed complete ---');
  console.log('Groups inserted (new):', groupsInserted, '| upserted (existing):', groupsUpserted);
  console.log('Quizzes inserted:', quizzesInserted);
  console.log('Counters synced:', GROUP_SEQ, '/', QUIZ_SEQ);
} catch (err) {
  console.error('Seed failed:', err);
  process.exit(1);
} finally {
  await client.close();
}

// ---- helpers ----
async function reserveLongId(coll, seqColl, seqName) {
  const maxSnap = await coll.find({}).sort({ _id: -1 }).limit(1).toArray().catch(() => []);
  let base = 0;
  if (maxSnap.length && typeof maxSnap[0]._id === 'number' && Number.isFinite(maxSnap[0]._id)) {
    base = Math.floor(maxSnap[0]._id);
  }
  // keep sequence ahead of inserted ids so generateSequence won't collide
  await bumpCounterIfHigher(seqColl, seqName, base);
  return base; // next id to use: base+1
}

async function bumpCounterIfHigher(seqColl, seqName, value) {
  if (!Number.isFinite(value)) return;
  await seqColl.updateOne(
    { _id: seqName, seq: { $lt: value } },
    { $setOnInsert: { _id: seqName }, $max: { seq: value } },
    { upsert: true }
  );
  await seqColl.updateOne(
    { _id: seqName, seq: { $gte: value } }, // exists & already high
    { $setOnInsert: { _id: seqName }, $max: { seq: value } },
    { upsert: true }
  );
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
