const fs = require('fs');
const path = require('path');

const dir = 'd:/GIT_LAB/japaneseproject/backend/src/main/resources/db/migration';
const v22 = fs.readFileSync(path.join(dir, 'V22__add_mimikara_n3_vocab.sql'), 'utf8');

const v23 = `DELETE FROM vocabulary WHERE level = 'MIMIKARA_N3';\n` + v22;

fs.writeFileSync(path.join(dir, 'V23__fix_mimikara_vocab.sql'), v23, 'utf8');
console.log('Created V23');

const javaFile = 'd:/GIT_LAB/japaneseproject/backend/src/main/java/com/flashcard/vocabulary/FlywayRepairConfig.java';
if (fs.existsSync(javaFile)) {
    fs.unlinkSync(javaFile);
    console.log('Deleted FlywayRepairConfig.java');
}
