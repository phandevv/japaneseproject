import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uri = process.env.SPRING_DATA_MONGODB_URI || process.env.MONGO_DB_URL || 'mongodb+srv://myjsdb:qwertyuiopqaz@myjsdb.dhfyvpg.mongodb.net/?appName=MyJsDB';
const dbName = process.env.MONGO_DB_NAME || 'japanesedb';

const EXAMS_DIR = path.resolve(__dirname, '../backend/src/main/resources/static/exams/n3');

async function main() {
  console.log(`Connecting to MongoDB Atlas: ${dbName}...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('jlpt_exams');

    if (!fs.existsSync(EXAMS_DIR)) {
      throw new Error(`Exams directory not found at: ${EXAMS_DIR}`);
    }

    const files = fs.readdirSync(EXAMS_DIR).filter(f => f.endsWith('.json')).sort();
    console.log(`Found ${files.length} exam JSON files in ${EXAMS_DIR}`);

    let totalExams = 0;
    let totalSections = 0;
    let totalQuestions = 0;

    for (const file of files) {
      const filePath = path.join(EXAMS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const examData = JSON.parse(content);

      const examId = examData.examId;
      if (!examId) {
        console.warn(`Skipping ${file}: missing examId`);
        continue;
      }

      // Prepare MongoDB Document
      const doc = {
        _id: examId,
        id: examId,
        level: examData.level || 'N3',
        examYear: examData.year,
        examMonth: examData.month,
        title: examData.title,
        totalQuestions: examData.totalQuestions,
        audioFile: examData.audioFile || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: (examData.sections || []).map((sec, secIdx) => {
          totalSections++;
          const questions = (sec.questions || []).map((q, qIdx) => {
            totalQuestions++;
            return {
              id: q.id,
              mondaiNumber: q.mondai,
              mondaiTitle: q.mondaiTitle || null,
              questionNumber: q.questionNumber,
              passageText: q.passage || null,
              questionText: q.questionText,
              choices: q.choices || [],
              correctAnswer: q.correctAnswer || 1,
              explanation: q.explanation || null,
              points: 1,
              audioTimestampSeconds: q.audioStartSec || q.audioTimestamp || null,
              imageUrl: q.imageRef || q.imageUrl || null
            };
          });

          return {
            id: sec.sectionId || `sec-${secIdx}`,
            sectionType: sec.sectionId === 'vocab' ? 'LANGUAGE_KNOWLEDGE' : (sec.sectionId === 'reading' ? 'READING' : 'LISTENING'),
            title: sec.title,
            titleVi: sec.titleVi || sec.title,
            timeLimitMinutes: Math.round((sec.timeLimitSec || 1800) / 60),
            orderIndex: secIdx + 1,
            totalQuestions: questions.length,
            questions: questions
          };
        })
      };

      await collection.updateOne(
        { _id: examId },
        { $set: doc },
        { upsert: true }
      );

      totalExams++;
      console.log(`✓ Seeded ${examId}: ${doc.title} (${doc.sections.length} sections, ${examData.totalQuestions} questions)`);
    }

    // Ensure Indexes
    await collection.createIndex({ examYear: -1, examMonth: -1 });
    await collection.createIndex({ level: 1 });

    console.log('\n======================================================');
    console.log(`🎉 SUCCESS! Seeded to MongoDB Atlas [${dbName}.jlpt_exams]:`);
    console.log(`- Total Exams: ${totalExams}`);
    console.log(`- Total Sections: ${totalSections}`);
    console.log(`- Total Questions: ${totalQuestions}`);
    console.log('======================================================\n');
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
