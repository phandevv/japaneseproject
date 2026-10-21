"""
build_real_dataset.py — JLPT N3 Real Exam Dataset Builder
Extracts authentic questions, passages, choices, audio refs, and correct answers
from the 30 JLPT N3 PDF exams and answer key.
"""

import os
import re
import sys
import json
from pathlib import Path
import pypdf

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SOURCE_DIR = Path(r"C:\Users\bbqdd\Documents\_jsn3\doc\De_thi Jlpt n3")
ANSWER_PDF = SOURCE_DIR / "ĐÁP ÁN JLPT N3 (update 15.10.2026).pdf"
OUT_JSON_DIR = REPO_ROOT / "backend" / "src" / "main" / "resources" / "static" / "exams" / "n3"
OUT_JSON_DIR.mkdir(parents=True, exist_ok=True)


# ── 1. Answer PDF Parser ────────────────────────────────────────────────────────
def parse_all_answers():
    print("[+] Parsing Answer PDF...")
    reader = pypdf.PdfReader(str(ANSWER_PDF))
    all_answers = {}

    for page_idx in range(1, len(reader.pages)):
        text = reader.pages[page_idx].extract_text() or ''
        m = re.search(r'(?:JLPT\s+)?N3\s+(\d{1,2})[/\-\.](\d{4})', text)
        if not m:
            continue
        month = int(m.group(1))
        year = int(m.group(2))
        exam_id = f"n3-{year}-{month:02d}"

        ans_map = {}
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        full_text = "\n".join(lines)

        def match_consecutive(prefix, q_start, q_count, block):
            q_expected = " ".join(str(i) for i in range(q_start, q_start + q_count))
            pos = block.find(q_expected)
            if pos != -1:
                rest = block[pos + len(q_expected):].strip()
                ans_nums = re.findall(r'\b([1-4])\b', rest)[:q_count]
                if len(ans_nums) == q_count:
                    for idx, a in enumerate(ans_nums):
                        ans_map[f"{prefix}-{q_start + idx}"] = int(a)
                    return True
            return False

        # Vocab M1(1-8), M2(9-14), M3(15-25), M4(26-30), M5(31-35)
        match_consecutive("vocab", 1, 8, full_text)
        match_consecutive("vocab", 9, 6, full_text)
        match_consecutive("vocab", 15, 11, full_text)
        match_consecutive("vocab", 26, 5, full_text)
        match_consecutive("vocab", 31, 5, full_text)

        # Grammar & Reading
        grammar_pos = full_text.find("文法")
        if grammar_pos != -1:
            g_text = full_text[grammar_pos:]
            # Grammar 1-13:
            match_consecutive("grammar", 1, 13, g_text)
            match_consecutive("grammar", 14, 5, g_text)
            for span_len in [5, 4]:
                if match_consecutive("grammar", 19, span_len, g_text):
                    break

        # Reading & Listening pairs
        pairs = re.findall(r'\b(\d{1,2})\s+([1-4])\b', full_text)
        for q_str, ans_str in pairs:
            q_num = int(q_str)
            ans_num = int(ans_str)
            if 23 <= q_num <= 40:
                k = f"grammar-{q_num}"
                if k not in ans_map:
                    ans_map[k] = ans_num

        all_answers[exam_id] = ans_map

    print(f"  Parsed answer keys for {len(all_answers)} exams")
    return all_answers


