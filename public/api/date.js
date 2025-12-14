// /api/date.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // שולף מה-Hebcal
    const response = await fetch(`https://www.hebcal.com/converter?cfg=json&date=${today}&g2h=1&strict=1`);
    const data = await response.json();

    // חישוב יום בשבוע בעברית
    const hebrewDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    const dayHebrew = "יום " + hebrewDays[new Date(today).getDay()];

    // תאריך עברי
    const hebDate = data.hebrew || "תאריך ?";

    // תאריך לועזי
    const gregDate = today.split('-').reverse().join('/'); // DD/MM/YYYY

    // פרשת שבוע
    let parsha = "אין פרשה";
    if (Array.isArray(data.events)) {
      const parshaEvent = data.events.find(ev => ev.startsWith("Parashat"));
      if (parshaEvent) {
        const parshaMap = {
          "Bereshit": "בראשית", "Noach": "נח", "Lech-Lecha": "לך לך", "Vayeira": "וירא",
          "Chayei Sara": "חיי שרה", "Toldot": "תולדות", "Vayetzei": "ויצא", "Vayishlach": "וישלח",
          "Vayeshev": "וישב", "Miketz": "מקץ", "Vayigash": "ויגש", "Vayechi": "ויחי",
          "Shemot": "שמות", "Vaera": "וארא", "Bo": "בא", "Beshalach": "בשלח",
          "Yitro": "יתרו", "Mishpatim": "משפטים", "Terumah": "תרומה", "Tetzaveh": "תצוה",
          "Ki Tisa": "כי תשא", "Vayakhel": "ויקהל", "Pekudei": "פקודי", "Vayikra": "ויקרא",
          "Tzav": "צו", "Shmini": "שמיני", "Tazria": "תזריע", "Metzora": "מצורע",
          "Achrei Mot": "אחרי מות", "Kedoshim": "קדושים", "Emor": "אמור", "Behar": "בהר",
          "Bechukotai": "בחקתי", "Bamidbar": "במדבר", "Nasso": "נשא", "Behaalotecha": "בהעלותך",
          "Shlach": "שלח", "Korach": "קרח", "Chukat": "חוקת", "Balak": "בלק",
          "Pinchas": "פינחס", "Matot": "מטות", "Masei": "מסעי", "Devarim": "דברים",
          "Vaetchanan": "ואתחנן", "Eikev": "עקב", "Reeh": "ראה", "Shoftim": "שופטים",
          "Ki Teitzei": "כי תצא", "Ki Tavo": "כי תבו", "Nitzavim": "נצבים", "Vayeilech": "ויאלך",
          "Haazinu": "האזינו", "Vezot Haberakhah": "וזאת הברכה"
        };
        const hebParshaName = parshaMap[parshaEvent.replace("Parashat ", "")];
        if (hebParshaName) parsha = hebParshaName;
      }
    }

    // מחזיר JSON
    res.status(200).json({ dayHebrew, hebDate, gregDate, parsha });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot load date" });
  }
}
