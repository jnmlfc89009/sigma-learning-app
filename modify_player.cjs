const fs = require('fs');
let code = fs.readFileSync('src/components/LessonPlayer.tsx', 'utf8');

const helper = `
// Generates a structural formula template from a specific math explanation
function createConceptTemplate(explanation: string) {
  if (!explanation) return '';
  return explanation
    .replace(/(The correct answer is|It is|Option [A-D] is).*?(because|\\.|\\n)/i, 'Key principle: ')
    .replace(/\\$\\d+(?:,\\d+)*(?:\\.\\d+)?/g, '[VALUE]') 
    .replace(/\\b\\d+(?:\\.\\d+)?\\b/g, '[X]'); 
}
`;

code = code.replace('export default function LessonPlayer', helper + '\nexport default function LessonPlayer');

const oldBackCardRegex = /<span className="text-\\[10px\\] font-bold text-slate-600 uppercase tracking-widest block mb-2">KEY CONCEPT \\/ FORMULA<\\/span>[\\s\\S]*?<\/div>/;

const newBackCard = `<span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-2">STRUCTURAL FORMULA / RULE</span>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {createConceptTemplate(questions[practiceStep]?.explanation)}
                  </p>
                </div>`;

code = code.replace(oldBackCardRegex, newBackCard);

fs.writeFileSync('src/components/LessonPlayer.tsx', code);
console.log('done transforming practice UI to templates');
