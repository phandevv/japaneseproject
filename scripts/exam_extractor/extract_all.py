"""
extract_all.py — JLPT N3 Mock Exam PDF Parser
Trích xuất 30 bộ đề thi PDF thành 30 file JSON chuẩn hóa.

Cấu trúc output:
  backend/src/main/resources/static/exams/n3/{examId}.json
  backend/src/main/resources/static/exams/images/{examId}/*.jpg
  backend/src/main/resources/static/exams/audio/{examId}.mp3 (symlink/copy)
"""

import os
import re
import sys
import json
import shutil
import subprocess
from pathlib import Path

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# ── Paths ──────────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SOURCE_DIR = Path(r"C:\Users\bbqdd\Documents\_jsn3\doc\De_thi Jlpt n3")
ANSWER_PDF = SOURCE_DIR / "ĐÁP ÁN JLPT N3 (update 15.10.2026).pdf"

OUT_JSON_DIR = REPO_ROOT / "backend" / "src" / "main" / "resources" / "static" / "exams" / "n3"
OUT_IMG_DIR  = REPO_ROOT / "backend" / "src" / "main" / "resources" / "static" / "exams" / "images"
OUT_AUDIO_DIR = REPO_ROOT / "backend" / "src" / "main" / "resources" / "static" / "exams" / "audio"

for d in [OUT_JSON_DIR, OUT_IMG_DIR, OUT_AUDIO_DIR]:
    d.mkdir(parents=True, exist_ok=True)

import pypdf
from PIL import Image as PILImage
import io

# ── Answer PDF Parser ──────────────────────────────────────────────────────────
SECTION_VOCAB = "vocab"
SECTION_GRAMMAR_READING = "grammar"
SECTION_LISTENING = "listening"

# JLPT N3 chuẩn - số câu cho từng section và mondai
EXAM_STRUCTURE = {
    SECTION_VOCAB: {
        "title": "言語知識（文字・語彙）",
        "titleVi": "Văn tự - Từ vựng",
        "timeLimitSec": 1800,  # 30 phút
        "mondais": {
            1: {"count": 8,  "start": 1,  "type": "KANJI_READING",  "choices": 4},
            2: {"count": 6,  "start": 9,  "type": "KANJI_WRITING",  "choices": 4},
            3: {"count": 11, "start": 15, "type": "VOCAB_CONTEXT",  "choices": 4},
            4: {"count": 5,  "start": 26, "type": "VOCAB_SYNONYM",  "choices": 4},
            5: {"count": 5,  "start": 31, "type": "VOCAB_USAGE",    "choices": 4},
        }
    },
    SECTION_GRAMMAR_READING: {
        "title": "言語知識（文法）・読解",
        "titleVi": "Ngữ pháp - Đọc hiểu",
        "timeLimitSec": 4200,  # 70 phút
        "mondais": {
            1: {"count": 13, "start": 1,  "type": "GRAMMAR_CHOICE",  "choices": 4},
            2: {"count": 5,  "start": 14, "type": "GRAMMAR_REORDER", "choices": 4},
            3: {"count": 4,  "start": 19, "type": "GRAMMAR_PASSAGE", "choices": 4},
            4: {"count": 4,  "start": 23, "type": "READING_SHORT",   "choices": 4},
            5: {"count": 6,  "start": 27, "type": "READING_MEDIUM",  "choices": 4},
            6: {"count": 4,  "start": 33, "type": "READING_LONG",    "choices": 4},
            7: {"count": 2,  "start": 37, "type": "READING_INFO",    "choices": 4},
        }
    },
    SECTION_LISTENING: {
        "title": "聴解",
        "titleVi": "Nghe hiểu",
        "timeLimitSec": 2400,  # 40 phút
        "mondais": {
            1: {"count": 6, "start": 1,  "type": "LISTEN_TASK",      "choices": 4},
            2: {"count": 6, "start": 7,  "type": "LISTEN_POINT",     "choices": 4},
            3: {"count": 3, "start": 13, "type": "LISTEN_OVERVIEW",  "choices": 4},
            4: {"count": 4, "start": 16, "type": "LISTEN_PICTURE",   "choices": 3},
            5: {"count": 9, "start": 20, "type": "LISTEN_IMMEDIATE", "choices": 3},
        }
    }
}

