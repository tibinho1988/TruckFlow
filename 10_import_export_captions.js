/* ============================================================
   IMPORT / EXPORT BUTTON CAPTIONS
   A 10 gomb felirata külön-külön módosítható.
   ============================================================ */

(function () {
    "use strict";

    const ImportExportCaptions = {
        1: "#1 Senec-Krakko Imp / Senec Exp <br> *** 1 kamion Imp / 1 kamion Exp",
        2: "#2 Sosi2 Imp / Sosi1 Exp <br> *** 2 kontiner Imp / 2 kontiner Exp",
        3: "#3 GR-BG Imp / Roky2 Exp <br> *** 2 kontiner Imp / 2 kontiner Exp",
        4: "#4 AT-Gyor Imp / AT-Gyor Exp <br> *** 2 kontiner Imp / 2 kontiner Exp",
        5: "#5 Brno-Gliwice Imp / Brno-Gliwice Exp <br> *** 2 ponyvas kontiner Imp / 2 ponyvas kontiner Exp",
        6: "#6 Roky1-Roky1 Imp / Nupaky-Roky1 Exp <br> *** 2 kontiner Imp / 2 kontiner Exp",
        7: "#7 Mönchen-Roky1 Imp / Mönchen-Temesvar2 Exp <br> *** 2 kontiner Imp / 2 kontiner Exp",
        8: "#8 RO3 Temesvar-Bukarest Imp / RO3 Temesvar1-Bukarest1 Exp <br> *** 2 kontiner Imp / 2 kontiner Exp",
        9: "#9 Giroda (Temesvar) Imp / Üres kontiner Exp <br> *** 1 marad és 1 üreset visz",
        10: "#10 Verona-Szloven Imp / Verona-Horvat Exp <br> *** 1 kamion Imp / 1 kamion Exp",
		11: "#11 Cornerado-RO megy a parkolóba Imp / Cornerado-Szloven Exp <br> *** 2 kontiner Imp / 2 kontiner Exp"
    };

    function SetImportExportCaptions() {
        Object.keys(ImportExportCaptions).forEach(function (NumberV) {
            const ButtonV = document.getElementById(
                "cityFixCarSet" + NumberV + "Btn"
            );

            if (ButtonV) {
                /*ButtonV.textContent = ImportExportCaptions[NumberV];*/
				ButtonV.innerHTML = ImportExportCaptions[NumberV];
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            SetImportExportCaptions
        );
    } else {
        SetImportExportCaptions();
    }
})();