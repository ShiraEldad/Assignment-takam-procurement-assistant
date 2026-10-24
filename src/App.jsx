import React, { useState } from "react";

const suggestions = [
  "מה ידוע על הוראה 7.6.1 בנושא פטור ממכרז?",
  "אילו מילות מפתח מקושרות להליך מקוצר?",
  "איפה נמצא מידע על ועדת מכרזים?",
];

function formatDate(date) {
  return new Intl.DateTimeFormat("he-IL").format(new Date(`${date}T00:00:00`));
}

function Citation({ source }) {
  return (
    <article className="citation">
      <div className="citation-heading">
        <span className="document-icon" aria-hidden="true">
          §
        </span>
        <div>
          <p className="citation-kicker">הוראה {source.id}</p>
          <h3>{source.title}</h3>
        </div>
      </div>
      <dl className="source-details">
        <div>
          <dt>נושא</dt>
          <dd>{source.subchapter}</dd>
        </div>
        <div>
          <dt>סטטוס</dt>
          <dd>{source.inForce ? "בתוקף" : "לא בתוקף"}</dd>
        </div>
        <div>
          <dt>תחולה מתאריך</dt>
          <dd>{formatDate(source.effectiveFrom)}</dd>
        </div>
        <div>
          <dt>מהדורה</dt>
          <dd>{source.edition}</dd>
        </div>
      </dl>
      <p className="keyword-label">מילות מפתח בקטלוג — אינן ציטוט מההוראה</p>
      <ul className="keyword-list">
        {source.keywords.slice(0, 6).map((keyword) => (
          <li key={keyword}>{keyword}</li>
        ))}
      </ul>
      <p className="catalog-date">
        הקטלוג נבדק: {formatDate(source.catalogCheckedAt)}
      </p>
      <a href={source.sourceUrl} target="_blank" rel="noreferrer">
        צפייה במקור הרשמי
        <span aria-hidden="true"> ←</span>
      </a>
    </article>
  );
}

function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function askQuestion(value = question) {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion || isLoading) return;

    setQuestion(trimmedQuestion);
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "לא ניתן לעבד את השאלה כרגע.");
      }
      setResult(body);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "אירעה שגיאה לא צפויה. נסו שוב.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    askQuestion();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="תכ״ם ברור - עמוד הבית">
          <span className="brand-mark" aria-hidden="true">
            ת
          </span>
          <span>
            <strong>תכ״ם ברור</strong>
            <small>עוזר להוראות תכ״ם</small>
          </span>
        </a>
        <a
          className="official-link"
          href="https://takam.mof.gov.il/"
          target="_blank"
          rel="noreferrer"
        >
          אתר תכ״ם הרשמי <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">אב־טיפוס לפרק התקשרויות ורכישות</p>
          <h1 id="page-title">מוצאים את ההוראה הרלוונטית לרכש.</h1>
          <p className="intro">
            חפשו לפי נושא, מונח או מספר הוראה. העוזר מאתר רשומות מתוך מדגם
            רשמי ומקשר למקור המלא באתר תכ״ם.
          </p>

          <form className="search-form" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="question">
              מה תרצו לדעת?
            </label>
            <textarea
              id="question"
              rows="2"
              maxLength="500"
              placeholder="לדוגמה: מה ידוע על פטור מחובת המכרז?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <div className="form-footer">
              <span>עד 500 תווים</span>
              <button type="submit" disabled={!question.trim() || isLoading}>
                {isLoading ? "מחפשים..." : "חיפוש תשובה"}
                {!isLoading && <span aria-hidden="true"> ←</span>}
              </button>
            </div>
          </form>

          <div className="suggestions" aria-label="שאלות לדוגמה">
            <span>אפשר להתחיל מ:</span>
            {suggestions.map((suggestion) => (
              <button
                className="suggestion"
                key={suggestion}
                onClick={() => askQuestion(suggestion)}
                disabled={isLoading}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <section className="response error" role="alert">
            <strong>לא הצלחנו להשלים את החיפוש</strong>
            <p>{error}</p>
          </section>
        )}

        {result && (
          <section className="response" aria-live="polite">
            <div className="response-heading">
              <div>
                <p className="eyebrow">תשובה מבוססת מקורות</p>
                <h2>תוצאות החיפוש</h2>
              </div>
              <span className="mode-badge">
                {result.mode === "retrieval-llm"
                  ? "חיפוש + מודל שפה"
                  : "חיפוש במאגר ההדגמה"}
              </span>
            </div>
            <p className="answer">{result.answer}</p>
            {result.citations.length > 0 ? (
              <div className="citations">
                <h3>מקורות</h3>
                {result.citations.map((source) => (
                  <Citation key={source.id} source={source} />
                ))}
              </div>
            ) : (
              <p className="no-source">
                אין מקור זמין במאגר המצומצם. בדקו את ההוראה באתר הרשמי לפני
                קבלת החלטה.
              </p>
            )}
          </section>
        )}

        <section className="demo-note">
          <span className="info-icon" aria-hidden="true">
            i
          </span>
          <p>
            <strong>חשוב לדעת:</strong> זהו POC המבוסס על שש רשומות קטלוג מפרק
            התקשרויות ורכישות. המאגר כולל פרטים ומילות מפתח בלבד, ולא את נוסח
            ההוראות המלא. המערכת אינה תחליף לעיון בנוסח הרשמי באתר תכ״ם.
          </p>
        </section>
      </main>

      <footer className="footer">
        <span>תכ״ם ברור · אב־טיפוס</span>
        <span>מדגם: 6 רשומות מפרק התקשרויות ורכישות · נבדק ב־25.10.2026</span>
      </footer>
    </div>
  );
}

export default App;
