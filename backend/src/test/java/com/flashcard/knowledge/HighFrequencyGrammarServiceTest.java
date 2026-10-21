package com.flashcard.knowledge;

import com.flashcard.knowledge.dto.HighFrequencyGrammarDto;
import com.flashcard.knowledge.model.HighFrequencyGrammar;
import com.flashcard.knowledge.model.HighFrequencyGrammarReview;
import com.flashcard.knowledge.repository.HighFrequencyGrammarRepository;
import com.flashcard.knowledge.repository.HighFrequencyGrammarReviewRepository;
import com.flashcard.knowledge.service.HighFrequencyGrammarService;
import com.flashcard.user.model.User;
import com.flashcard.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class HighFrequencyGrammarServiceTest {

    @Mock
    private HighFrequencyGrammarRepository grammarRepository;

    @Mock
    private HighFrequencyGrammarReviewRepository reviewRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private HighFrequencyGrammarService service;

    private User testUser;
    private HighFrequencyGrammar pattern1;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        testUser = new User();
        testUser.setId(100L);
        testUser.setUsername("testuser");

        pattern1 = new HighFrequencyGrammar();
        pattern1.setId(1L);
        pattern1.setRankNumber(1);
        pattern1.setGrammar("〜受身 (bị động)");
        pattern1.setLevel("N4");
        pattern1.setTotalOccurrences(417);
        pattern1.setExamCoverage("30/30");
        pattern1.setPriority("Critical");
        pattern1.setMeaning("thể bị động");
    }

    @Test
    @DisplayName("Lấy danh sách ngữ pháp theo bộ lọc thành công")
    void testGetGrammarList() {
        when(grammarRepository.findAllByOrderByRankNumberAsc()).thenReturn(List.of(pattern1));
        when(reviewRepository.findByUserId(100L)).thenReturn(Collections.emptyList());

        List<HighFrequencyGrammarDto> all = service.getGrammarList(100L, "all");
        assertEquals(1, all.size());
        assertEquals(1, all.get(0).getRankNumber());

        List<HighFrequencyGrammarDto> n4List = service.getGrammarList(100L, "n4");
        assertEquals(1, n4List.size());

        List<HighFrequencyGrammarDto> n3List = service.getGrammarList(100L, "n3");
        assertEquals(0, n3List.size());
    }

    @Test
    @DisplayName("Ôn tập chất lượng 3: isLearned chuyển sang true và interval tăng")
    void testReviewGrammarGoodRating() {
        when(userRepository.findById(100L)).thenReturn(Optional.of(testUser));
        when(grammarRepository.findById(1L)).thenReturn(Optional.of(pattern1));
        when(reviewRepository.findByUserIdAndGrammarId(100L, 1L)).thenReturn(Optional.empty());
        when(reviewRepository.save(any(HighFrequencyGrammarReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        HighFrequencyGrammarDto result = service.reviewGrammar(100L, 1L, 3);
        assertNotNull(result);
        assertTrue(result.getIsLearned());
        assertEquals(1, result.getRepetitions());
        assertEquals(1, result.getIntervalDays());
    }

    @Test
    @DisplayName("BẢO TOÀN TRẠNG THÁI isLearned: Khi từ đã học mà gặp chất lượng 1 (Quên) thì isLearned vẫn giữ nguyên true")
    void testPreserveIsLearnedWhenRatingFailed() {
        HighFrequencyGrammarReview existingReview = new HighFrequencyGrammarReview(testUser, pattern1);
        existingReview.setLearned(true);
        existingReview.setRepetitions(3);
        existingReview.setIntervalDays(15);
        existingReview.setEaseFactor(2.5);

        when(userRepository.findById(100L)).thenReturn(Optional.of(testUser));
        when(grammarRepository.findById(1L)).thenReturn(Optional.of(pattern1));
        when(reviewRepository.findByUserIdAndGrammarId(100L, 1L)).thenReturn(Optional.of(existingReview));
        when(reviewRepository.save(any(HighFrequencyGrammarReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        HighFrequencyGrammarDto result = service.reviewGrammar(100L, 1L, 1);
        assertNotNull(result);
        // Interval reset về 1 ngày
        assertEquals(1, result.getIntervalDays());
        assertEquals(0, result.getRepetitions());
        // Bắt buộc bảo toàn isLearned = true!
        assertTrue(result.getIsLearned(), "Trạng thái isLearned phải được bảo toàn khi điểm ôn tập < 3");
    }

    @Test
    @DisplayName("Ném ngoại lệ IllegalArgumentException khi điểm quality ngoài 1..4")
    void testInvalidQualityThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> service.reviewGrammar(100L, 1L, 0));
        assertThrows(IllegalArgumentException.class, () -> service.reviewGrammar(100L, 1L, 5));
    }
}
