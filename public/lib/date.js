(function () {
  if (typeof Hebcal === "undefined") {
    console.error("Hebcal not loaded");
    return;
  }

  const el = document.getElementById("date-container");
  if (!el) return;

  const today = new Date();

  // יום בשבוע
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const dayName = days[today.getDay()];

  // לועזי
  const g = today.toLocaleDateString("he-IL");

  // עברי
  const h = new Hebcal.HDate(today);
  const hDate = `${h.getDate()} ${h.getMonthName()} ${h.getFullYear()}`;

  // פרשת השבוע (רק חישוב לוקאלי)
  const sedra = h.getSedra("il");
  const parasha = sedra ? sedra[0] : "אין פרשה";

  el.textContent = `${dayName}, ${hDate} | ${g} | פרשת ${parasha}`;
})();
