/* ============================================================
   INDULÁS
   ============================================================ */

window.onload = function() {
    SetupModalRampRouteType();
    SetupModals();
	SetupCityFixCarSetButton();
	SetupCityFixCarSetAllButton();
	SetupCityFixCarSetAllWrite();

    /* STARTUP – helyi megjelenítési ürítés, Firebase törlése nélkül. */
    document.getElementById("startupBtn").onclick = function() {
        if (!confirm("Biztosan kiüríted az összes rámpa megjelenített adatait? A Firebase-ben tárolt adatok nem törlődnek.")) {
            return;
        }

        startupDisplayOnly = true;
        showAssignmentsOnRamps = false;

        RenderRamps();
    };

    /* Először a tartós ID-regisztert olvassuk be. */
    db.ref("settings/rampIds").once("value").then(function(idSnapshot) {
        cachedRampIds = idSnapshot.val() || {};

        return db.ref("locations").once("value");
    }).then(function(snapshot) {
        var locations = snapshot.val();

        if (!locations || Object.keys(locations).length === 0) {
            locations = CreateStartupLocations();
        }

        var locationMigration = MigrateLocationNames(locations);
        locations = locationMigration.locations;

        cachedLocations = EnsureRampIds(locations);

        /*
         * A hiányzó X/D rámpákat is felvesszük a megjelenítési listába.
         * Ez biztosítja, hogy a teljes X-01–X-40 és D-01–D-40 lista
         * kirajzolható legyen akkor is, ha egy rekord hiányzik.
         */
        EnsureDisplayRampList();

        SaveRampIds();
        return db.ref("locations").set(cachedLocations);
    }).then(function() {
        showAssignmentsOnRamps = false;
        startupDisplayOnly = false;

        return db.ref("settings/showAssignmentsOnRamps").set(false);
    }).then(function() {
        CreateRampOptions();
        RenderRamps();
    }).catch(function(error) {
        console.error("Indítási hiba:", error);
        alert("A TruckFlow indulásakor hiba történt. Ellenőrizd a Firebase-kapcsolatot.");
    });


    /* ========================================================
       ASSIGNMENTS REALTIME
       ======================================================== */

    db.ref("assignments").on("value", function(snapshot) {
        var migration = MigrateRampReferences(snapshot.val() || []);
        cachedAssignments = migration.items;

        if (migration.changed) {
            db.ref("assignments").set(cachedAssignments);
        }

        RenderRamps();
    });


    /* ========================================================
       HISTORY REALTIME
       ======================================================== */

    db.ref("history").on("value", function(snapshot) {
        var migration = MigrateRampReferences(snapshot.val() || []);
        cachedHistory = migration.items;

        if (migration.changed) {
            db.ref("history").set(cachedHistory);
        }

        var historyModal = document.getElementById("historyModal");

        if (historyModal && historyModal.style.display === "flex") {
            RenderHistoryTable();
        }
    });


    /* ========================================================
       LOG REALTIME
       ======================================================== */

    db.ref("logs").on("value", function(snapshot) {
        cachedLogs = snapshot.val() || [];
    });


    /* ========================================================
       SHARED RAMP DISPLAY MODE
       ======================================================== */

    db.ref("settings/rampIds").on("value", function(snapshot) {
        cachedRampIds = snapshot.val() || {};
        CreateRampOptions();
        RenderRamps();
    });

    db.ref("settings/showAssignmentsOnRamps").on("value", function(snapshot) {
        var value = snapshot.val();

        /*
         * A StartUp helyi megjelenítési állapotát a Firebase listener
         * nem kapcsolja vissza automatikusan.
         */
        if (!startupDisplayOnly) {
            showAssignmentsOnRamps = (value === null) ? false : value !== false;
        }

        RenderRamps();
    });


    /* ========================================================
       LOCATIONS REALTIME
       ======================================================== */

    db.ref("locations").on("value", function(snapshot) {
        var rawLocations = snapshot.val() || {};
        var migration = MigrateLocationNames(rawLocations);

        cachedLocations = EnsureRampIds(migration.locations);

        /*
         * Hiányzó X/D rekord esetén a teljes rámpalista megmarad.
         * A listener nem menti automatikusan a megjelenítéshez
         * helyben létrehozott rekordokat a Firebase-be.
         */
        EnsureDisplayRampList();

        if (migration.changed) {
            db.ref("locations").set(cachedLocations);
        }

        CreateRampOptions();
        RenderRamps();
    });


    /* ========================================================
       FRISSÍTÉS – ADATOK ÚJRAOLVASÁSA FIREBASE-BŐL
       ======================================================== */

    document.getElementById("refreshDataBtn").onclick = async function() {
        var refreshBtn = this;

        if (refreshBtn.disabled) return;

        refreshBtn.disabled = true;

        try {
            var results = await Promise.all([
                db.ref("settings/rampIds").once("value"),
                db.ref("locations").once("value"),
                db.ref("assignments").once("value")
            ]);

            cachedRampIds = results[0].val() || {};

            var locations = results[1].val() || {};
            var locationMigration = MigrateLocationNames(locations);

            cachedLocations = EnsureRampIds(locationMigration.locations);
            EnsureDisplayRampList();

            var assignments = results[2].val() || [];
            var assignmentMigration = MigrateRampReferences(assignments);

            cachedAssignments = assignmentMigration.items;

            startupDisplayOnly = false;
            showAssignmentsOnRamps = true;

            CreateRampOptions();
            RenderRamps();

        } catch (error) {
            console.error("Frissítési hiba:", error);
            alert("Nem sikerült betölteni az adatokat a Firebase-ből.");
        } finally {
            refreshBtn.disabled = false;
        }
    };
};
