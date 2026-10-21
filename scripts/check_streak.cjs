const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://myjsdb:qwertyuiopqaz@myjsdb.dhfyvpg.mongodb.net/?appName=MyJsDB';
const dbName = 'japanesedb';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    const user = await db.collection('users').findOne({ username: { $regex: /^phandeptrai$/i } });
    const userId = user._id || user.id;

    const sessions = await db.collection('study_sessions').find({ userId }).toArray();
    const sessionMap = new Map();
    sessions.forEach(s => {
      if (s.studyDate) {
        const d = new Date(s.studyDate);
        const str = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        sessionMap.set(str, s);
      }
    });

    console.log(`User: ${user.username} (ID: ${userId})`);
    console.log('Total sessions:', sessionMap.size);

    // Let's trace backwards from today 2026-10-19:
    let curr = new Date('2026-10-19T00:00:00+07:00');
    let gaps = [];
    let zeroWordDays = [];
    let streakWithCurrentSessions = 0;
    let streakChecking = true;

    for (let i = 0; i < 90; i++) {
      const str = curr.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const s = sessionMap.get(str);
      if (!s) {
        gaps.push(str);
        if (streakChecking) {
          streakChecking = false;
        }
      } else {
        if (streakChecking) {
          streakWithCurrentSessions++;
        }
        if ((s.wordsStudied || 0) === 0) {
          zeroWordDays.push(str);
        }
      }
      curr.setDate(curr.getDate() - 1);
    }

    console.log('Current streak without fix:', streakWithCurrentSessions);
    console.log('Missing session dates in last 90 days:', gaps);
    console.log('Zero word dates in last 90 days:', zeroWordDays);

  } finally {
    await client.close();
  }
}

main().catch(console.error);