# ── Parse Answer PDF ───────────────────────────────────────────────────────────
def parse_answer_pdf():
    """
    Returns dict keyed by examKey (e.g. "7/2025") → dict of answers.
    Each answers dict: {sectionId: {mondai: {qNum: correctAnswer(int 1-4)}}}
    """
    print("[+] Parsing Answer PDF...")
    reader = pypdf.PdfReader(str(ANSWER_PDF))
    results = {}

    for page_idx in range(1, len(reader.pages)):  # skip cover (page 0)
        text = reader.pages[page_idx].extract_text() or ""
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        if not lines:
            continue

        # Find exam header e.g. "JLPT N3 7/2025"
        exam_match = None
        for line in lines[:4]:
            m = re.search(r'JLPT\s*N3\s+(\d{1,2})[/\-](\d{4})', line, re.IGNORECASE)
            if m:
                exam_match = m
                break
        if not exam_match:
            continue

        month_str, year_str = exam_match.group(1), exam_match.group(2)
        exam_key = f"{int(month_str):02d}/{year_str}"  # "07/2025"

        page_answers = parse_answer_page(text, exam_key)
        results[exam_key] = page_answers
        print(f"  Parsed answers for: {exam_key}")

    print(f"[+] Total exams parsed from answer PDF: {len(results)}")
    return results


def parse_answer_page(text, exam_key):
    """
    Parse one answer page. Returns:
    {
      "vocab": {1: {1:1,2:4,...}, 2: {...}, ...},
      "grammar": {...},
      "listening": {...}
    }
    """
    answers = {SECTION_VOCAB: {}, SECTION_GRAMMAR_READING: {}, SECTION_LISTENING: {}}

    # The answer PDF has a consistent column layout. Use coordinate-based extraction instead.
    # For now, use text-based parsing with known patterns.
    # 文字・語彙 section
    vocab_match = re.search(r'文字・語彙(.*?)(?:文法|$)', text, re.DOTALL)
    if vocab_match:
        vocab_text = vocab_match.group(1)
        # Parse 問題1 through 問題5
        for mondai_num in range(1, 6):
            mondai_info = EXAM_STRUCTURE[SECTION_VOCAB]["mondais"][mondai_num]
            pattern = rf'問題[{mondai_num}１２３４５]?\s*{mondai_num}?\b.*?([0-9\s]+)'
            # Try to extract answers for this mondai
            mondai_answers = extract_answers_from_block(vocab_text, mondai_num, mondai_info["start"], mondai_info["count"])
            if mondai_answers:
                answers[SECTION_VOCAB][mondai_num] = mondai_answers

    # Grammar section
    grammar_match = re.search(r'文法(.*?)(?:読解|$)', text, re.DOTALL)
    if grammar_match:
        grammar_text = grammar_match.group(1)
        for mondai_num in range(1, 4):
            mondai_info = EXAM_STRUCTURE[SECTION_GRAMMAR_READING]["mondais"][mondai_num]
            mondai_answers = extract_answers_from_block(grammar_text, mondai_num, mondai_info["start"], mondai_info["count"])
            if mondai_answers:
                answers[SECTION_GRAMMAR_READING][mondai_num] = mondai_answers

    # Reading section
    reading_match = re.search(r'読解(.*?)(?:聴解|$)', text, re.DOTALL)
    if reading_match:
        reading_text = reading_match.group(1)
        for mondai_num in range(4, 8):
            mondai_info = EXAM_STRUCTURE[SECTION_GRAMMAR_READING]["mondais"][mondai_num]
            mondai_answers = extract_answers_from_sequential_numbers(reading_text, mondai_info["start"], mondai_info["count"])
            if mondai_answers:
                answers[SECTION_GRAMMAR_READING][mondai_num] = mondai_answers

    # Listening section
    listening_match = re.search(r'聴解(.*?)$', text, re.DOTALL)
    if listening_match:
        listening_text = listening_match.group(1)
        for mondai_num in range(1, 6):
            mondai_info = EXAM_STRUCTURE[SECTION_LISTENING]["mondais"][mondai_num]
            mondai_answers = extract_answers_from_sequential_numbers(listening_text, mondai_info["start"], mondai_info["count"])
            if mondai_answers:
                answers[SECTION_LISTENING][mondai_num] = mondai_answers

    return answers


