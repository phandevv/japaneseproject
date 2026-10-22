/**
 * jlptMondaiMeta.js
 * Comprehensive JLPT N3 Mondai instruction and metadata definitions.
 * Provides official Japanese exam instructions and Vietnamese explanations
 * for each Mondai section across Vocabulary, Grammar, Reading, and Listening.
 */

export const JLPT_N3_MONDAI_DEFINITIONS = {
  // ── PHẦN 1: 言語知識（文字・語彙） ──────────────────────────────────────────
  vocab: {
    1: {
      mondai: 1,
      titleJp: '漢字読み',
      titleVi: 'Cách đọc Hán tự',
      instructionJp: '＿＿の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Chọn cách đọc Hiragana đúng nhất của từ được gạch chân trong câu.',
      shortDesc: 'Tìm cách đọc Kanji'
    },
    2: {
      mondai: 2,
      titleJp: '表記・漢字書き',
      titleVi: 'Cách viết Hán tự',
      instructionJp: '＿＿の言葉を漢字で書くとき、最もよいものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Chọn chữ Hán đúng nhất tương ứng với từ Hiragana được gạch chân.',
      shortDesc: 'Tìm chữ Hán đúng'
    },
    3: {
      mondai: 3,
      titleJp: '文脈規定（空欄補充）',
      titleVi: 'Điền từ vào câu',
      instructionJp: '（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Chọn từ hoặc cụm từ phù hợp nhất với ngữ cảnh để điền vào chỗ trống ( ).',
      shortDesc: 'Điền từ thích hợp'
    },
    4: {
      mondai: 4,
      titleJp: '言い換え類義',
      titleVi: 'Từ gần nghĩa / Đồng nghĩa',
      instructionJp: '＿＿の言葉に意味が最も近いものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Chọn từ có ý nghĩa gần nhất hoặc có thể thay thế cho từ được gạch chân.',
      shortDesc: 'Tìm từ đồng nghĩa'
    },
    5: {
      mondai: 5,
      titleJp: '用法',
      titleVi: 'Cách dùng từ đúng',
      instructionJp: '次の言葉の使い方として最もよいものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Chọn câu diễn đạt tự nhiên và sử dụng đúng ngữ cảnh nhất của từ đã cho.',
      shortDesc: 'Tìm câu dùng đúng từ'
    }
  },

  // ── PHẦN 2: 言語知識（文法）・読解 ───────────────────────────────────────
  grammar_reading: {
    1: {
      mondai: 1,
      titleJp: '文法形式の判断',
      titleVi: 'Ngữ pháp câu',
      instructionJp: '（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Chọn mẫu ngữ pháp phù hợp nhất điền vào chỗ trống ( ) trong câu.',
      shortDesc: 'Ngữ pháp điền câu'
    },
    2: {
      mondai: 2,
      titleJp: '文の組み立て（★）',
      titleVi: 'Sắp xếp câu (Dấu ★)',
      instructionJp: '★に入るものはどれですか。最もよいものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Sắp xếp 4 phương án theo đúng trật tự ngữ pháp và chọn phương án nằm tại vị trí ngôi sao ★.',
      shortDesc: 'Tìm từ vị trí ★'
    },
    3: {
      mondai: 3,
      titleJp: '文章の文法',
      titleVi: 'Ngữ pháp đoạn văn',
      instructionJp: '文章を読んで、文章全体の趣旨を踏まえて、[ 1 ] から [ 5 ] の中に入る最もよいものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Đọc đoạn văn và chọn từ nối hoặc dạng ngữ pháp thích hợp nhất điền vào từng ô trống.',
      shortDesc: 'Điền từ vào bài đọc'
    },
    4: {
      mondai: 4,
      titleJp: '短文読解',
      titleVi: 'Đọc hiểu đoạn ngắn',
      instructionJp: '次の文章を読んで、後の問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Đọc đoạn văn ngắn (~150-200 từ) và chọn câu trả lời chính xác nhất cho câu hỏi.',
      shortDesc: 'Đọc đoạn ngắn'
    },
    5: {
      mondai: 5,
      titleJp: '中文読解',
      titleVi: 'Đọc hiểu đoạn trung',
      instructionJp: '次の文章を読んで、後の問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Đọc đoạn văn có độ dài trung bình (~350 từ) và trả lời các câu hỏi liên quan.',
      shortDesc: 'Đọc đoạn trung'
    },
    6: {
      mondai: 6,
      titleJp: '長文読解',
      titleVi: 'Đọc hiểu bài dài',
      instructionJp: '次の文章を読んで、後の問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Đọc bài văn dài (~550-600 từ) và trả lời các câu hỏi về luận điểm và ý đồ của tác giả.',
      shortDesc: 'Đọc bài văn dài'
    },
    7: {
      mondai: 7,
      titleJp: '情報検索',
      titleVi: 'Tìm kiếm thông tin',
      instructionJp: '右のページ（案内・情報）を見て、後の問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。',
      instructionVi: 'Tra cứu thông tin từ bảng biểu, áp phích hoặc thông báo và chọn câu trả lời đúng theo điều kiện.',
      shortDesc: 'Tra cứu thông tin'
    }
  },

  // ── PHẦN 3: 聴解 ──────────────────────────────────────────────────────────
  listening: {
    1: {
      mondai: 1,
      titleJp: '課題理解',
      titleVi: 'Hiểu yêu cầu / Nhiệm vụ',
      instructionJp: 'まず質問を聞いてください。それから話を聞いて、問題用紙の1から4の中から、最もよいものを一つ選んでください。',
      instructionVi: 'Nghe câu hỏi trước, nghe đoạn hội thoại, sau đó chọn hành động tiếp theo nhân vật sẽ làm.',
      shortDesc: 'Hiểu việc cần làm'
    },
    2: {
      mondai: 2,
      titleJp: 'ポイント理解',
      titleVi: 'Hiểu điểm mấu chốt',
      instructionJp: 'まず質問を聞いてください。そのあと問題用紙の選択肢を読んで、話を聞いて、1から4の中から、最もよいものを一つ選んでください。',
      instructionVi: 'Nghe câu hỏi trước, đọc các phương án lựa chọn, nghe đoạn hội thoại và chọn chi tiết then chốt.',
      shortDesc: 'Nắm điểm mấu chốt'
    },
    3: {
      mondai: 3,
      titleJp: '概要理解',
      titleVi: 'Hiểu nội dung khái quát',
      instructionJp: 'まず話を聞いてください。それから質問と選択肢を聞いて、1から4の中から、最もよいものを一つ選んでください。',
      instructionVi: 'Nghe toàn bộ bài nói, sau đó nghe câu hỏi và các lựa chọn để nắm chủ đề hoặc ý kiến chính.',
      shortDesc: 'Nắm ý chính toàn bài'
    },
    4: {
      mondai: 4,
      titleJp: '発話表現',
      titleVi: 'Cách diễn đạt giao tiếp',
      instructionJp: '絵を見ながら、質問を聞いてください。矢印（➡）の人は何と言いますか。1から3の中から、最もよいものを一つ選んでください。',
      instructionVi: 'Nhìn hình ảnh và nghe câu hỏi, chọn câu nói tự nhiên và phù hợp nhất của người có mũi tên (➡).',
      shortDesc: 'Chọn câu nói theo tranh'
    },
    5: {
      mondai: 5,
      titleJp: '即時応答',
      titleVi: 'Phản xạ nhanh',
      instructionJp: '短い話を聞いて、その返事として最もよいものを、1から3の中から一つ選んでください。',
      instructionVi: 'Nghe một câu nói ngắn và chọn câu phản hồi tức thì hợp lý nhất trong giao tiếp hàng ngày.',
      shortDesc: 'Đối đáp phản xạ nhanh'
    }
  }
};

