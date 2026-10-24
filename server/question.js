import { searchInstructions } from "./search.js";
import { retrievedAt } from "./knowledge.js";

const noMatchAnswer =
  "לא מצאתי התאמה במאגר ההדגמה המצומצם. המאגר כולל שש רשומות קטלוג מפרק התקשרויות ורכישות; אפשר לחפש באתר תכ״ם הרשמי.";

function formatEffectiveDate(date) {
  return new Intl.DateTimeFormat("he-IL").format(new Date(`${date}T00:00:00`));
}

function buildGroundedAnswer(matches) {
  const bestMatch = matches[0];
  const topics = bestMatch.keywords.slice(0, 4).join(", ");
  return `מצאתי את הוראה ${bestMatch.id}, "${bestMatch.title}", בנושא ${bestMatch.subchapter}. לפי הקטלוג באתר תכ״ם, היא בתוקף מתאריך ${formatEffectiveDate(bestMatch.effectiveFrom)} ומהדורה ${bestMatch.edition}. נושאים המקושרים אליה בקטלוג כוללים: ${topics}. המאגר מציג פרטי קטלוג ומילות מפתח בלבד, ולא את נוסח ההוראה המלא; יש לעיין במקור הרשמי לפני קבלת החלטה.`;
}

async function generateWithModel(question, matches, enabled) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!enabled || process.env.ENABLE_OPENAI !== "true" || !apiKey) {
    return null;
  }

  const sources = matches.map(
    ({ id, title, subchapter, effectiveFrom, edition, keywords, sourceUrl }) => ({
      id,
      title,
      subchapter,
      effectiveFrom,
      edition,
      keywords,
      sourceUrl,
    }),
  );
  const response = await fetch(
    process.env.OPENAI_API_URL ?? "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "ענה בעברית ורק על סמך נתוני הקטלוג שסופקו. הנתונים אינם כוללים את נוסח ההוראות המלא. אל תציג מילות מפתח כציטוט או ככלל מחייב, ואל תסיק מסקנות משפטיות או תפעוליות. אם השאלה דורשת תוכן מההוראה עצמה, אמור זאת והפנה למקור הרשמי. ציין מספר הוראה רק כאשר הוא מופיע במקור.",
          },
          {
            role: "user",
            content: JSON.stringify({ question, sources }),
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`מודל השפה החזיר שגיאת HTTP ${response.status}.`);
  }

  const body = await response.json();
  const answer = body.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("מודל השפה לא החזיר תשובה תקינה.");
  }

  return answer.trim();
}

export async function answerQuestion(question, { enableModel = true } = {}) {
  const matches = searchInstructions(question);

  if (matches.length === 0) {
    return {
      answer: noMatchAnswer,
      citations: [],
      catalogCheckedAt: retrievedAt,
      mode: "retrieval-demo",
    };
  }

  const generatedAnswer = await generateWithModel(
    question,
    matches,
    enableModel,
  );
  const citations = matches.map(
    ({
      id,
      title,
      chapter,
      subchapter,
      inForce,
      effectiveFrom,
      edition,
      keywords,
      sourceUrl,
    }) => ({
      id,
      title,
      chapter,
      subchapter,
      inForce,
      effectiveFrom,
      edition,
      keywords,
      sourceUrl,
      catalogCheckedAt: retrievedAt,
    }),
  );

  return {
    answer: generatedAnswer ?? buildGroundedAnswer(matches),
    citations,
    catalogCheckedAt: retrievedAt,
    mode: generatedAnswer ? "retrieval-llm" : "retrieval-demo",
  };
}
