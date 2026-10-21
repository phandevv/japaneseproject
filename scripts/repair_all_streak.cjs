const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://myjsdb:qwertyuiopqaz@myjsdb.dhfyvpg.mongodb.net/?appName=MyJsDB';
const dbName = 'japanesedb';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    const user = await db.collection('users').findOne({ username: { $regex: /^phandeptrai$/i } });
    if (!user) {
      console.error('User phandeptrai not found!');
      return;
    }
    const userId = user._id || user.id;
    console.log(`[INFO] Found user: ${user.username} (ID: ${userId})`);

    // 1. Check / insert missing session for 2026-10-17 (Thứ 7)
    const missingDate = {
      dayLabel: 'Thứ 7 (2026-10-17)',
      studyDate: new Date('2026-10-16T17:00:00.000Z'),
      wordsStudied: 40,
      correctAnswers: 35,
      totalQuestions: 40,
      durationMinutes: 35
    };

    const existing17 = await db.collection('study_sessions').findOne({
      userId,
      studyDate: missingDate.studyDate
    });

    const seqDoc = await db.collection('database_sequences').findOne({ _id: 'study_sessions_seq' });
    let currentSeq = seqDoc ? seqDoc.seq : 196;

    if (!existing17) {
      currentSeq++;
      await db.collection('study_sessions').insertOne({
        _id: currentSeq,
        userId,
        studyDate: missingDate.studyDate,
        wordsStudied: missingDate.wordsStudied,
        correctAnswers: missingDate.correctAnswers,
        totalQuestions: missingDate.totalQuestions,
        streakFrozen: false,
        durationMinutes: missingDate.durationMinutes,
        isRepaired: true,
        _class: 'com.flashcard.srs.document.StudySessionDoc'
      });
      console.log(`[OK] Inserted missing session for ${missingDate.dayLabel} with _id: ${currentSeq}`);

      await db.collection('database_sequences').updateOne(
        { _id: 'study_sessions_seq' },
        { $set: { seq: currentSeq } }
      );
      console.log(`[OK] Updated study_sessions_seq to: ${currentSeq}`);
    } else {
      console.log(`[INFO] Session for ${missingDate.dayLabel} already exists.`);
    }

    // 2. Repair days with 0 words in the last week to make commit graph & streak complete:
    const daysToBoost = [
      { date: new Date('2026-10-17T17:00:00.000Z'), label: 'Chủ Nhật (2026-10-18)', words: 40, duration: 35 },
      { date: new Date('2026-10-15T17:00:00.000Z'), label: 'Thứ 6 (2026-10-16)', words: 35, duration: 25 },
      { date: new Date('2026-10-14T17:00:00.000Z'), label: 'Thứ 5 (2026-10-15)', words: 35, duration: 30 },
      { date: new Date('2026-10-12T17:00:00.000Z'), label: 'Thứ 3 (2026-10-13)', words: 45, duration: 35 },
    ];

    for (const d of daysToBoost) {
      const res = await db.collection('study_sessions').updateOne(
        { userId, studyDate: d.date },
        {
          $set: {
            wordsStudied: d.words,
            correctAnswers: Math.round(d.words * 0.85),
            totalQuestions: d.words,
            durationMinutes: d.duration,
            isRepaired: true,
            streakFrozen: false
          }
        }
      );
      console.log(`[OK] Repaired study stats for ${d.label} (matched: ${res.matchedCount}, modified: ${res.modifiedCount})`);
    }

    // 3. Verify Streak
    const allSessions = await db.collection('study_sessions').find({ userId }).toArray();
    const dateSet = new Set();
    allSessions.forEach(s => {
      if (s.studyDate) {
        const d = new Date(s.studyDate);
        dateSet.add(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }));
      }
    });

    let streak = 0;
    let curr = new Date('2026-10-19T00:00:00+07:00');
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
