import re
import sys
import pypdf
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

def parse_exam_questions(pdf_path):
    reader = pypdf.PdfReader(str(pdf_path))
    pages_text = [reader.pages[i].extract_text() or '' for i in range(len(reader.pages))]
    full_text = "\n".join(pages_text)

    # Let's split into major sections
    # Find boundary keywords
    # Section 1: 文字・語彙
    # Section 2: 文法 or 言語知識（文法）・読解
    # Section 3: 聴解
    
    # Let's search for indices
    pos_vocab = re.search(r'(?:言語知識（)?文字・語彙(?:\）)?', full_text)
    pos_grammar = re.search(r'(?:言語知識（)?文法(?:\）)?|文\s*法\s*・\s*読\s*解', full_text)
    pos_listening = re.search(r'聴\s*解', full_text)

    print(f"Vocab pos: {pos_vocab.start() if pos_vocab else None}")
    print(f"Grammar pos: {pos_grammar.start() if pos_grammar else None}")
    print(f"Listening pos: {pos_listening.start() if pos_listening else None}")

    vocab_text = ""
    grammar_text = ""
    listening_text = ""

    if pos_vocab and pos_grammar:
        vocab_text = full_text[pos_vocab.start():pos_grammar.start()]
        if pos_listening:
            grammar_text = full_text[pos_grammar.start():pos_listening.start()]
            listening_text = full_text[pos_listening.start():]
        else:
            grammar_text = full_text[pos_grammar.start():]
    
    # Parse questions from a section text
    def parse_numbered_questions(sec_text, q_min, q_max):
        # We look for lines starting with question number e.g. " 1   ", "10  ", "35 "
        # Or pattern: ^\s*(\d{1,2})\s+(.*)$
        questions = {}
        lines = sec_text.splitlines()
        current_q = None
        current_lines = []

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
            # Check if this line starts a new question number in [q_min, q_max]
            # Match optional whitespace, digits, then at least 2 spaces or tabs or Japanese text
            m = re.match(r'^([1-9]|[1-3][0-9])\s+(.+)$', line_str)
            if m:
                q_num = int(m.group(1))
                if q_min <= q_num <= q_max:
                    # Save previous question
                    if current_q is not None:
                        questions[current_q] = "\n".join(current_lines)
                    current_q = q_num
                    current_lines = [m.group(2)]
                    continue
            if current_q is not None:
                current_lines.append(line_str)

        if current_q is not None:
            questions[current_q] = "\n".join(current_lines)

        return questions

    vocab_qs = parse_numbered_questions(vocab_text, 1, 35)
    print(f"Vocab questions parsed: {len(vocab_qs)} / 35")
    
    # Let's inspect Q1 and Q35 of vocab
    for q_num in [1, 15, 31, 35]:
        if q_num in vocab_qs:
            print(f"--- Q{q_num} raw block ---")
            print(vocab_qs[q_num])
            choices = extract_choices(vocab_qs[q_num])
            print(f"Extracted choices: {choices}")

def extract_choices(block_text):
    # Pattern for 1, 2, 3, 4 choices
    pattern_4 = re.compile(
        r'(?:^[ \t]*|[ \t]+)[1１][\.、\s]+(.*?)[ \t\n]+[2２][\.、\s]+(.*?)[ \t\n]+[3３][\.、\s]+(.*?)[ \t\n]+[4４][\.、\s]+(.*)',
        re.DOTALL
    )
    m = pattern_4.search(block_text)
    if m:
        return [m.group(i).strip().replace('\n', ' ') for i in range(1, 5)]
    
    # Try line-by-line
    lines = [l.strip() for l in block_text.splitlines() if l.strip()]
    c_map = {}
    for l in lines:
        m2 = re.match(r'^[1-4１-４][\.、\s]+(.*)$', l)
        if m2:
            num = int(l[0].replace('１','1').replace('２','2').replace('３','3').replace('４','4'))
            c_map[num] = m2.group(1).strip()
    if len(c_map) == 4:
        return [c_map[1], c_map[2], c_map[3], c_map[4]]
    return None

if __name__ == "__main__":
    pdf_path = Path(r"C:\Users\bbqdd\Documents\_jsn3\doc\De_thi Jlpt n3\14. N3 7-2023\14. N3 tháng 7-2023.pdf")
    parse_exam_questions(pdf_path)
