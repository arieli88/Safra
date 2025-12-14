(function () {
  const Heb = window.hebcal || window.HebcalCore;
  if (!Heb) {
    console.error("Hebcal bundle loaded, but namespace not found");
    return;
  }

  const el = document.getElementById("date-container");
  if (!el) return;

  const today = new Date();

  const days = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
  const dayName = days[today.getDay()];

  const h = new Heb.HDate(today);
  const sedra = h.getSedra("il");
  const parasha = sedra ? sedra[0] : "אין פרשה";

  el.textContent =
    `${dayName}, ${h.getDate()} ${h.getMonthName()} ${h.getFullYear()} | ` +
    `${today.toLocaleDateString("he-IL")} | פרשת ${parasha}`;
})();
