import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uri = process.env.SPRING_DATA_MONGODB_URI || process.env.MONGO_DB_URL || 'mongodb+srv://myjsdb:qwertyuiopqaz@myjsdb.dhfyvpg.mongodb.net/?appName=MyJsDB';
const dbName = process.env.MONGO_DB_NAME || 'japanesedb';

const SEED_FILE = path.resolve(__dirname, '../backend/src/main/resources/data/jlpt_n3_high_frequency_grammar.json');

async function main() {
  console.log(`Connecting to MongoDB Atlas: ${dbName}...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('jlpt_n3_high_frequency_grammar');

    if (!fs.existsSync(SEED_FILE)) {
      throw new Error(`Seed file not found at: ${SEED_FILE}`);
    }

    const content = fs.readFileSync(SEED_FILE, 'utf-8');
    const grammarList = JSON.parse(content);
    console.log(`Found ${grammarList.length} grammar patterns in JSON.`);

    let count = 0;
    for (const item of grammarList) {
      const rank = item.rankNumber || 0;
      const doc = {
        _id: rank,
        id: rank,
        rankNumber: rank,
        grammar: item.grammar || '',
        level: item.level || 'N3',
        totalOccurrences: item.totalOccurrences || 0,
        examCoverage: item.examCoverage || '',
        avgPerExam: item.avgPerExam || 0.0,
        bunpouCount: item.bunpouCount || 0,
        dokkaiCount: item.dokkaiCount || 0,
        choukaiCount: item.choukaiCount || 0,
        goiCount: item.goiCount || 0,
        priority: item.priority || 'Medium',
        priorityStars: item.priorityStars || '',
        formation: item.formation || '',
        meaning: item.meaning || '',
        examExamplesJson: item.examExamples ? JSON.stringify(item.examExamples) : '[]',
        recentTrend: item.recentTrend || '',
        studyTip: item.studyTip || '',
        updatedAt: new Date()
      };

      await collection.updateOne(
        { _id: rank },
        { $set: doc },
        { upsert: true }
      );
      count++;
    }

    console.log(`🎉 SUCCESS! Seeded ${count} high-frequency grammar patterns to MongoDB Atlas [${dbName}.jlpt_n3_high_frequency_grammar]!`);
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await client.close();
  }
}

main();
