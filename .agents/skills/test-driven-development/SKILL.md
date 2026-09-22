---
name: test-driven-development
description: Use when implementing any feature or bugfix in NihongoCards, before writing implementation code
---

# Test-Driven Development (TDD) for NihongoCards

## Overview

Write the test first. Watch it fail. Write minimal code to pass. Refactor cleanly.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

## When to Use

**Always:**
- New Spring Boot REST API endpoints, services, repositories
- New React components, state hooks, or API client methods
- Bug fixes across backend and frontend
- Refactoring existing business logic
- Behavior changes in SM-2 / SRS, Vocab search, Auth, Analytics

**Exceptions (ask your human partner):**
- Throwaway prototypes / spikes
- One-off migration scripts

Thinking "skip TDD just this once"? Stop. That's rationalization.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Delete means delete

## Red-Green-Refactor Cycle in NihongoCards

```
1. RED: Write a failing test showing desired behavior.
2. VERIFY RED: Run test command in PowerShell. Confirm it fails for expected reason.
3. GREEN: Write minimal production code (NO Lombok! Standard getters/setters).
4. VERIFY GREEN: Run test command. Confirm it passes and entire test suite is green.
5. REFACTOR: Clean up naming, remove duplication, maintain `@Transactional` & clean layering.
```

---

## Backend Testing (Java 21 & Spring Boot 3.5.x)

### 1. Test Command in PowerShell

```powershell
# Run a specific test class
./mvnw.cmd test -Dtest=SrsServiceTest

# Run a specific test method
./mvnw.cmd test -Dtest=SrsServiceTest#testReviewWord_PreservesIsLearned_WhenScoreIsLow

# Run all backend tests
./mvnw.cmd test
```

### 2. RED - Write Failing Test First

Use JUnit 5 (`org.junit.jupiter.api.Test`), AssertJ (`assertThat`), and Mockito (`@ExtendWith(MockitoExtension.class)`):

```java
@ExtendWith(MockitoExtension.class)
class SrsServiceTest {

    @Mock
    private WordReviewRepository wordReviewRepository;

    @Mock
    private VocabularyRepository vocabularyRepository;

    @InjectMocks
    private SrsService srsService;

    @Test
    @DisplayName("When review rating is 1 (Forgot), interval resets to 1 but isLearned remains true if previously learned")
    void testReviewWord_PreservesIsLearned_WhenScoreIsLow() {
        // Arrange: Word already learned previously (isLearned = true)
        User user = new User();
        user.setId(1L);

        Vocabulary vocab = new Vocabulary();
        vocab.setId(10L);

        WordReview existingReview = new WordReview();
        existingReview.setUser(user);
        existingReview.setVocabulary(vocab);
        existingReview.setLearned(true); // Already learned
        existingReview.setRepetition(5);
        existingReview.setIntervalDays(15);
        existingReview.setEaseFactor(2.5);

        when(wordReviewRepository.findByUserIdAndVocabularyId(1L, 10L))
                .thenReturn(Optional.of(existingReview));
        when(wordReviewRepository.save(any(WordReview.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act: User rates quality = 1 (Forgot)
        WordReview updated = srsService.reviewWord(user, 10L, 1);

        // Assert: Interval resets to 1, but isLearned MUST remain true
        assertThat(updated.getIntervalDays()).isEqualTo(1);
        assertThat(updated.isLearned()).isTrue(); // Invariant: never reset to false!
    }
}
```

### 3. VERIFY RED

Run:
```powershell
./mvnw.cmd test -Dtest=SrsServiceTest#testReviewWord_PreservesIsLearned_WhenScoreIsLow
```
Confirm:
- Test fails (compilation error if method doesn't exist, or assertion failure).
- Failure is caused by missing implementation, not a typo or syntax bug.

### 4. GREEN - Minimal Code (NO Lombok!)

Write minimal code in `SrsService.java`:
```java
@Service
public class SrsService {

    private final WordReviewRepository wordReviewRepository;
    private final VocabularyRepository vocabularyRepository;

    // Standard constructor injection (NO Lombok)
    public SrsService(WordReviewRepository wordReviewRepository, VocabularyRepository vocabularyRepository) {
        this.wordReviewRepository = wordReviewRepository;
        this.vocabularyRepository = vocabularyRepository;
    }

    @Transactional
    public WordReview reviewWord(User user, Long vocabId, int quality) {
        WordReview review = wordReviewRepository.findByUserIdAndVocabularyId(user.getId(), vocabId)
                .orElseGet(() -> createInitialReview(user, vocabId));

        if (quality < 3) {
            review.setIntervalDays(1);
            review.setRepetition(0);
            // Invariant: If already learned, do NOT reset isLearned to false!
        } else {
            review.setLearned(true);
            // compute SM-2 interval...
        }
        return wordReviewRepository.save(review);
    }
}
```

### 5. VERIFY GREEN

Run:
```powershell
./mvnw.cmd test -Dtest=SrsServiceTest
```
Confirm:
- Test passes.
- Full suite passes (`./mvnw.cmd test`).

---

## Web Layer Testing (Controller with MockMvc)

```java
@WebMvcTest(SrsController.class)
class SrsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SrsService srsService;

    @MockBean
    private JwtUtil jwtUtil; // Mock security dependencies

    @Test
    @WithMockUser(username = "testuser")
    void testReviewEndpoint_Success() throws Exception {
        mockMvc.perform(post("/api/srs/review")
                .param("vocabId", "10")
                .param("quality", "3")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
```

---

## Frontend Testing (React 19 & Vite)

### Test Command in PowerShell

```powershell
cd frontend
npm test
# or verify compilation / linter:
npm run build
```

---

## NihongoCards Specific Rules During TDD

1. **NO Lombok Allowed**:
   - In entities (`User`, `Vocabulary`, `WordReview`), DTOs, and test helpers, never use `@Getter`, `@Setter`, `@Data`, `@NoArgsConstructor`.
   - Write standard Java getters, setters, and constructors.
2. **Transaction Boundaries**:
   - Any service method modifying data must be annotated with `@Transactional`.
3. **Preserve SM-2 `is_learned`**:
   - Any SRS test suite must verify that words previously marked `is_learned = true` do not lose that flag if the user subsequently rates them 1 or 2.
4. **Dual-Database Safety**:
   - JPA queries must remain compatible with both H2 (local file) and MySQL 8.0 (production AWS RDS).

## Verification Checklist Before Completing TDD

- [ ] Every new service method / endpoint has a corresponding test.
- [ ] Watched each test fail before implementing the code.
- [ ] Test failed for expected reason (business logic missing, not typo).
- [ ] Minimal code implemented to pass the test.
- [ ] All tests pass: `./mvnw.cmd test` (Backend) / `npm test` (Frontend).
- [ ] Clean output with 0 failures, 0 errors, 0 warnings.
- [ ] No Lombok annotations introduced.
