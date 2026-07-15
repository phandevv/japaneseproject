package com.flashcard.service.ai;

import com.flashcard.model.*;
import com.flashcard.repository.GrammarReviewRepository;
import com.flashcard.repository.WordReviewRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PromptBuilder {

    private final WordReviewRepository wordReviewRepository;
    private final GrammarReviewRepository grammarReviewRepository;

    public PromptBuilder(WordReviewRepository wordReviewRepository, GrammarReviewRepository grammarReviewRepository) {
        this.wordReviewRepository = wordReviewRepository;
        this.grammarReviewRepository = grammarReviewRepository;
    }

    public String buildSystemPrompt(User user, String scenario, String jlptLevel) {
        // Fetch User's Vocabulary profile
        List<WordReview> wordReviews = wordReviewRepository.findAllByUserFetchVocabulary(user);
        
        List<String> masteredVocab = wordReviews.stream()
                .filter(wr -> wr.getIntervalDays() > 3)
                .map(wr -> wr.getVocabulary().getKanji() != null ? wr.getVocabulary().getKanji() : wr.getVocabulary().getHiragana())
                .limit(20)
                .collect(Collectors.toList());

        List<String> weakVocab = wordReviews.stream()
                .filter(wr -> wr.getLastRating() != null && wr.getLastRating() <= 2)
                .map(wr -> wr.getVocabulary().getKanji() != null ? wr.getVocabulary().getKanji() : wr.getVocabulary().getHiragana())
                .limit(10)
                .collect(Collectors.toList());

        // Fetch User's Grammar profile
        List<GrammarReview> grammarReviews = grammarReviewRepository.findByUserIdFetchGrammarCard(user.getId());
        
        List<String> masteredGrammar = grammarReviews.stream()
                .filter(GrammarReview::isLearned)
                .map(gr -> gr.getGrammarCard().getGrammar())
                .limit(15)
                .collect(Collectors.toList());

        List<String> weakGrammar = grammarReviews.stream()
                .filter(gr -> gr.getEaseFactor() < 2.2)
                .map(gr -> gr.getGrammarCard().getGrammar())
                .limit(10)
                .collect(Collectors.toList());

        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là một giáo viên tiếng Nhật bản xứ chuyên nghiệp, kiên nhẫn và giàu kinh nghiệm.\n");
        sb.append("Nhiệm vụ của bạn là thực hiện một cuộc hội thoại đóng vai thực tế với học viên.\n\n");
        
        sb.append("=== KỊCH BẢN & VAI TRÒ ===\n");
        sb.append("Kịch bản đóng vai: \"").append(scenario).append("\"\n");
        sb.append("Bạn phải luôn nhập vai (stay in character) phù hợp với kịch bản này. Không tự xưng là AI hay trợ lý.\n\n");

        sb.append("=== TRÌNH ĐỘ JLPT CỦA HỌC VIÊN ===\n");
        sb.append("Trình độ JLPT mục tiêu: ").append(jlptLevel).append("\n");
        sb.append("Yêu cầu điều chỉnh ngôn ngữ của bạn tự động:\n");
        switch (jlptLevel.toUpperCase()) {
            case "N5":
                sb.append("- Từ vựng: Chỉ dùng từ vựng N5 sơ cấp, các từ cơ bản.\n");
                sb.append("- Ngữ pháp: Chỉ sử dụng các cấu trúc câu đơn giản như ~です, ~ます, ~てください, ~たいです.\n");
                sb.append("- Chữ viết: Hạn chế Kanji phức tạp, dùng Hiragana/Katakana nhiều hơn, kèm Kanji có hiragana tương ứng.\n");
                sb.append("- Độ dài câu: Câu cực ngắn (dưới 10 từ).\n");
                break;
            case "N4":
                sb.append("- Từ vựng: Dùng từ vựng N5 và N4.\n");
                sb.append("- Ngữ pháp: Dùng cấu trúc N4 cơ bản như ~たり~たり, ~つもり, ~ています, ~たことがあります.\n");
                sb.append("- Độ dài câu: Câu ngắn, rõ ràng.\n");
                break;
            case "N3":
                sb.append("- Từ vựng: Từ vựng trung cấp N3.\n");
                sb.append("- Ngữ pháp: Cấu trúc N3 như ~うちに, ~ばかり, ~たびに, ~わけではない.\n");
                sb.append("- Chữ viết: Dùng Kanji thông dụng N3.\n");
                sb.append("- Độ dài câu: Câu tự nhiên có độ dài vừa phải.\n");
                break;
            case "N2":
                sb.append("- Từ vựng: Dùng từ vựng phong phú, bao gồm thành ngữ (Idioms) và Collocations trung-cao cấp.\n");
                sb.append("- Ngữ pháp: Các mẫu N2 tinh tế.\n");
                sb.append("- Tốc độ và biểu cảm tự nhiên như người bản xứ nói chuyện thường ngày.\n");
                break;
            default: // N1
                sb.append("- Từ vựng: Sử dụng ngôn ngữ học thuật, trang trọng hoặc các cách diễn đạt cao cấp N1.\n");
                sb.append("- Ngữ pháp: Cấu trúc phức tạp N1.\n");
                sb.append("- Diễn đạt tự nhiên hoàn toàn như người bản xứ nói chuyện công sở hoặc đời sống phức tạp.\n");
                break;
        }
        sb.append("\n");

        sb.append("=== HỒ SƠ HỌC TẬP CỦA NGƯỜI DÙNG ===\n");
        if (!masteredVocab.isEmpty()) {
            sb.append("- Từ vựng đã thành thạo (Hạn chế giải thích thừa): ").append(String.join(", ", masteredVocab)).append("\n");
        }
        if (!weakVocab.isEmpty()) {
            sb.append("- Từ vựng còn yếu (Ưu tiên lồng ghép tự nhiên để ôn tập): ").append(String.join(", ", weakVocab)).append("\n");
        }
        if (!masteredGrammar.isEmpty()) {
            sb.append("- Ngữ pháp đã biết: ").append(String.join(", ", masteredGrammar)).append("\n");
        }
        if (!weakGrammar.isEmpty()) {
            sb.append("- Ngữ pháp còn yếu (Ưu tiên lồng ghép vào câu hỏi của bạn để người học thực hành): ").append(String.join(", ", weakGrammar)).append("\n");
        }
        sb.append("\n");

        sb.append("=== QUY TẮC PHẢN HỒI (BẮT BUỘC TUÂN THỦ) ===\n");
        sb.append("Không được sửa lỗi của người dùng trực tiếp trong lời thoại để tránh ngắt quãng hội thoại.\n");
        sb.append("Khi phù hợp, hãy lồng ghép khéo léo 1 từ vựng mới hoặc 1 cấu trúc ngữ pháp mới cao hơn trình độ hiện tại của họ một chút (micro-learning) vào câu nói.\n");
        sb.append("Phản hồi của bạn BẮT BUỘC phải chia làm 2 phần rõ rệt bằng thẻ [DIALOGUE] và [ANALYSIS] theo định dạng sau:\n\n");
        
        sb.append("[DIALOGUE]\n");
        sb.append("<Lời thoại tiếng Nhật hoàn toàn tự nhiên để hiển thị và phát âm cho người học. Không trộn lẫn tiếng Việt hay giải nghĩa ở đây.>\n");
        sb.append("[ANALYSIS]\n");
        sb.append("{\n");
        sb.append("  \"corrections\": [\n");
        sb.append("     { \"original\": \"câu sai của user\", \"corrected\": \"câu đã sửa đúng\", \"explanation\": \"giải thích ngắn gọn bằng tiếng Việt\", \"type\": \"GRAMMAR|VOCABULARY|POLITENESS\" }\n");
        sb.append("  ],\n");
        sb.append("  \"vocabularyUsed\": [\"danh sách các từ vựng nổi bật bạn vừa dùng trong Dialogue\"],\n");
        sb.append("  \"grammarUsed\": [\"danh sách các cấu trúc ngữ pháp bạn vừa dùng trong Dialogue\"],\n");
        sb.append("  \"detectedMistakes\": [\"các lỗi sai của user được ghi nhận\"],\n");
        sb.append("  \"confidenceScore\": 0.85, \n"); // placeholder/estimated
        sb.append("  \"politenessScore\": 0.90, \n");
        sb.append("  \"naturalnessScore\": 0.80,\n");
        sb.append("  \"expressionsUsed\": [\"cách diễn đạt hay trong Dialogue\"],\n");
        sb.append("  \"introducedNewVocab\": { \"word\": \"từ mới\", \"meaning\": \"nghĩa\", \"reading\": \"cách đọc\" } (nếu có giới thiệu từ mới ở dialogue, không thì null),\n");
        sb.append("  \"introducedNewGrammar\": { \"grammar\": \"mẫu ngữ pháp\", \"meaning\": \"nghĩa\", \"usage\": \"cách dùng\" } (nếu có, không thì null)\n");
        sb.append("}\n\n");
        
        sb.append("Hãy lưu ý: Phần JSON dưới [ANALYSIS] phải là JSON hợp lệ hoàn toàn, không bọc trong markdown block (như ```json).");
        return sb.toString();
    }
}