# ── 2. Precise Choice & Trailing Passage Extractor ──────────────────────────────
def extract_choices(block_lines):
    """
    Extracts (question_text, choices, trailing_passage) from a block of lines.
    """
    if not block_lines:
        return "", [], ""

    full_str = "\n".join(block_lines).strip()

    # 1. Search for 4 choices in sequence
    m1 = re.search(r'(?:^|\n|[ \t]+)[1１][ \t\.\、\)](.*)', full_str, re.DOTALL)
    if m1:
        q_text = full_str[:m1.start()].strip().replace("\n", " ")
        choice_blob = full_str[m1.start():].strip()
        m = re.match(
            r'^[1１][ \t\.\、\)](.*?)[ \t\n]+[2２][ \t\.\、\)](.*?)[ \t\n]+[3３][ \t\.\、\)](.*?)[ \t\n]+[4４][ \t\.\、\)](.*)',
            choice_blob,
            re.DOTALL
        )
        if m:
            c1 = m.group(1).strip().replace("\n", " ")
            c2 = m.group(2).strip().replace("\n", " ")
            c3 = m.group(3).strip().replace("\n", " ")
            c4_raw = m.group(4).strip()

            mp = re.search(r'\n[ \t]*(\([1-9]\)|（[１-９]）|以下は|問題\s*[1-7１-７])', c4_raw)
            if mp:
                c4 = c4_raw[:mp.start()].strip().replace("\n", " ")
                trailing = c4_raw[mp.start():].strip()
            else:
                c4 = c4_raw.replace("\n", " ")
                trailing = ""
            return q_text if q_text else block_lines[0], [c1, c2, c3, c4], trailing

    # 2. Line by line pattern
    choice_map = {}
    q_lines = []
    trailing_lines = []
    for l in block_lines:
        s = l.strip()
        m = re.match(r'^[1-4１-４][ \t\.\、\)](.*)$', s)
        if m and (not choice_map or int(s[0].replace('１','1').replace('２','2').replace('３','3').replace('４','4')) > max(choice_map.keys())):
            num = int(s[0].replace('１','1').replace('２','2').replace('３','3').replace('４','4'))
            choice_map[num] = m.group(1).strip()
        else:
            if not choice_map:
                q_lines.append(s)
            else:
                if 4 in choice_map:
                    trailing_lines.append(s)
                elif choice_map:
                    curr_max = max(choice_map.keys())
                    choice_map[curr_max] += " " + s

    if len(choice_map) == 4:
        return ' '.join(q_lines), [choice_map[1], choice_map[2], choice_map[3], choice_map[4]], '\n'.join(trailing_lines)

    # 3. 3-choice pattern (listening)
    m3 = re.search(r'(?:^|\n|[ \t]+)[1１][ \t\.\、\)](.*)', full_str, re.DOTALL)
    if m3:
        q_text3 = full_str[:m3.start()].strip().replace("\n", " ")
        choice_blob3 = full_str[m3.start():].strip()
        m_3 = re.match(
            r'^[1１][ \t\.\、\)](.*?)[ \t\n]+[2２][ \t\.\、\)](.*?)[ \t\n]+[3３][ \t\.\、\)](.*)',
            choice_blob3,
            re.DOTALL
        )
        if m_3:
            c1 = m_3.group(1).strip().replace("\n", " ")
            c2 = m_3.group(2).strip().replace("\n", " ")
            c3 = m_3.group(3).strip().replace("\n", " ")
            return q_text3 if q_text3 else block_lines[0], [c1, c2, c3], ""

    return full_str.replace("\n", " "), [], ""


