import re
import sys
import pypdf
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ANSWER_PDF = Path(r"C:\Users\bbqdd\Documents\_jsn3\doc\De_thi Jlpt n3\ĐÁP ÁN JLPT N3 (update 15.10.2026).pdf")

def parse_all_exam_answers():
    reader = pypdf.PdfReader(str(ANSWER_PDF))
    all_answers = {}

    for page_idx in range(1, len(reader.pages)):
        text = reader.pages[page_idx].extract_text() or ''
        
        # Identify exam key, e.g. "JLPT N3 7/2010" or "N3 12/2023"
        m = re.search(r'(?:JLPT\s+)?N3\s+(\d{1,2})[/\-\.](\d{4})', text)
        if not m:
            continue
        month = int(m.group(1))
        year = int(m.group(2))
        exam_id = f"n3-{year}-{month:02d}"

        # Parse the page
        ans_map = parse_single_answer_page(text)
        all_answers[exam_id] = ans_map

    return all_answers

def parse_single_answer_page(text):
    ans_map = {}
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # 1. Vocab M1: 问题1 / 問題１
    # Look for question numbers then answer numbers
    def match_consecutive(q_start, q_count, text_block):
        # find sequence of q_start .. q_start+q_count-1 followed by q_count answers (1-4)
        q_expected = " ".join(str(i) for i in range(q_start, q_start + q_count))
        # Search in text_block
        pos = text_block.find(q_expected)
        if pos != -1:
            rest = text_block[pos + len(q_expected):].strip()
            ans_nums = re.findall(r'\b([1-4])\b', rest)[:q_count]
            if len(ans_nums) == q_count:
                for idx, a in enumerate(ans_nums):
                    ans_map[f"vocab-{q_start + idx}"] = int(a)
                return True
        return False

    full_text = "\n".join(lines)

    # Vocab M1 (1-8), M2 (9-14), M3 (15-25), M4 (26-30), M5 (31-35)
    match_consecutive(1, 8, full_text)
    match_consecutive(9, 6, full_text)
    match_consecutive(15, 11, full_text)
    match_consecutive(26, 5, full_text)
    match_consecutive(31, 5, full_text)

    # Grammar M1 (1-13), M2 (14-18), M3 (19-23)
    # Search in section after '文法'
    grammar_pos = full_text.find("文法")
    if grammar_pos != -1:
        g_text = full_text[grammar_pos:]
        # Grammar 1-13:
        q_expected = " ".join(str(i) for i in range(1, 14))
        p = g_text.find(q_expected)
        if p != -1:
            rest = g_text[p + len(q_expected):].strip()
            ans_nums = re.findall(r'\b([1-4])\b', rest)[:13]
            for idx, a in enumerate(ans_nums):
                ans_map[f"grammar-{1 + idx}"] = int(a)
        
        # Grammar 14-18:
        p2 = g_text.find("14 15 16 17 18")
        if p2 != -1:
            rest2 = g_text[p2 + len("14 15 16 17 18"):].strip()
            ans_nums2 = re.findall(r'\b([1-4])\b', rest2)[:5]
            for idx, a in enumerate(ans_nums2):
                ans_map[f"grammar-{14 + idx}"] = int(a)

        # Grammar 19-23 or 19-22:
        for span in ["19 20 21 22 23", "19 20 21 22"]:
            p3 = g_text.find(span)
            if p3 != -1:
                cnt = len(span.split())
                rest3 = g_text[p3 + len(span):].strip()
                ans_nums3 = re.findall(r'\b([1-4])\b', rest3)[:cnt]
                for idx, a in enumerate(ans_nums3):
                    ans_map[f"grammar-{19 + idx}"] = int(a)
                break

    # Reading & Listening columns:
    # Pattern of pairs: (Q_num Ans_num)
    pairs = re.findall(r'\b(\d{1,2})\s+([1-4])\b', full_text)
    # For reading questions: typically numbers 23-39
    # If not already mapped:
    for q_str, ans_str in pairs:
        q_num = int(q_str)
        ans_num = int(ans_str)
        if 23 <= q_num <= 40:
            key = f"grammar-{q_num}" # Note: in our schema, reading is under 'grammar' section
            if key not in ans_map:
                ans_map[key] = ans_num

    return ans_map

if __name__ == "__main__":
    res = parse_all_exam_answers()
    print(f"Total exams parsed from answer PDF: {len(res)}")
    for k, v in list(res.items())[:5]:
        print(f"  {k}: {len(v)} answers found. (vocab-1: {v.get('vocab-1')}, grammar-1: {v.get('grammar-1')})")