def extract_answers_from_block(text, mondai_num, start_q, count):
    """Extract answers by scanning for a row of numbers following a question-number header."""
    # Look for pattern like: "1 2 3 4 5 6 7 8" on one line then "1 4 1 4 1 2 2 3" on next
    numbers = re.findall(r'\b([1-4])\b', text)
    if len(numbers) < count:
        return {}
    # Try to find blocks of answers that correspond to 'count' questions
    results = {}
    # Find all sequences of 'count' numbers separated by other text
    # We'll use a simple window approach
    for i in range(len(numbers) - count + 1):
        window = numbers[i:i+count]
        # Accept if all are valid choices 1-4
        if all(1 <= int(n) <= 4 for n in window):
            for j, ans in enumerate(window):
                results[start_q + j] = int(ans)
            return results
    return {}


def extract_answers_from_sequential_numbers(text, start_q, count):
    """Extract a sequence of 'count' answer numbers (1-4) from text."""
    results = {}
    # Find pairs of question-number followed by answer
    # Pattern: "23 2 24 3 25 1 26 4"
    pairs = re.findall(r'\b(\d+)\b\s+\b([1-4])\b', text)
    for q_str, ans_str in pairs:
        q = int(q_str)
        if start_q <= q < start_q + count:
            results[q] = int(ans_str)
    if len(results) >= count // 2:  # At least half found
        return results
    # Fallback: just extract raw numbers
    numbers = re.findall(r'\b([1-4])\b', text)
    if len(numbers) >= count:
        for j in range(count):
            results[start_q + j] = int(numbers[j])
    return results


# ── Exam Directory Discovery ────────────────────────────────────────────────────
def discover_exams():
    """
    Returns list of dicts: [{
        'examId': 'n3-2025-07',
        'year': 2025,
        'month': 7,
        'examKey': '07/2025',
        'examDir': Path,
        'examPdf': Path,
        'scriptPdf': Path,
        'audioSrc': Path (may be None if need RAR extract)
    }]
    """
    exams = []
    for d in sorted(SOURCE_DIR.iterdir()):
        if not d.is_dir():
            continue
        m = re.search(r'N3\s+(\d{1,2})-(\d{4})', d.name, re.IGNORECASE)
        if not m:
            continue
        month = int(m.group(1))
        year  = int(m.group(2))
        exam_id = f"n3-{year}-{month:02d}"
        exam_key = f"{month:02d}/{year}"

        # Find PDF files
        pdfs = list(d.glob("*.pdf"))
        exam_pdf = None
        script_pdf = None
        for p in pdfs:
            if 'script' in p.name.lower():
                script_pdf = p
            else:
                exam_pdf = p

        # Find audio
        mp3_files = list(d.glob("*.mp3"))
        rar_files = list(d.glob("*.rar"))
        audio_src = mp3_files[0] if mp3_files else None

        exams.append({
            "examId": exam_id,
            "year": year,
            "month": month,
            "examKey": exam_key,
            "examDir": d,
            "examPdf": exam_pdf,
            "scriptPdf": script_pdf,
            "audioSrc": audio_src,
            "rarSrc": rar_files[0] if rar_files and not audio_src else None,
        })

    exams.sort(key=lambda e: (e["year"], e["month"]))
    print(f"[+] Discovered {len(exams)} exam sets")
    return exams


