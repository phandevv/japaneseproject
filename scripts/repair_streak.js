const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_DB_URL || 'mongodb+srv://myjsdb:qwertyuiopqaz@myjsdb.dhfyvpg.mongodb.net/?appName=MyJsDB';
const dbName = 'japanesedb';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('[OK] Connected to MongoDB Atlas.');
    const db = client.db(dbName);

    // 1. Find user Phandeptrai
    const user = await db.collection('users').findOne({ 
      username: { $regex: /^phandeptrai$/i } 
    });

    if (!user) {
      console.error('[ERROR] User phandeptrai not found!');
      return;
    }

    const userId = user._id || user.id;
    console.log(`[INFO] Found user: ${user.username} (ID: ${userId})`);

    // 2. Define the 3 dates for T6 (2026-10-09), T7 (2026-10-10), CN (2026-10-11)
    // Note: Spring Boot maps LocalDate (Asia/Ho_Chi_Minh) to BSON Date starting at 00:00:00 UTC+7 => 17:00:00 UTC previous day
    const datesToRepair = [
      {
        dayLabel: 'Thứ 6 (2026-10-09)',
        dateStr: '2026-10-09',
        studyDate: new Date('2026-10-08T17:00:00.000Z'),
        wordsStudied: 35,
        correctAnswers: 30,
        totalQuestions: 35,
        durationMinutes: 30
      },
      {
        dayLabel: 'Thứ 7 (2026-10-10)',
        dateStr: '2026-10-10',
        studyDate: new Date('2026-10-09T17:00:00.000Z'),
        wordsStudied: 40,
        correctAnswers: 35,
        totalQuestions: 40,
        durationMinutes: 35
      },
      {
        dayLabel: 'Chủ Nhật (2026-10-11)',
        dateStr: '2026-10-11',
        studyDate: new Date('2026-10-10T17:00:00.000Z'),
        wordsStudied: 30,
        correctAnswers: 25,
        totalQuestions: 30,
        durationMinutes: 25
      }
    ];

    // 3. Get current sequence
    const seqDoc = await db.collection('database_sequences').findOne({ _id: 'study_sessions_seq' });
    let currentSeq = seqDoc ? seqDoc.seq : 186;
    console.log(`[INFO] Current study_sessions_seq: ${currentSeq}`);

    for (const item of datesToRepair) {
      // Check if session already exists for this date
      const existing = await db.collection('study_sessions').findOne({
        userId: userId,
        studyDate: item.studyDate
      });

      if (existing) {
        console.log(`[INFO] Session for ${item.dayLabel} already exists (ID: ${existing._id}). Updating...`);
        await db.collection('study_sessions').updateOne(
          { _id: existing._id },
          {
            $set: {
              wordsStudied: Math.max(existing.wordsStudied || 0, item.wordsStudied),
              correctAnswers: item.correctAnswers,
              totalQuestions: item.totalQuestions,
              durationMinutes: item.durationMinutes,
              isRepaired: true,
              streakFrozen: false,
              _class: 'com.flashcard.srs.document.StudySessionDoc'
            }
          }
        );
      } else {
        currentSeq++;
        const newSession = {
          _id: currentSeq,
          userId: userId,
          studyDate: item.studyDate,
          wordsStudied: item.wordsStudied,
          correctAnswers: item.correctAnswers,
          totalQuestions: item.totalQuestions,
          streakFrozen: false,
          durationMinutes: item.durationMinutes,
          isRepaired: true,
          _class: 'com.flashcard.srs.document.StudySessionDoc'
        };

        await db.collection('study_sessions').insertOne(newSession);
        console.log(`[OK] Inserted session for ${item.dayLabel} with _id: ${currentSeq}`);
      }
    }

    // Update sequence
    await db.collection('database_sequences').updateOne(
      { _id: 'study_sessions_seq' },
      { $set: { seq: currentSeq } },
      { upsert: true }
    );
    console.log(`[OK] Updated study_sessions_seq to: ${currentSeq}`);

    // 4. Verify Streak Calculation
    const allSessions = await db.collection('study_sessions').find({ userId: userId }).toArray();
    const dateSet = new Set();
    allSessions.forEach(s => {
      if (s.studyDate) {
        const d = new Date(s.studyDate);
        dateSet.add(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }));
      }
    });

    let streak = 0;
    let checkDate = new Date(); // current date
    let curr = new Date(checkDate);
    const todayStr = curr.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    // If today is not in set, start checking from yesterday
    if (!dateSet.has(todayStr)) {
      curr.setDate(curr.getDate() - 1);
    }
    while (dateSet.has(curr.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }))) {
      streak++;
      curr.setDate(curr.getDate() - 1);
    }

    console.log(`\n==============================================`);
    console.log(`🎉 HOÀN TẤT ĐIỂM DANH BÙ CHO ${user.username}`);
    console.log(`🔥 Streak tính toán hiện tại: ${streak} NGÀY LIÊN TIẾP`);
    console.log(`==============================================\n`);

  } finally {
    await client.close();
  }
}

main().catch(console.error);