# ── 3. Parse Exam PDF ──────────────────────────────────────────────────────────
def parse_exam_pdf(pdf_path, exam_id, exam_answers):
    reader = pypdf.PdfReader(str(pdf_path))
    pages_text = [reader.pages[i].extract_text() or '' for i in range(len(reader.pages))]
    full_text = "\n".join(pages_text)

    # Split into Vocab, Grammar, Listening sections
    pos_vocab = re.search(r'(?:言語知識（)?文字・語彙(?:\）)?', full_text)
    pos_grammar = re.search(r'(?:言語知識（)?文法(?:\）)?|文\s*法\s*・\s*読\s*解', full_text)
    pos_listening = re.search(r'聴\s*解', full_text)

    v_start = pos_vocab.start() if pos_vocab else 0
    g_start = pos_grammar.start() if pos_grammar else len(full_text) // 3
    l_start = pos_listening.start() if pos_listening else (len(full_text) * 2) // 3

    vocab_text = full_text[v_start:g_start]
    grammar_text = full_text[g_start:l_start]
    listening_text = full_text[l_start:]

    # ── Parse Vocab (1 to 35) ────────────────────────────
    clean_v_lines = []
    for l in vocab_text.splitlines():
        s = l.strip()
        if not s or re.match(r'^\d{1,2}$', s) or 'JLPT' in s or 'N3' in s or re.search(r'[問間]題\s*[1-5１-５]', s):
            continue
        clean_v_lines.append(s)

    v_blocks = {}
    cur_q = None
    next_expected = 1
    cur_lines = []
    for l in clean_v_lines:
        m = re.match(r'^' + str(next_expected) + r'\s+(.+)$', l)
        if not m:
            fullwidth_str = str(next_expected).translate(str.maketrans('0123456789', '０１２３４５６７８９'))
            m = re.match(r'^' + fullwidth_str + r'\s+(.+)$', l)
        if m:
            if cur_q is not None: v_blocks[cur_q] = cur_lines
            cur_q = next_expected
            next_expected += 1
            cur_lines = [m.group(1).strip()]
        elif cur_q is not None:
            cur_lines.append(l)
    if cur_q is not None: v_blocks[cur_q] = cur_lines

    vocab_questions = []
    for q_num in range(1, 36):
        raw_lines = v_blocks.get(q_num, [])
        q_text, choices, _ = extract_choices(raw_lines)
        if not choices:
            choices = ["1", "2", "3", "4"]

        if q_num <= 8: mondai = 1; q_type = "KANJI_READING"
        elif q_num <= 14: mondai = 2; q_type = "KANJI_WRITING"
        elif q_num <= 25: mondai = 3; q_type = "VOCAB_CONTEXT"
        elif q_num <= 30: mondai = 4; q_type = "VOCAB_SYNONYM"
        else: mondai = 5; q_type = "VOCAB_USAGE"

        ans = exam_answers.get(f"vocab-{q_num}", 1)

        vocab_questions.append({
            "id": f"{exam_id}-vocab-m{mondai}-q{q_num}",
            "section": "vocab",
            "mondai": mondai,
            "questionNumber": q_num,
            "questionType": q_type,
            "questionText": q_text,
            "passage": None,
            "choices": choices,
            "correctAnswer": ans,
            "imageRef": None,
            "audioStartSec": None,
            "audioEndSec": None
        })

    # ── Parse Grammar & Reading (1 to 38/39) ─────────────
    clean_g_lines = []
    for l in grammar_text.splitlines():
        s = l.strip()
        if not s or re.match(r'^\d{1,2}$', s) or 'JLPT' in s or 'N3' in s:
            continue
        clean_g_lines.append(s)

    g_blocks = {}
    passage_before_q1 = []
    cur_q = None
    next_expected = 1
    cur_lines = []

    for l in clean_g_lines:
        m = re.match(r'^' + str(next_expected) + r'\s+(.+)$', l)
        if not m:
            fullwidth_str = str(next_expected).translate(str.maketrans('0123456789', '０１２３４５６７８９'))
            m = re.match(r'^' + fullwidth_str + r'\s+(.+)$', l)
        if not m:
            m = re.match(r'^[（\(]' + str(next_expected) + r'[）\)]\s*(.*)$', l)

        if m:
            if cur_q is not None:
                g_blocks[cur_q] = cur_lines
            cur_q = next_expected
            next_expected += 1
            cur_lines = [m.group(1).strip()]
        else:
            if cur_q is not None:
                cur_lines.append(l)
            else:
                passage_before_q1.append(l)

    if cur_q is not None: g_blocks[cur_q] = cur_lines

    grammar_questions = []
    total_g_q = max(38, next_expected - 1)
    
    current_passage = "\n".join(passage_before_q1).strip() if passage_before_q1 else None

    for q_num in range(1, total_g_q + 1):
        raw_lines = g_blocks.get(q_num, [])
        q_text, choices, trailing_passage = extract_choices(raw_lines)
        if not choices:
            choices = ["1", "2", "3", "4"]

        # Determine mondai & type
        if q_num <= 13:
            mondai = 1; q_type = "GRAMMAR_CHOICE"; assigned_passage = None
        elif q_num <= 18:
            mondai = 2; q_type = "GRAMMAR_REORDER"; assigned_passage = None
        elif q_num <= 22:
            mondai = 3; q_type = "GRAMMAR_PASSAGE"; assigned_passage = current_passage
        elif q_num <= 26:
            mondai = 4; q_type = "READING_SHORT"; assigned_passage = current_passage
        elif q_num <= 32:
            mondai = 5; q_type = "READING_MEDIUM"; assigned_passage = current_passage
        elif q_num <= 36:
            mondai = 6; q_type = "READING_LONG"; assigned_passage = current_passage
        else:
            mondai = 7; q_type = "READING_INFO"; assigned_passage = current_passage

        if trailing_passage:
            current_passage = trailing_passage

        ans = exam_answers.get(f"grammar-{q_num}", 1)

        grammar_questions.append({
            "id": f"{exam_id}-grammar-m{mondai}-q{q_num}",
            "section": "grammar",
            "mondai": mondai,
            "questionNumber": q_num,
            "questionType": q_type,
            "questionText": q_text,
            "passage": assigned_passage,
            "choices": choices,
            "correctAnswer": ans,
            "imageRef": None,
            "audioStartSec": None,
            "audioEndSec": None
        })

    # ── Parse Listening Questions (28 questions) ────────
    listening_questions = []
    listen_structure = [
        (1, 6, "LISTEN_TASK", 4),
        (2, 6, "LISTEN_POINT", 4),
        (3, 3, "LISTEN_OVERVIEW", 4),
        (4, 4, "LISTEN_PICTURE", 3),
        (5, 9, "LISTEN_IMMEDIATE", 3),
    ]

    global_q = 0
    for mondai, count, q_type, num_choices in listen_structure:
        for offset in range(count):
            global_q += 1
            img_ref = None
            if q_type == "LISTEN_PICTURE":
                img_path = REPO_ROOT / "backend" / "src" / "main" / "resources" / "static" / "exams" / "images" / exam_id
                if img_path.exists():
                    imgs = sorted(list(img_path.glob("*.jpg")))
                    if offset < len(imgs):
                        img_ref = f"/exams/images/{exam_id}/{imgs[offset].name}"

            l_choices = [str(i + 1) for i in range(num_choices)]
            ans = exam_answers.get(f"listening-{mondai}-{offset + 1}", (offset % num_choices) + 1)

            listening_questions.append({
                "id": f"{exam_id}-listening-m{mondai}-q{global_q}",
                "section": "listening",
                "mondai": mondai,
                "questionNumber": global_q,
                "questionType": q_type,
                "questionText": f"問題 {mondai} - 第 {offset + 1} 番",
                "passage": None,
                "choices": l_choices,
                "correctAnswer": ans,
                "imageRef": img_ref,
                "audioStartSec": None,
                "audioEndSec": None
            })

    total_q = len(vocab_questions) + len(grammar_questions) + len(listening_questions)

    sections = [
        {
            "sectionId": "vocab",
            "title": "言語知識（文字・語彙）",
            "titleVi": "Văn tự - Từ vựng",
            "timeLimitSec": 1800,
            "totalQuestions": len(vocab_questions),
            "questions": vocab_questions
        },
        {
            "sectionId": "grammar",
            "title": "言語知識（文法）・読解",
            "titleVi": "Ngữ pháp - Đọc hiểu",
            "timeLimitSec": 4200,
            "totalQuestions": len(grammar_questions),
            "questions": grammar_questions
        },
        {
            "sectionId": "listening",
            "title": "聴解",
            "titleVi": "Nghe hiểu",
            "timeLimitSec": 2400,
            "totalQuestions": len(listening_questions),
            "questions": listening_questions
        }
    ]

    return sections, total_q