# ── Image Extraction ────────────────────────────────────────────────────────────
def extract_images_from_exam_pdf(exam_pdf_path, exam_id):
    """Extract embedded images from exam PDF, save to out/images/{examId}/"""
    img_dir = OUT_IMG_DIR / exam_id
    img_dir.mkdir(parents=True, exist_ok=True)

    reader = pypdf.PdfReader(str(exam_pdf_path))
    image_map = {}  # page_num → [image_filename, ...]

    for p_idx, page in enumerate(reader.pages):
        resources = page.get('/Resources')
        if not resources:
            continue
        try:
            res_obj = resources.get_object() if hasattr(resources, 'get_object') else resources
            xobjects = res_obj.get('/XObject')
            if not xobjects:
                continue
            xobj_map = xobjects.get_object() if hasattr(xobjects, 'get_object') else xobjects
        except Exception:
            continue

        for name, ref in xobj_map.items():
            try:
                xobj = ref.get_object()
                if xobj.get('/Subtype') != '/Image':
                    continue
                # Extract via pypdf's image API
                page_imgs = page.images
                for img in page_imgs:
                    safe_name = re.sub(r'[^\w\.]', '_', img.name) + ".jpg"
                    out_path = img_dir / safe_name
                    if not out_path.exists():
                        img.image.convert("RGB").save(str(out_path), "JPEG", quality=90)
                    page_key = p_idx + 1
                    if page_key not in image_map:
                        image_map[page_key] = []
                    image_map[page_key].append(f"/exams/images/{exam_id}/{safe_name}")
                break  # avoid duplicate processing per page
            except Exception:
                continue

    print(f"  Extracted images: {sum(len(v) for v in image_map.values())} images across {len(image_map)} pages")
    return image_map


# ── Exam PDF Text Parser ─────────────────────────────────────────────────────────
def parse_exam_pdf_questions(exam_pdf_path, exam_id, image_map):
    """
    Parse exam PDF into structured sections with questions.
    Returns dict: {sectionId: [question_dicts]}
    """
    reader = pypdf.PdfReader(str(exam_pdf_path))
    all_text_by_page = []
    for i, page in enumerate(reader.pages):
        all_text_by_page.append((i + 1, page.extract_text() or ""))

    # Collect all text
    full_text = "\n".join(t for _, t in all_text_by_page)
    pages_text = {pnum: txt for pnum, txt in all_text_by_page}

    sections = {}
    for section_id, section_def in EXAM_STRUCTURE.items():
        section_questions = []
        for mondai_num, mondai_info in section_def["mondais"].items():
            for q_offset in range(mondai_info["count"]):
                q_num_in_mondai = q_offset + 1
                q_num_global = mondai_info["start"] + q_offset
                q_id = f"{exam_id}-{section_id}-m{mondai_num}-q{q_num_global}"

                # For listening questions, find page and image refs
                image_ref = None
                if section_id == SECTION_LISTENING and mondai_info["type"] == "LISTEN_PICTURE":
                    # Mondai 4 has images — map to images in the page range for 聴解
                    for page_num, imgs in image_map.items():
                        if imgs and page_num >= 20:  # listening starts around page 20
                            if image_ref is None:
                                image_ref = imgs[0]
                                break

                question = {
                    "id": q_id,
                    "section": section_id,
                    "mondai": mondai_num,
                    "questionNumber": q_num_global,
                    "questionType": mondai_info["type"],
                    "questionText": "",   # Will be filled by text parser
                    "passage": None,
                    "choices": [],
                    "correctAnswer": 0,   # Will be filled from answer PDF
                    "imageRef": image_ref,
                    "audioStartSec": None,
                    "audioEndSec": None,
                }
                section_questions.append(question)
        sections[section_id] = section_questions

    # Now try to extract question text from PDF
    extract_question_texts(full_text, pages_text, sections, exam_id)

    return sections


