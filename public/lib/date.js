(function init() {
  function run() {
    if (typeof Hebcal === "undefined") return false;

    const el = document.getElementById("date-container");
    if (!el) return false;

    const today = new Date();

    const days = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
    const dayName = days[today.getDay()];

    const h = new Hebcal.HDate(today);
    const sedra = h.getSedra("il");
    const parasha = sedra ? sedra[0] : "אין פרשה";

    el.textContent =
      `${dayName}, ${h.getDate()} ${h.getMonthName()} ${h.getFullYear()} | ` +
      `${today.toLocaleDateString("he-IL")} | פרשת ${parasha}`;

    return true;
  }

  if (!run()) {
    document.addEventListener("DOMContentLoaded", run);
  }
})();