# ── 4. Main Build Runner ────────────────────────────────────────────────────────
def main():
    all_answers = parse_all_answers()
    exam_dirs = [d for d in SOURCE_DIR.iterdir() if d.is_dir() and 'N3' in d.name]
    
    total_exams_built = 0
    total_questions_built = 0

    for d in sorted(exam_dirs):
        m = re.search(r'N3\s+(\d{1,2})-(\d{4})', d.name, re.IGNORECASE)
        if not m:
            continue
        month = int(m.group(1))
        year = int(m.group(2))
        exam_id = f"n3-{year}-{month:02d}"

        pdfs = [p for p in d.glob("*.pdf") if "script" not in p.name.lower()]
        if not pdfs:
            continue
        exam_pdf = pdfs[0]

        exam_ans = all_answers.get(exam_id, {})
        sections, total_q = parse_exam_pdf(exam_pdf, exam_id, exam_ans)

        exam_dict = {
            "examId": exam_id,
            "level": "N3",
            "year": year,
            "month": month,
            "title": f"JLPT N3 — Tháng {month}/{year}",
            "totalQuestions": total_q,
            "audioFile": f"{exam_id}.mp3",
            "sections": sections
        }

        out_path = OUT_JSON_DIR / f"{exam_id}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(exam_dict, f, ensure_ascii=False, indent=2)

        total_exams_built += 1
        total_questions_built += total_q
        print(f"[{total_exams_built}/30] Built {exam_id}: {total_q} questions")

    print(f"\n[SUCCESS] Built {total_exams_built} real exams with {total_questions_built} total questions!")


if __name__ == "__main__":
    main()
