/* ============================================================
   MODALS ÉS GOMBOK
   ============================================================ */

function SetupModals() {
    var settingsModal = document.getElementById("settingsModal");

    document.getElementById("cityFixCarSetBtn").onclick = function() {
        /*if (!CheckPassword()) return; */
        OpenCityFixCarSetModal();
    };

    document.getElementById("openSettingsBtn").onclick = function() {
        if (!CheckPassword()) return;

        var locations = GetLocations();
        var assignments = GetAssignments();

        var text = "Id;Rámpa;Tárhely;Kamion / útvonal;RouteType;Rendszám;Időkapu;Művelet;Idő;Comment;Active/Inactive\n";

        Object.keys(locations).forEach(function(rampName) {
            var item = locations[rampName] || {};

            if (typeof item !== "object") {
                item = {
                    location: String(item),
                    routeType: "",
                    comment: "",
                    active: "On"
                };
            }

            var rampId = item.id || GetRampId(rampName);

            var assignment = assignments.find(function(a) {
                return IsSameRampReference(a, rampName);
            });

            var activeValue =
                String(item.active || "On").trim().toUpperCase() === "OFF"
                    ? "Off"
                    : "On";

            text += [
                rampId,
                item.rampLabel || rampName,
                item.location || "",
                assignment ? (assignment.truck || "") : "",
                assignment ? (assignment.routeType || item.routeType || "") : (item.routeType || ""),
                assignment ? (assignment.plate || "") : "",
                assignment ? (assignment.slot || "") : "",
                assignment ? (assignment.operation || "") : "",
                assignment ? (assignment.time || "") : "",
                assignment ? (assignment.comment || item.comment || "") : (item.comment || ""),
                activeValue
            ].join(";") + "\n";
        });

        document.getElementById("locationsTextarea").value = text;
        settingsModal.style.display = "flex";
    };

    document.getElementById("closeSettingsBtn").onclick = function() {
        settingsModal.style.display = "none";
    };


    /* ========================================================
       LOCATION SETTINGS MENTÉS
       ======================================================== */

    document.getElementById("saveLocationsBtn").onclick = function() {
        var text = document.getElementById("locationsTextarea").value;
        var lines = text.split(/\r?\n/);

        var newLocs = Object.assign({}, GetLocations());
        var seenIds = {};
        var importedRows = [];
        var firstDataLine = true;
        var errorMessage = "";

        function NormalizeImportId(value) {
            return String(value || "").trim().toLowerCase();
        }

        function FindRampById(id) {
            var wantedId = NormalizeImportId(id);
            if (!wantedId) return "";

            var rampNames = Object.keys(newLocs);

            for (var r = 0; r < rampNames.length; r++) {
                var name = rampNames[r];
                var item = newLocs[name];

                var existingId =
                    item && typeof item === "object" && item.id
                        ? item.id
                        : GetRampId(name);

                if (NormalizeImportId(existingId) === wantedId) {
                    return name;
                }
            }

            return "";
        }

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();

            if (!line) continue;

            if (firstDataLine) {
                firstDataLine = false;
                continue;
            }

            var parts = line.split(";").map(function(part) {
                return part.trim();
            });

            if (parts.length < 11) {
                errorMessage = "A(z) " + (i + 1) + ". sorban nincs meg mind a 11 oszlop.";
                break;
            }

            var rampId = parts[0];
            var rampLabel = parts[1];
            var activeValue = parts[10].toUpperCase();

            if (!rampId) {
                errorMessage = "Hiányzó Id a(z) " + (i + 1) + ". sorban.";
                break;
            }

            var normalizedId = NormalizeImportId(rampId);

            if (seenIds[normalizedId]) {
                errorMessage = "Duplikált Id a listában: " + rampId;
                break;
            }

            if (activeValue !== "ON" && activeValue !== "OFF") {
                errorMessage = "A(z) " + (i + 1) + ". sor Active/Inactive értéke csak On vagy Off lehet.";
                break;
            }

            seenIds[normalizedId] = true;

            var realRamp = FindRampById(rampId);

            if (!realRamp) {
                console.warn("Nem létező rámpa-ID, kihagyva:", rampId);
                continue;
            }

            if (activeValue === "OFF") {
                continue;
            }

            var existingItem = newLocs[realRamp];

            if (!existingItem || typeof existingItem !== "object") {
                existingItem = {};
            }

            newLocs[realRamp] = Object.assign({}, existingItem, {
                id: existingItem.id || GetRampId(realRamp),
                rampLabel: rampLabel,
                location: parts[2],
                routeType: parts[4],
                comment: parts[9],
                active: "On"
            });

            importedRows.push({
                ramp: realRamp,
                rampId: existingItem.id || GetRampId(realRamp),
                truck: parts[3],
                routeType: parts[4],
                plate: parts[5],
                slot: parts[6],
                operation: parts[7],
                time: parts[8],
                comment: parts[9]
            });
        }

        if (firstDataLine) {
            alert("A lista üres. Illeszd be a fejlécet és a rámpaadatokat.");
            return;
        }

        if (errorMessage) {
            alert(errorMessage + "\n\nA mentés nem történt meg.");
            return;
        }

        if (importedRows.length === 0) {
            alert("Nem található betölthető, létező ID-jú, On állapotú rámpa. A mentés nem történt meg.");
            return;
        }

        var importedRampNames = {};

        importedRows.forEach(function(row) {
            importedRampNames[NormalizeRampKey(row.ramp)] = true;
        });

        var existingAssignments = GetAssignments();

        var newAssignments = existingAssignments.filter(function(a) {
            return !importedRampNames[NormalizeRampKey(a.ramp || a.rampName || "")];
        });

        importedRows.forEach(function(row) {
            if (!row.truck) return;

            newAssignments.push({
                ramp: row.ramp,
                rampId: row.rampId,
                truck: row.truck,
                routeType: row.routeType,
                plate: row.plate,
                slot: row.slot,
                operation: row.operation,
                time: row.time,
                comment: row.comment
            });
        });

        SaveLocationsMap(newLocs);
        SaveAssignments(newAssignments);

        showAssignmentsOnRamps = true;
        startupDisplayOnly = false;
        db.ref("settings/showAssignmentsOnRamps").set(true);

        CreateRampOptions();
        RenderRamps();

        settingsModal.style.display = "none";
        WriteLog("SaveRampLocations(" + importedRows.length + ")");
    };


    /* ========================================================
       HISTORY / TRUCKLIST
       ======================================================== */

    var historyModal = document.getElementById("historyModal");

    document.getElementById("openHistoryBtn").onclick = function() {
        RenderHistoryTable();
        historyModal.style.display = "flex";
    };

    document.getElementById("closeHistoryBtn").onclick = function() {
        historyModal.style.display = "none";
    };

    document.getElementById("clearHistoryBtn").onclick = function() {
        if (!CheckPassword()) return;

        if (confirm("Biztosan üríted az előzményeket?")) {
            SaveHistory([]);
            document.getElementById("historyTableBody").innerHTML = "";
        }
    };

    document.getElementById("downloadHistoryBtn").onclick = function() {
        var historyItems = GetHistory();
        var lines = [
            "Rámpa | Tárhely | Kamion / útvonal | RouteType | Rendszám | Időkapu | Művelet | Comment | Érkezési idő | Távozás ideje | Esemény"
        ];

        historyItems.forEach(function(item) {
            var info = GetLocationInfo(item.ramp);
            var routeType = item.routeType || info.routeType || "-";

            lines.push([
                item.ramp || "-",
                info.location || "-",
                item.truck || "-",
                routeType,
                item.plate || "-",
                item.slot || "-",
                item.operation || "-",
                item.comment || "-",
                item.time || "-",
                item.leftTime || "-",
                item.eventType || "-"
            ].join(" | "));
        });

        var now = new Date();

        function pad2(value) {
            return String(value).padStart(2, "0");
        }

        var dateTime =
            now.getFullYear() + "-" +
            pad2(now.getMonth() + 1) + "-" +
            pad2(now.getDate()) + "_" +
            pad2(now.getHours()) + "-" +
            pad2(now.getMinutes()) + "-" +
            pad2(now.getSeconds());

        var blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
            type: "text/plain;charset=utf-8"
        });

        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");

        a.href = url;
        a.download = "TruckFlow_History_" + dateTime + ".txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };


    /* ========================================================
       LOG
       ======================================================== */

    var logModal = document.getElementById("logModal");

    document.getElementById("openLogBtn").onclick = function() {
        if (!CheckPassword()) return;

        var logTableBody = document.getElementById("logTableBody");
        logTableBody.innerHTML = "";

        cachedLogs.forEach(function(log) {
            var tr = document.createElement("tr");

            tr.innerHTML =
                "<td>" + log.rowId + "</td>" +
                "<td>" + log.userName + "</td>" +
                "<td>" + log.dateTime + "</td>" +
                "<td>" + log.event + "</td>";

            logTableBody.appendChild(tr);
        });

        logModal.style.display = "flex";
    };

    document.getElementById("closeLogBtn").onclick = function() {
        logModal.style.display = "none";
    };

    document.getElementById("clearLogBtn").onclick = function() {
        if (!CheckPassword()) return;

        if (confirm("Biztosan törlöd a naplót?")) {
            cachedLogs = [];
            db.ref("logs").set([]);
            document.getElementById("logTableBody").innerHTML = "";
        }
    };

    document.getElementById("downloadLogBtn").onclick = function() {
        var content = "";

        cachedLogs.forEach(function(l) {
            content += l.rowId + " | " + l.userName + " | " + l.dateTime + " | " + l.event + "\n";
        });

        var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");

        a.href = url;
        a.download = "_Log.txt";
        a.click();

        URL.revokeObjectURL(url);
    };


    /* ========================================================
       LAYOUT
       ======================================================== */

    var layoutModal = document.getElementById("layoutModal");

    document.getElementById("openLayoutBtn").onclick = function() {
        layoutModal.style.display = "flex";
    };

    document.getElementById("closeLayoutBtn").onclick = function() {
        layoutModal.style.display = "none";
    };


    /* ========================================================
       ANDROID
       ======================================================== */

    var androidModal = document.getElementById("androidModal");

    document.getElementById("openAndroidModalBtn").onclick = function() {
        androidModal.style.display = "flex";
    };

    document.getElementById("closeAndroidModalBtn").onclick = function() {
        androidModal.style.display = "none";
    };


    /* ========================================================
       CLEAR ALL DATA
       ======================================================== */

    document.getElementById("clearAllDataBtn").onclick = async function() {
        if (!CheckPassword()) return;

        if (!confirm("FIGYELEM! Minden aktív hozzárendelés törlődik. Biztosan folytatod?")) {
            return;
        }

        try {
            var startupLocations = EnsureRampIds(CreateStartupLocations());

            cachedAssignments = [];
            cachedLocations = startupLocations;
            showAssignmentsOnRamps = false;
            startupDisplayOnly = false;

            await Promise.all([
                db.ref("assignments").set([]),
                db.ref("locations").set(cachedLocations),
                db.ref("settings/showAssignmentsOnRamps").set(false)
            ]);

            CreateRampOptions();
            RenderRamps();
            WriteLog("ClearAllData");

            document.getElementById("locationsTextarea").value = "";
        } catch (error) {
            console.error("ClearAllData hiba:", error);
            alert("A ClearAllData művelet nem sikerült. Részletek a böngésző konzoljában.");
        }
    };


    /* ========================================================
       ÚJ BEVITELI ABLAK
       ======================================================== */

    document.getElementById("closeAssignmentBtn").onclick = function() {
        CloseAssignmentModal();
    };

    document.getElementById("cancelAssignmentBtn").onclick = function() {
        CloseAssignmentModal();
    };

    document.getElementById("modalAssignBtn").onclick = function() {
        AssignRampFromModal();
    };

    document.getElementById("modalMoveBtn").onclick = function() {
        MoveRampFromModal();
    };

    /*
     * A backdrop kattintása nem zárja be a beviteli ablakot.
     * Csak az X vagy a Mégse gomb zárja be.
     */
}