def extract_question_texts(full_text, pages_text, sections, exam_id):
    """Best-effort extraction of question text from exam PDF text."""
    lines = full_text.splitlines()

    # Vocab section: questions are numbered
    # Grammar section: questions are numbered starting from 1 again within section
    # Listening section: questions by 番 or number

    # Extract choices for vocabulary questions (4 choices per question)
    vocab_questions = sections[SECTION_VOCAB]
    grammar_questions = sections[SECTION_GRAMMAR_READING]
    listening_questions = sections[SECTION_LISTENING]

    # Parse lines to find question patterns
    current_section = None
    current_mondai = None

    q_pattern = re.compile(r'^\s*(\d{1,3})\s+(.+)$')
    choice_pattern = re.compile(r'^([1-4])\s+(.+)$')

    # Map question_global_num → question object
    vocab_q_map = {q["questionNumber"]: q for q in vocab_questions}
    grammar_q_map = {q["questionNumber"]: q for q in grammar_questions}
    listening_q_map = {q["questionNumber"]: q for q in listening_questions}

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Detect section transitions
        if '文字・語彙' in stripped:
            current_section = SECTION_VOCAB
        elif '文法' in stripped and '語彙' not in stripped:
            current_section = SECTION_GRAMMAR_READING
        elif '聴解' in stripped:
            current_section = SECTION_LISTENING

        # Detect question number
        m = q_pattern.match(stripped)
        if m:
            q_num = int(m.group(1))
            q_text = m.group(2)
            if current_section == SECTION_VOCAB and q_num in vocab_q_map:
                vocab_q_map[q_num]["questionText"] = q_text
            elif current_section == SECTION_GRAMMAR_READING and q_num in grammar_q_map:
                grammar_q_map[q_num]["questionText"] = q_text
            elif current_section == SECTION_LISTENING and q_num in listening_q_map:
                listening_q_map[q_num]["questionText"] = q_text


# ── Build Choices from Answer PDF Structure ─────────────────────────────────────
def apply_answers(sections, answers, exam_id):
    """Merge answer data into question structures."""
    section_map = {
        SECTION_VOCAB: answers.get(SECTION_VOCAB, {}),
        SECTION_GRAMMAR_READING: answers.get(SECTION_GRAMMAR_READING, {}),
        SECTION_LISTENING: answers.get(SECTION_LISTENING, {}),
    }

    for section_id, questions in sections.items():
        mondai_answers = section_map.get(section_id, {})
        for q in questions:
            mondai_num = q["mondai"]
            q_num = q["questionNumber"]
            mondai_data = mondai_answers.get(mondai_num, {})
            if q_num in mondai_data:
                q["correctAnswer"] = mondai_data[q_num]

            # Generate placeholder choices (A,B,C,D or 1,2,3)
            max_choices = EXAM_STRUCTURE[section_id]["mondais"][mondai_num]["choices"]
            if not q["choices"]:
                q["choices"] = [str(i) for i in range(1, max_choices + 1)]


# ── Audio Handling ───────────────────────────────────────────────────────────────
def copy_audio(exam, exam_id):
    """Copy or extract audio file for the exam."""
    out_path = OUT_AUDIO_DIR / f"{exam_id}.mp3"
    if out_path.exists():
        return True

    if exam["audioSrc"] and exam["audioSrc"].exists():
        shutil.copy2(str(exam["audioSrc"]), str(out_path))
        print(f"  Copied audio: {exam['audioSrc'].name} → {out_path.name}")
        return True

    if exam["rarSrc"] and exam["rarSrc"].exists():
        # Extract from RAR using system tar
        tmp_dir = OUT_AUDIO_DIR / "_tmp_extract"
        tmp_dir.mkdir(exist_ok=True)
        try:
            result = subprocess.run(
                ["tar", "-xf", str(exam["rarSrc"]), "-C", str(tmp_dir)],
                capture_output=True, timeout=30
            )
            # Find extracted MP3
            extracted = list(tmp_dir.glob("*.mp3"))
            if extracted:
                shutil.copy2(str(extracted[0]), str(out_path))
                shutil.rmtree(str(tmp_dir), ignore_errors=True)
                print(f"  Extracted audio from RAR: {out_path.name}")
                return True
        except Exception as e:
            print(f"  WARNING: Could not extract RAR for {exam_id}: {e}")
        shutil.rmtree(str(tmp_dir), ignore_errors=True)

    print(f"  WARNING: No audio source for {exam_id}")
    return False


