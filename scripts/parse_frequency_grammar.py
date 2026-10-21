import re
import json
import os

source_path = r"c:\Users\bbqdd\Documents\_jsn3\doc\De_thi Jlpt n3\JLPT_N3_Grammar_Frequency_Analysis.md"
target_json = r"c:\Users\bbqdd\Documents\_my\japaneseproject\backend\src\main\resources\data\jlpt_n3_high_frequency_grammar.json"

with open(source_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Parse table in Section 2 (Rank 1 to 79)
# Format: | 1 | **〜受身 (bị động: 〜れる/られる)** | `[N4]` | **417** | 30/30 | 13.9 | 107 | 247 | 29 | 34 | ★★★★★ Critical |
table_pattern = re.compile(
    r"\|\s*(\d+)\s*\|\s*\*\*(.*?)\*\*\s*\|\s*`\[(.*?)\]`\s*\|\s*\*\*(\d+)\*\*\s*\|\s*(\d+/\d+)\s*\|\s*([\d\.]+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(.*?)\s*\|"
)

items = []
for match in table_pattern.finditer(content):
    rank = int(match.group(1))
    grammar = match.group(2).strip()
    level = match.group(3).strip()
    total_occ = int(match.group(4))
    exam_cov = match.group(5).strip()
    avg_per = float(match.group(6))
    bunpou = int(match.group(7))
    dokkai = int(match.group(8))
    choukai = int(match.group(9))
    goi = int(match.group(10))
    priority_raw = match.group(11).strip()
    
    # Extract stars and priority name
    # e.g. "★★★★★ Critical" -> stars="★★★★★", priority="Critical"
    stars_m = re.search(r"([★☆]+)", priority_raw)
    stars = stars_m.group(1) if stars_m else ""
    p_name = re.sub(r"[★☆\s]+", "", priority_raw).strip()
    
    item = {
        "id": rank,
        "rankNumber": rank,
        "grammar": grammar,
        "level": level,
        "totalOccurrences": total_occ,
        "examCoverage": exam_cov,
        "avgPerExam": avg_per,
        "bunpouCount": bunpou,
        "dokkaiCount": dokkai,
        "choukaiCount": choukai,
        "goiCount": goi,
        "priority": p_name,
        "priorityStars": stars,
        "formation": "",
        "meaning": "",
        "examExamples": [],
        "studyTip": "",
        "recentTrend": ""
    }
    items.append(item)

print(f"Extracted {len(items)} items from Section 2 table.")

# 2. Parse Detailed TOP 50 sections
# e.g.
# ### 1. 〜受身 (bị động: 〜れる/られる) `[N4]` — ★★★★★ Critical
# ...
# - **Cấu trúc**: `Động từ bị động: 〜れる / られる`
# - **Ý nghĩa**: thể bị động (bị, được ai tác động vào)
# - **Ví dụ thực tế từ đề thi**:
#   - *[7/2010 / 文字・語彙 / Q34]*: 「３ いつ来られるか、未来の都合を教えてください。」
top50_blocks = re.findall(r"^###\s+(\d+)\.\s+(.*?)(?=\n###|\n##|\Z)", content, re.MULTILINE | re.DOTALL)
print(f"Found {len(top50_blocks)} detailed ### blocks.")

for rank_str, block in top50_blocks:
    rank = int(rank_str)
    item = next((it for it in items if it["rankNumber"] == rank), None)
    if not item:
        continue
    
    # Cấu trúc
    formation_m = re.search(r"\-\s*\*\*Cấu trúc\*\*:\s*`?(.*?)`?\s*$", block, re.MULTILINE)
    if formation_m:
        item["formation"] = formation_m.group(1).strip().strip("`")
    
    # Ý nghĩa
    meaning_m = re.search(r"\-\s*\*\*Ý nghĩa\*\*:\s*(.*?)\s*$", block, re.MULTILINE)
    if meaning_m:
        item["meaning"] = meaning_m.group(1).strip()
        
    # Ví dụ thực tế
    examples = []
    # format:   - *[7/2010 / 文字・語彙 / Q34]*: 「３ いつ来られるか、未来の都合を教えてください。」
    ex_matches = re.findall(r"\-\s*\*\[(.*?)\]\*:\s*「?(.*?)」?\s*$", block, re.MULTILINE)
    for tag, sentence in ex_matches:
        # tag e.g. "7/2010 / 文字・語彙 / Q34"
        tag_parts = [p.strip() for p in re.split(r"\s+/\s+", tag)]
        session = tag_parts[0] if len(tag_parts) > 0 else ""
        section = tag_parts[1] if len(tag_parts) > 1 else ""
        q_id = tag_parts[2] if len(tag_parts) > 2 else ""
        examples.append({
            "session": session,
            "section": section,
            "questionId": q_id,
            "japanese": sentence.strip("「」"),
            "translation": ""
        })
    item["examExamples"] = examples

# 3. For patterns 51..79, check if Section 4 (N3) or Section 5 (N4) has meanings
# Section 4 table: | Hạng | Mẫu ngữ pháp N3 | Tổng lần | Số kỳ thi | Phân vùng chủ đạo | Ý nghĩa cốt lõi | Mức ưu tiên |
s4_rows = re.findall(r"\|\s*(\d+)\s*\|\s*\*\*(.*?)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*(\d+/\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|", content)
for r in s4_rows:
    p_name = r[1].strip()
    meaning = r[5].strip()
    # match with items
    for it in items:
        if (p_name in it["grammar"] or it["grammar"] in p_name) and not it["meaning"]:
            it["meaning"] = meaning

# Section 5 table: | Hạng | Mẫu ngữ pháp N4 | Tổng lần | Số kỳ thi | Xuất hiện ở đâu nhiều nhất | Ý nghĩa tóm tắt |
s5_rows = re.findall(r"\|\s*(\d+)\s*\|\s*\*\*(.*?)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*(\d+/\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|", content)
for r in s5_rows:
    p_name = r[1].strip()
    meaning = r[5].strip()
    for it in items:
        if (p_name in it["grammar"] or it["grammar"] in p_name) and not it["meaning"]:
            it["meaning"] = meaning

# 4. Fill defaults and study tips for any items missing formation or meaning
for it in items:
    if not it["formation"]:
        it["formation"] = it["grammar"]
    if not it["meaning"]:
        it["meaning"] = f"Mẫu ngữ pháp {it['grammar']} (Cấp độ {it['level']})"
    if it["totalOccurrences"] >= 50:
        it["studyTip"] = f"Mẫu ngữ pháp siêu trọng tâm xuất hiện {it['totalOccurrences']} lần trong {it['examCoverage']} đề thi. Cần đặc biệt chú ý phần {('Đọc hiểu (Dokkai)' if it['dokkaiCount'] > it['bunpouCount'] else 'Ngữ pháp (Bunpou)')}."
    elif it["totalOccurrences"] >= 20:
        it["studyTip"] = f"Mẫu ngữ pháp có tần suất ra đề rất cao ({it['totalOccurrences']} lần). Thường xuất hiện trong phần {('Đọc hiểu' if it['dokkaiCount'] >= it['bunpouCount'] else 'Ngữ pháp')}."
    else:
        it["studyTip"] = f"Mẫu ngữ pháp xuất hiện {it['totalOccurrences']} lần trong kỳ thi JLPT N3."

os.makedirs(os.path.dirname(target_json), exist_ok=True)
with open(target_json, "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print(f"Successfully generated {target_json} with {len(items)} grammar patterns!")