/**
 * Get Mondai metadata with robust fallbacks
 */
export function getMondaiMeta(sectionId, mondaiNumber, questionType) {
  const normSec = (sectionId || '').toLowerCase();
  let secKey = 'vocab';

  if (normSec.includes('grammar') || normSec.includes('reading') || normSec.includes('dokkai') || normSec.includes('bunpou')) {
    secKey = 'grammar_reading';
  } else if (normSec.includes('listen') || normSec.includes('choukai')) {
    secKey = 'listening';
  }

  const secDict = JLPT_N3_MONDAI_DEFINITIONS[secKey] || JLPT_N3_MONDAI_DEFINITIONS.vocab;
  const num = parseInt(mondaiNumber, 10) || 1;

  if (secDict[num]) {
    return secDict[num];
  }

  // Fallback by questionType if mondai number is out of bounds
  if (questionType === 'KANJI_READING') return secDict[1] || { titleVi: 'Cách đọc Hán tự', shortDesc: 'Kanji' };
  if (questionType === 'KANJI_WRITING') return secDict[2] || { titleVi: 'Cách viết Hán tự', shortDesc: 'Kanji' };
  if (questionType === 'VOCAB_SYNONYM') return secDict[4] || { titleVi: 'Từ gần nghĩa', shortDesc: 'Đồng nghĩa' };
  if (questionType === 'VOCAB_USAGE') return secDict[5] || { titleVi: 'Cách dùng từ', shortDesc: 'Cách dùng' };
  if (questionType === 'STAR_ARRANGEMENT') return JLPT_N3_MONDAI_DEFINITIONS.grammar_reading[2];

  return {
    mondai: num,
    titleJp: `問題 ${num}`,
    titleVi: `Phần câu hỏi ${num}`,
    instructionJp: `問いに対する答えとして最もよいものを、1・2・3・4から一つ選びなさい。`,
    instructionVi: `Chọn phương án trả lời chính xác nhất từ các lựa chọn bên dưới.`,
    shortDesc: `Mondai ${num}`
  };
}