# ── Main ────────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("JLPT N3 Exam Extractor")
    print("=" * 60)

    # Step 1: Parse all answers
    all_answers = parse_answer_pdf()

    # Step 2: Discover exams
    exams = discover_exams()

    errors = []
    success_count = 0

    for exam in exams:
        exam_id = exam["examId"]
        exam_key = exam["examKey"]
        year, month = exam["year"], exam["month"]

        print(f"\n{'─'*50}")
        print(f"Processing: {exam_id} (Key: {exam_key})")

        out_json = OUT_JSON_DIR / f"{exam_id}.json"
        if out_json.exists():
            print(f"  [SKIP] JSON already exists: {out_json.name}")
            success_count += 1
            continue

        # Map answer key (try both zero-padded and not)
        answers = (all_answers.get(exam_key)
                   or all_answers.get(f"{month}/{year}")
                   or {})
        if not answers:
            print(f"  WARNING: No answers found for {exam_key}")
            errors.append(f"{exam_id}: missing answers")

        # Extract images
        image_map = {}
        if exam["examPdf"] and exam["examPdf"].exists():
            try:
                image_map = extract_images_from_exam_pdf(exam["examPdf"], exam_id)
            except Exception as e:
                print(f"  WARNING: Image extraction failed: {e}")

        # Parse exam structure
        sections = {}
        if exam["examPdf"] and exam["examPdf"].exists():
            try:
                sections = parse_exam_pdf_questions(exam["examPdf"], exam_id, image_map)
            except Exception as e:
                print(f"  WARNING: Exam PDF parsing failed: {e}")
                errors.append(f"{exam_id}: exam PDF parse error: {e}")

        if not sections:
            # Fallback: build skeleton structure with no text
            for section_id, section_def in EXAM_STRUCTURE.items():
                section_questions = []
                for mondai_num, mondai_info in section_def["mondais"].items():
                    for q_offset in range(mondai_info["count"]):
                        q_num = mondai_info["start"] + q_offset
                        section_questions.append({
                            "id": f"{exam_id}-{section_id}-m{mondai_num}-q{q_num}",
                            "section": section_id,
                            "mondai": mondai_num,
                            "questionNumber": q_num,
                            "questionType": mondai_info["type"],
                            "questionText": "",
                            "passage": None,
                            "choices": [str(i) for i in range(1, mondai_info["choices"] + 1)],
                            "correctAnswer": 0,
                            "imageRef": None,
                            "audioStartSec": None,
                            "audioEndSec": None,
                        })
                sections[section_id] = section_questions

        # Apply answers
        apply_answers(sections, answers, exam_id)

        # Build output JSON
        exam_json = {
            "examId": exam_id,
            "level": "N3",
            "year": year,
            "month": month,
            "title": f"JLPT N3 — {'Tháng 7' if month == 7 else 'Tháng 12'}/{year}",
            "totalQuestions": sum(len(qs) for qs in sections.values()),
            "audioFile": f"{exam_id}.mp3",
            "sections": [
                {
                    "sectionId": section_id,
                    "title": EXAM_STRUCTURE[section_id]["title"],
                    "titleVi": EXAM_STRUCTURE[section_id]["titleVi"],
                    "timeLimitSec": EXAM_STRUCTURE[section_id]["timeLimitSec"],
                    "totalQuestions": len(questions),
                    "questions": questions,
                }
                for section_id, questions in sections.items()
            ]
        }

        # Count answered questions
        answered = sum(1 for sec in exam_json["sections"] for q in sec["questions"] if q["correctAnswer"] > 0)
        total = exam_json["totalQuestions"]

        # Write JSON
        with open(str(out_json), "w", encoding="utf-8") as f:
            json.dump(exam_json, f, ensure_ascii=False, indent=2)

        print(f"  [OK] Written: {out_json.name} ({total} questions, {answered} with answers)")

        # Copy audio
        copy_audio(exam, exam_id)

        if answered < total * 0.5:
            errors.append(f"{exam_id}: only {answered}/{total} questions have answers")

        success_count += 1

    print(f"\n{'='*60}")
    print(f"Done! {success_count}/{len(exams)} exams processed.")
    if errors:
        print(f"\nWARNINGS/ERRORS ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")
    else:
        print("No errors! All exams extracted successfully.")
    print(f"\nOutput: {OUT_JSON_DIR}")

if __name__ == "__main__":
    main()
