const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'japaneseproject-db.cm906go2g12l.us-east-1.rds.amazonaws.com',
  user: process.env.MYSQL_USER || 'admin',
  password: process.env.MYSQL_PASSWORD || 'JapaneseProject123!',
  database: process.env.MYSQL_DB || 'japanesedb',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  dateStrings: true
};

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://myjsdb:qwertyuiopqaz@myjsdb.dhfyvpg.mongodb.net/japanesedb?retryWrites=true&w=majority&appName=MyJsDB';
const MONGO_DB = process.env.MONGO_DB || 'japanesedb';

async function runMigration() {
  console.log('=====================================================');
  console.log(' FULL BACKUP / MIGRATION: RDS MySQL -> MongoDB Atlas');
  console.log(' Mode: Ghi de (ReplaceOne / Overwrite by _id), khong trung lap');
  console.log('=====================================================');

  console.log(`Connecting to MySQL RDS at ${MYSQL_CONFIG.host}...`);
  const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
  console.log('[OK] Connected to MySQL RDS.');

  console.log(`Connecting to MongoDB Atlas at ${MONGO_URI}...`);
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const db = mongoClient.db(MONGO_DB);
  console.log(`[OK] Connected to MongoDB Atlas (${MONGO_DB}).\n`);

  const sequences = {};

  function updateSeq(name, id) {
    if (!sequences[name] || id > sequences[name]) {
      sequences[name] = id;
    }
  }

  // 1. Migrate USERS & USER_SETTINGS
  console.log('Migrating USERS & USER_SETTINGS...');
  const [users] = await mysqlConn.query('SELECT * FROM users');
  const [settings] = await mysqlConn.query('SELECT * FROM user_settings');

  const settingsByUser = {};
  for (const s of settings) {
    if (!settingsByUser[s.user_id]) settingsByUser[s.user_id] = {};
    settingsByUser[s.user_id][s.level] = {
      level: s.level,
      wordsPerDay: s.words_per_day || 20,
      completedDays: s.completed_days || 0
    };
  }

  const userOps = users.map(u => {
    updateSeq('users_seq', u.id);
    const doc = {
      _id: u.id,
      username: u.username,
      password: u.password,
      avatar: u.avatar || null,
      coverPhoto: u.cover_photo || null,
      displayName: u.display_name || null,
      address: u.address || null,
      phone: u.phone || null,
      occupation: u.occupation || null,
      role: u.role || 'USER',
      settings: settingsByUser[u.id] || {}
    };
    return {
      replaceOne: {
        filter: { _id: u.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (userOps.length > 0) {
    const res = await db.collection('users').bulkWrite(userOps);
    console.log(` users: Upserted/Overwritten ${users.length} docs (Matched: ${res.matchedCount}, Modified: ${res.modifiedCount}, Upserted: ${res.upsertedCount})`);
  }

  // 2. Migrate VOCABULARY
  console.log('Migrating VOCABULARY...');
  const [vocabRows] = await mysqlConn.query('SELECT * FROM vocabulary');
  const vocabOps = vocabRows.map(v => {
    updateSeq('vocabulary_seq', v.id);
    const doc = {
      _id: v.id,
      kanji: v.kanji || null,
      hiragana: v.hiragana || null,
      romaji: v.romaji || null,
      hanViet: v.han_viet || null,
      meaning: v.meaning || null,
      wordType: v.word_type || null,
      level: v.level || null,
      category: v.category || null,
      kanjiWords: v.kanji_words || null,
      sampleSentence: v.sample_sentence || null,
      sampleTranslation: v.sample_translation || null,
      sampleReading: v.sample_reading || null,
      pitchAccent: v.pitch_accent || null,
      synonyms: v.synonyms || null,
      antonyms: v.antonyms || null,
      commonMistakes: v.common_mistakes || null,
      collocations: v.collocations || null,
      mnemonic: v.mnemonic || null,
      conversationExamples: v.conversation_examples || null,
      exampleSentences: v.example_sentences || null,
      usageGuide: v.usage_guide || null,
      onReading: v.on_reading || null,
      kunReading: v.kun_reading || null,
      isEnriching: !!v.is_enriching
    };
    return {
      replaceOne: {
        filter: { _id: v.id },
        replacement: doc,
        upsert: true
      }
    };
  });

  for (let i = 0; i < vocabOps.length; i += 500) {
    const batch = vocabOps.slice(i, i + 500);
    await db.collection('vocabularies').bulkWrite(batch);
  }
  console.log(` vocabularies: Upserted/Overwritten ${vocabRows.length} docs.`);

  // 3. Migrate GRAMMAR_CARDS
  console.log('Migrating GRAMMAR_CARDS...');
  const [grammarRows] = await mysqlConn.query('SELECT * FROM grammar_cards');
  const grammarOps = grammarRows.map(g => {
    updateSeq('grammar_cards_seq', g.id);
    const doc = {
      _id: g.id,
      grammar: g.grammar,
      meaning: g.meaning,
      usageDesc: g.usage_desc || null,
      usageGuide: g.usage_guide || null,
      formation: g.formation || null,
      jlpt: g.jlpt || 'N3',
      similarGrammar: g.similar_grammar || null,
      difference: g.difference || null,
      commonMistakes: g.common_mistakes || null,
      examples: g.examples || null,
      readingPassage: g.reading_passage || null,
      quizzes: g.quizzes || null,
      weekName: g.week_name || null,
      dayName: g.day_name || null,
      lessonTitle: g.lesson_title || null,
      createdAt: g.created_at ? new Date(g.created_at) : new Date(),
      updatedAt: g.updated_at ? new Date(g.updated_at) : new Date()
    };
    return {
      replaceOne: {
        filter: { _id: g.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (grammarOps.length > 0) {
    await db.collection('grammar_cards').bulkWrite(grammarOps);
    console.log(` grammar_cards: Upserted/Overwritten ${grammarRows.length} docs.`);
  }

  // 4. Migrate WORD_REVIEWS
  console.log('Migrating WORD_REVIEWS...');
  const [wordReviewRows] = await mysqlConn.query('SELECT * FROM word_reviews');
  const wordReviewOps = wordReviewRows.map(w => {
    updateSeq('word_reviews_seq', w.id);
    const doc = {
      _id: w.id,
      userId: w.user_id,
      vocabularyId: w.vocabulary_id,
      state: w.state || (w.repetitions > 0 ? 'REVIEW' : 'NEW'),
      difficulty: parseFloat(w.difficulty || 0),
      stability: parseFloat(w.stability || 0),
      easeFactor: parseFloat(w.ease_factor || 2.5),
      intervalDays: parseInt(w.interval_days || 0),
      repetitions: parseInt(w.repetitions || 0),
      reviewCount: parseInt(w.review_count || 0),
      correctCount: parseInt(w.correct_count || 0),
      wrongCount: parseInt(w.wrong_count || 0),
      consecutiveCorrect: parseInt(w.consecutive_correct || 0),
      nextReview: w.next_review ? new Date(w.next_review) : new Date(),
      lastReviewedAt: w.last_reviewed_at ? new Date(w.last_reviewed_at) : null,
      lastRating: w.last_rating ? parseInt(w.last_rating) : null
    };
    return {
      replaceOne: {
        filter: { _id: w.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  for (let i = 0; i < wordReviewOps.length; i += 500) {
    const batch = wordReviewOps.slice(i, i + 500);
    await db.collection('word_reviews').bulkWrite(batch);
  }
  console.log(` word_reviews: Upserted/Overwritten ${wordReviewRows.length} docs.`);

  // 5. Migrate GRAMMAR_REVIEWS
  console.log('Migrating GRAMMAR_REVIEWS...');
  const [grammarReviewRows] = await mysqlConn.query('SELECT * FROM grammar_reviews');
  const grammarReviewOps = grammarReviewRows.map(gr => {
    updateSeq('grammar_reviews_seq', gr.id);
    const doc = {
      _id: gr.id,
      userId: gr.user_id,
      grammarCardId: gr.grammar_card_id,
      state: gr.state || (gr.repetitions > 0 ? 'REVIEW' : 'NEW'),
      difficulty: parseFloat(gr.difficulty || 0),
      stability: parseFloat(gr.stability || 0),
      easeFactor: parseFloat(gr.ease_factor || 2.5),
      intervalDays: parseInt(gr.interval_days || 0),
      repetitions: parseInt(gr.repetitions || 0),
      reviewCount: parseInt(gr.review_count || 0),
      correctCount: parseInt(gr.correct_count || 0),
      wrongCount: parseInt(gr.wrong_count || 0),
      consecutiveCorrect: parseInt(gr.consecutive_correct || 0),
      nextReview: gr.next_review ? new Date(gr.next_review) : new Date(),
      lastReviewedAt: gr.last_reviewed_at ? new Date(gr.last_reviewed_at) : null,
      lastRating: gr.last_rating ? parseInt(gr.last_rating) : null
    };
    return {
      replaceOne: {
        filter: { _id: gr.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (grammarReviewOps.length > 0) {
    await db.collection('grammar_reviews').bulkWrite(grammarReviewOps);
    console.log(` grammar_reviews: Upserted/Overwritten ${grammarReviewRows.length} docs.`);
  }

  // 6. Migrate STUDY_SESSIONS
  console.log('Migrating STUDY_SESSIONS...');
  const [studyRows] = await mysqlConn.query('SELECT * FROM study_sessions');
  const studyOps = studyRows.map(s => {
    updateSeq('study_sessions_seq', s.id);
    const doc = {
      _id: s.id,
      userId: s.user_id,
      studyDate: s.study_date ? (typeof s.study_date === 'string' ? s.study_date.split('T')[0] : s.study_date.toISOString().split('T')[0]) : null,
      wordsStudied: parseInt(s.words_studied || 0),
      correctAnswers: parseInt(s.correct_answers || 0),
      totalQuestions: parseInt(s.total_questions || 0),
      streakFrozen: !!s.streak_frozen
    };
    return {
      replaceOne: {
        filter: { _id: s.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (studyOps.length > 0) {
    await db.collection('study_sessions').bulkWrite(studyOps);
    console.log(` study_sessions: Upserted/Overwritten ${studyRows.length} docs.`);
  }

  // 7. Migrate DAILY_STUDY_STATS
  console.log('Migrating DAILY_STUDY_STATS...');
  const [dailyStatsRows] = await mysqlConn.query('SELECT * FROM daily_study_stats');
  const dailyStatsOps = dailyStatsRows.map(d => {
    updateSeq('daily_study_stats_seq', d.id);
    const doc = {
      _id: d.id,
      userId: d.user_id,
      date: d.date ? (typeof d.date === 'string' ? d.date.split('T')[0] : d.date.toISOString().split('T')[0]) : null,
      newWordsStudied: parseInt(d.new_words_studied || 0),
      wordsReviewed: parseInt(d.words_reviewed || 0),
      retentionRate: parseFloat(d.retention_rate || 0),
      learningTimeMs: parseInt(d.learning_time_ms || 0)
    };
    return {
      replaceOne: {
        filter: { _id: d.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (dailyStatsOps.length > 0) {
    await db.collection('daily_study_stats').bulkWrite(dailyStatsOps);
    console.log(` daily_study_stats: Upserted/Overwritten ${dailyStatsRows.length} docs.`);
  }

  // 8. Migrate REVIEW_LOGS
  console.log('Migrating REVIEW_LOGS...');
  const [reviewLogRows] = await mysqlConn.query('SELECT * FROM review_logs');
  const reviewLogOps = reviewLogRows.map(rl => {
    updateSeq('review_logs_seq', rl.id);
    const doc = {
      _id: rl.id,
      wordReviewId: rl.word_review_id,
      rating: rl.rating,
      stateBefore: rl.state_before,
      stateAfter: rl.state_after,
      difficultyBefore: parseFloat(rl.difficulty_before || 0),
      difficultyAfter: parseFloat(rl.difficulty_after || 0),
      stabilityBefore: parseFloat(rl.stability_before || 0),
      stabilityAfter: parseFloat(rl.stability_after || 0),
      durationMs: rl.duration_ms ? parseInt(rl.duration_ms) : null,
      createdAt: rl.created_at ? new Date(rl.created_at) : new Date()
    };
    return {
      replaceOne: {
        filter: { _id: rl.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  for (let i = 0; i < reviewLogOps.length; i += 500) {
    const batch = reviewLogOps.slice(i, i + 500);
    await db.collection('review_logs').bulkWrite(batch);
  }
  console.log(` review_logs: Upserted/Overwritten ${reviewLogRows.length} docs.`);

  // 9. Migrate ACHIEVEMENTS & USER_ACHIEVEMENTS
  console.log('Migrating ACHIEVEMENTS & USER_ACHIEVEMENTS...');
  const [achieveRows] = await mysqlConn.query('SELECT * FROM achievements');
  const [userAchieveRows] = await mysqlConn.query('SELECT * FROM user_achievements');

  const achieveOps = achieveRows.map(a => {
    updateSeq('achievements_seq', a.id);
    const doc = {
      _id: a.id,
      code: a.code,
      title: a.title,
      description: a.description,
      category: a.category,
      icon: a.icon,
      points: parseInt(a.points || 0),
      targetValue: parseInt(a.target_value || 0),
      parentCode: a.parent_code || null,
      treeLevel: parseInt(a.tree_level || 0),
      orderInLevel: parseInt(a.order_in_level || 0)
    };
    return {
      replaceOne: {
        filter: { _id: a.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (achieveOps.length > 0) {
    await db.collection('achievements').bulkWrite(achieveOps);
    console.log(` achievements: Upserted/Overwritten ${achieveRows.length} docs.`);
  }

  const userAchieveOps = userAchieveRows.map(ua => {
    updateSeq('user_achievements_seq', ua.id);
    const doc = {
      _id: ua.id,
      userId: ua.user_id,
      achievementId: ua.achievement_id,
      currentProgress: parseInt(ua.current_progress || 0),
      isUnlocked: !!ua.is_unlocked,
      unlockedAt: ua.unlocked_at ? new Date(ua.unlocked_at) : null
    };
    return {
      replaceOne: {
        filter: { _id: ua.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (userAchieveOps.length > 0) {
    await db.collection('user_achievements').bulkWrite(userAchieveOps);
    console.log(` user_achievements: Upserted/Overwritten ${userAchieveRows.length} docs.`);
  }

  // 10. Migrate FEEDBACKS
  console.log('Migrating FEEDBACKS...');
  const [feedbackRows] = await mysqlConn.query('SELECT * FROM feedbacks');
  const feedbackOps = feedbackRows.map(f => {
    updateSeq('feedbacks_seq', f.id);
    const doc = {
      _id: f.id,
      userId: f.user_id,
      title: f.title,
      content: f.content,
      type: f.type,
      status: f.status || 'PENDING',
      createdAt: f.created_at ? new Date(f.created_at) : new Date()
    };
    return {
      replaceOne: {
        filter: { _id: f.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (feedbackOps.length > 0) {
    await db.collection('feedbacks').bulkWrite(feedbackOps);
    console.log(` feedbacks: Upserted/Overwritten ${feedbackRows.length} docs.`);
  }

  // 11. Migrate CONVERSATIONS & SUB-TABLES
  console.log('Migrating CONVERSATIONS (with messages, corrections, recommendations)...');
  const [convRows] = await mysqlConn.query('SELECT * FROM conversations');
  const [msgRows] = await mysqlConn.query('SELECT * FROM conversation_messages');
  const [corrRows] = await mysqlConn.query('SELECT * FROM conversation_corrections');
  const [recRows] = await mysqlConn.query('SELECT * FROM review_recommendations');

  const msgsByConv = {};
  for (const m of msgRows) {
    if (!msgsByConv[m.conversation_id]) msgsByConv[m.conversation_id] = [];
    msgsByConv[m.conversation_id].push({
      sender: m.sender,
      messageText: m.message_text,
      rawAnalysisJson: m.raw_analysis_json || null,
      createdAt: m.created_at ? new Date(m.created_at) : new Date()
    });
  }

  const corrsByConv = {};
  for (const c of corrRows) {
    if (!corrsByConv[c.conversation_id]) corrsByConv[c.conversation_id] = [];
    corrsByConv[c.conversation_id].push({
      originalText: c.original_text,
      correctedText: c.corrected_text,
      explanation: c.explanation,
      type: c.type || 'GENERAL',
      createdAt: c.created_at ? new Date(c.created_at) : new Date()
    });
  }

  const recByConv = {};
  for (const r of recRows) {
    recByConv[r.conversation_id] = {
      recommendedFocus: r.recommended_focus,
      suggestedVocab: r.suggested_vocab,
      suggestedGrammar: r.suggested_grammar,
      createdAt: r.created_at ? new Date(r.created_at) : new Date()
    };
  }

  const convOps = convRows.map(c => {
    updateSeq('conversations_seq', c.id);
    const doc = {
      _id: c.id,
      userId: c.user_id,
      scenario: c.scenario,
      jlptLevel: c.jlpt_level,
      status: c.status || 'ACTIVE',
      summary: c.summary || null,
      createdAt: c.created_at ? new Date(c.created_at) : new Date(),
      endedAt: c.ended_at ? new Date(c.ended_at) : null,
      messages: msgsByConv[c.id] || [],
      corrections: corrsByConv[c.id] || [],
      recommendation: recByConv[c.id] || null
    };
    return {
      replaceOne: {
        filter: { _id: c.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (convOps.length > 0) {
    await db.collection('conversations').bulkWrite(convOps);
    console.log(` conversations: Upserted/Overwritten ${convRows.length} docs (with embedded messages & corrections).`);
  }

  // 12. Migrate SPEAKING_STATISTICS
  console.log('Migrating SPEAKING_STATISTICS...');
  const [speakRows] = await mysqlConn.query('SELECT * FROM speaking_statistics');
  const speakOps = speakRows.map(sp => {
    updateSeq('speaking_statistics_seq', sp.id);
    const doc = {
      _id: sp.id,
      userId: sp.user_id,
      grammarAccuracy: parseFloat(sp.grammar_accuracy || 0),
      vocabularyScore: parseFloat(sp.vocabulary_score || 0),
      fluencyScore: parseFloat(sp.fluency_score || 0),
      confidenceScore: parseFloat(sp.confidence_score || 0),
      totalSessions: parseInt(sp.total_sessions || 0),
      updatedAt: sp.updated_at ? new Date(sp.updated_at) : new Date()
    };
    return {
      replaceOne: {
        filter: { _id: sp.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (speakOps.length > 0) {
    await db.collection('speaking_statistics').bulkWrite(speakOps);
    console.log(` speaking_statistics: Upserted/Overwritten ${speakRows.length} docs.`);
  }

  // 13. Migrate NOTIFICATIONS
  console.log('Migrating NOTIFICATIONS...');
  const [notifRows] = await mysqlConn.query('SELECT * FROM notifications');
  const notifOps = notifRows.map(n => {
    updateSeq('notifications_seq', n.id);
    const doc = {
      _id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type || 'INFO',
      isRead: !!n.is_read,
      relatedEntityId: n.related_entity_id || null,
      createdAt: n.created_at ? new Date(n.created_at) : new Date()
    };
    return {
      replaceOne: {
        filter: { _id: n.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (notifOps.length > 0) {
    await db.collection('notifications').bulkWrite(notifOps);
    console.log(` notifications: Upserted/Overwritten ${notifRows.length} docs.`);
  }

  // 14. Migrate KNOWLEDGE_VERSIONS
  console.log('Migrating KNOWLEDGE_VERSIONS...');
  const [kvRows] = await mysqlConn.query('SELECT * FROM knowledge_versions');
  const kvOps = kvRows.map(k => {
    updateSeq('knowledge_versions_seq', k.id);
    const doc = {
      _id: k.id,
      entityType: k.entity_type,
      entityId: k.entity_id,
      versionNumber: parseInt(k.version_number || 1),
      contentJson: k.content_json,
      createdBy: k.created_by,
      createdAt: k.created_at ? new Date(k.created_at) : new Date()
    };
    return {
      replaceOne: {
        filter: { _id: k.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (kvOps.length > 0) {
    for (let i = 0; i < kvOps.length; i += 500) {
      const batch = kvOps.slice(i, i + 500);
      await db.collection('knowledge_versions').bulkWrite(batch);
    }
    console.log(` knowledge_versions: Upserted/Overwritten ${kvRows.length} docs.`);
  }

  // 15. Migrate JLPT_N3_GRAMMAR_QUIZZES
  console.log('Migrating JLPT_N3_GRAMMAR_QUIZZES...');
  const [quizRows] = await mysqlConn.query('SELECT * FROM jlpt_n3_grammar_quizzes');
  const quizOps = quizRows.map(q => {
    updateSeq('jlpt_n3_grammar_quizzes_seq', q.id);
    const doc = {
      _id: q.id,
      chapterId: parseInt(q.chapter_id || 0),
      lessonId: parseInt(q.lesson_id || 0),
      questionsJson: q.questions_json,
      createdAt: q.created_at ? new Date(q.created_at) : new Date()
    };
    return {
      replaceOne: {
        filter: { _id: q.id },
        replacement: doc,
        upsert: true
      }
    };
  });
  if (quizOps.length > 0) {
    await db.collection('jlpt_n3_grammar_quizzes').bulkWrite(quizOps);
    console.log(` jlpt_n3_grammar_quizzes: Upserted/Overwritten ${quizRows.length} docs.`);
  }

  // 16. Update DATABASE_SEQUENCES
  console.log('\nUpdating DATABASE_SEQUENCES in MongoDB...');
  for (const [seqName, maxId] of Object.entries(sequences)) {
    await db.collection('database_sequences').updateOne(
      { _id: seqName },
      { $max: { seq: maxId } },
      { upsert: true }
    );
    console.log(` Sequence '${seqName}' updated to >= ${maxId}`);
  }

  await mysqlConn.end();
  await mongoClient.close();

  console.log('\n=====================================================');
  console.log('[SUCCESS] FULL DATA MIGRATION & OVERWRITE COMPLETED SUCCESSFULLY!');
  console.log('=====================================================');
}

runMigration().catch(err => {
  console.error('[ERROR] Migration failed:', err);
  process.exit(1);
});
