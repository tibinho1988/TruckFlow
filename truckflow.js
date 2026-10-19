/* ============================================================
   FIREBASE
   ============================================================ */

var adminPassword = "aaa";

var firebaseConfig = {
    apiKey: "AIzaSyB4wIUpERNWb2dJkyESSKcLhCOFFleCprA",
    authDomain: "truckflow-webapp.firebaseapp.com",
    projectId: "truckflow-webapp",
    storageBucket: "truckflow-webapp.appspot.com",
    messagingSenderId: "513950754358",
    appId: "1:513950754358:web:787114a6f038a7567a9a97",
    measurementId: "G-XDWMXD781G"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.database();

var cachedAssignments = [];
var cachedHistory = [];
var cachedLogs = [];
var cachedLocations = {};
var cachedDefaultLocations = {};
var cachedRampIds = {};
var showAssignmentsOnRamps = false;
var startupDisplayOnly = false;


/* ============================================================
   USER
   ============================================================ */

function GetCurrentUser() {
    var user = localStorage.getItem("TruckFlow_User");

    if (!user) {
        user = prompt("Add meg a neved (UserName a naplóhoz):") || "Ismeretlen";
        localStorage.setItem("TruckFlow_User", user);
    }

    return user;
}


/* ============================================================
   PASSWORD
   ============================================================ */

function CheckPassword() {
    var inputPass = prompt("Kérlek, add meg a jelszót a művelethez:");

    if (inputPass === adminPassword) return true;

    if (inputPass !== null) alert("Hibás jelszó!");

    return false;
}


/* ============================================================
   LOG
   ============================================================ */

function WriteLog(EventNameV) {
    var rowId = cachedLogs.length + 1;
    var userNameV = GetCurrentUser();
    var nowV = new Date().toISOString().replace("T", " ").substring(0, 19);

    var newLog = {
        rowId: rowId,
        userName: userNameV,
        dateTime: nowV,
        event: EventNameV
    };

    cachedLogs.push(newLog);
    db.ref("logs").set(cachedLogs);
}


/* ============================================================
   ASSIGNMENTS
   ============================================================ */

function GetAssignments() {
    return Array.isArray(cachedAssignments) ? cachedAssignments : [];
}

function SaveAssignments(AssignmentsV) {
    cachedAssignments = Array.isArray(AssignmentsV) ? AssignmentsV : [];
    return db.ref("assignments").set(cachedAssignments);
}


/* ============================================================
   HISTORY
   ============================================================ */

function GetHistory() {
    return Array.isArray(cachedHistory) ? cachedHistory : [];
}

function SaveHistory(HistoryV) {
    cachedHistory = Array.isArray(HistoryV) ? HistoryV : [];
    return db.ref("history").set(cachedHistory);
}


/* ============================================================
   LOCATIONS
   ============================================================ */

function GetLocations() {
    return cachedLocations || {};
}

function SaveLocationsMap(LocationsV) {
    cachedLocations = EnsureRampIds(LocationsV || {});
    return db.ref("locations").set(cachedLocations);
}


/* ============================================================
   ÁLLANDÓ RÁMPAAZONOSÍTÓK
   ============================================================ */

function NormalizeRampKey(RampV) {
    return String(RampV || "").trim().toUpperCase();
}

function GetRampIdNumber(RampV) {
    var name = NormalizeRampKey(RampV);

    if (name === "XD-01") return "F1";
    if (name === "XD-02") return "F2";

    var match = name.match(/^(X|D)-(\d+)$/);

    if (!match) return "";

    return String(Number(match[2]));
}

function GetRampId(RampV) {
    var name = NormalizeRampKey(RampV);

    if (name === "XD-01") return "x#F1";
    if (name === "XD-02") return "x#F2";

    var match = name.match(/^(X|D)-(\d+)$/);

    if (!match) return "-";

    return match[1].toLowerCase() + "#" + Number(match[2]);
}

function SaveRampIds() {
    return db.ref("settings/rampIds").set(cachedRampIds || {});
}

function EnsureRampIds(LocationsV) {
    LocationsV = LocationsV || {};
    cachedRampIds = cachedRampIds || {};

    Object.keys(LocationsV).forEach(function(rampName) {
        var key = NormalizeRampKey(rampName);
        var item = LocationsV[rampName];
        var id = GetRampId(rampName);

        cachedRampIds[key] = id;

        if (!item || typeof item !== "object") {
            item = {
                location: String(item || ""),
                routeType: "",
                comment: "",
                active: "Off"
            };
        }

        item.id = id;
        LocationsV[rampName] = item;
    });

    return LocationsV;
}

function GetMigratedRampName(RampV) {
    return NormalizeRampKey(RampV);
}

function MigrateLocationNames(LocationsV) {
    var result = {};
    var changed = false;

    Object.keys(LocationsV || {}).forEach(function(oldName) {
        var newName = GetMigratedRampName(oldName);

        if (newName !== oldName) changed = true;

        if (!Object.prototype.hasOwnProperty.call(result, newName) || newName === oldName) {
            result[newName] = LocationsV[oldName];
        }
    });

    return {
        locations: result,
        changed: changed
    };
}

function MigrateRampReferences(ItemsV) {
    var changed = false;
    var items = Array.isArray(ItemsV) ? ItemsV : [];

    items.forEach(function(item) {
        if (item && item.ramp) {
            var newName = GetMigratedRampName(item.ramp);

            if (newName !== item.ramp) {
                item.ramp = newName;
                changed = true;
            }

            var expectedId = GetRampId(item.ramp);

            if (item.rampId !== expectedId) {
                item.rampId = expectedId;
                changed = true;
            }
        }
    });

    return {
        items: items,
        changed: changed
    };
}

function IsSameRampReference(ItemV, RampV) {
    if (!ItemV || !RampV) return false;

    var itemRamp = NormalizeRampKey(ItemV.ramp || ItemV.rampName || "");
    var wantedRamp = NormalizeRampKey(RampV);

    if (itemRamp !== "") {
        return itemRamp === wantedRamp;
    }

    var wantedId = GetRampId(RampV);

    return !!(
        ItemV.rampId &&
        wantedId !== "-" &&
        String(ItemV.rampId).trim().toLowerCase() ===
        String(wantedId).trim().toLowerCase()
    );
}


/* ============================================================
   STARTUP ALAP RÁMPALISTA
   ============================================================ */

function CreateStartupLocations() {
    var startupLocations = {};

    startupLocations["XD-01"] = {
        location: "",
        routeType: "",
        comment: "",
        active: "Off"
    };

    startupLocations["XD-02"] = {
        location: "",
        routeType: "",
        comment: "",
        active: "Off"
    };

    for (var xRampNumber = 1; xRampNumber <= 40; xRampNumber++) {
        var xRampName = "X-" + String(xRampNumber).padStart(2, "0");

        startupLocations[xRampName] = {
            location: "",
            routeType: "",
            comment: "",
            active: "Off"
        };
    }

    for (var dRampNumber = 1; dRampNumber <= 40; dRampNumber++) {
        var dRampName = "D-" + String(dRampNumber).padStart(2, "0");

        startupLocations[dRampName] = {
            location: "",
            routeType: "",
            comment: "",
            active: "Off"
        };
    }

    return startupLocations;
}


/* ============================================================
   RAMP DISPLAY MODE
   ============================================================ */

function SetRampDisplayMode(ShowAssignmentsV) {
    showAssignmentsOnRamps = !!ShowAssignmentsV;
    startupDisplayOnly = false;

    db.ref("settings/showAssignmentsOnRamps").set(showAssignmentsOnRamps);

    RenderRamps();
}


/* ============================================================
   RAMP AKTÍV ÁLLAPOT
   ============================================================ */

function IsRampActive(LocationDataV) {
    if (!LocationDataV || typeof LocationDataV !== "object") return true;

    var activeValue = String(LocationDataV.active || "").trim().toUpperCase();

    if (activeValue === "") return true;

    return activeValue === "ON";
}


/* ============================================================
   TÖRLŐGOMB HTML
   ============================================================ */

function GetDeleteButtonHtml(RampV) {
    if (startupDisplayOnly) return "";

    var AssignmentsV = GetAssignments();

    var AssignmentV = AssignmentsV.find(function(ItemV) {
        return IsSameRampReference(ItemV, RampV);
    });

    if (!AssignmentV) return "";

    return '<button type="button" class="delete-btn" data-delete-ramp="' +
        String(RampV).replace(/"/g, "&quot;") + '">X</button>';
}


/* ============================================================
   RAMP LIST
   Az X-rámpákat mindig X-01–X-40 között rajzoljuk ki.
   Ha valamelyik hiányzik a Firebase locations listából,
   a hiányzó rámpát helyben létrehozzuk a megjelenítéshez.
   ============================================================ */

function EnsureDisplayRampList() {
    var locations = GetLocations();

    for (var i = 1; i <= 40; i++) {
        var xName = "X-" + String(i).padStart(2, "0");
        var dName = "D-" + String(i).padStart(2, "0");

        if (!Object.prototype.hasOwnProperty.call(locations, xName)) {
            locations[xName] = {
                id: GetRampIdNumber(xName),
                location: "",
                routeType: "",
                comment: "",
                active: "Off"
            };
        }

        if (!Object.prototype.hasOwnProperty.call(locations, dName)) {
            locations[dName] = {
                id: GetRampIdNumber(dName),
                location: "",
                routeType: "",
                comment: "",
                active: "Off"
            };
        }
    }

    ["XD-01", "XD-02"].forEach(function(name) {
        if (!Object.prototype.hasOwnProperty.call(locations, name)) {
            locations[name] = {
                id: GetRampIdNumber(name),
                location: "",
                routeType: "",
                comment: "",
                active: "Off"
            };
        }
    });

    cachedLocations = EnsureRampIds(locations);

    return cachedLocations;
}

function GetXRamps() {
    var locations = GetLocations();
    var result = [];

    for (var i = 1; i <= 40; i++) {
        var rampName = "X-" + String(i).padStart(2, "0");

        if (Object.prototype.hasOwnProperty.call(locations, rampName)) {
            result.push(rampName);
        }
    }

    return result;
}

function GetSpecialRamps() {
    var locations = GetLocations();

    return ["XD-01", "XD-02"].filter(function(name) {
        return Object.prototype.hasOwnProperty.call(locations, name);
    });
}

function GetDRamps() {
    var locations = GetLocations();
    var result = [];

    for (var i = 1; i <= 40; i++) {
        var rampName = "D-" + String(i).padStart(2, "0");

        if (Object.prototype.hasOwnProperty.call(locations, rampName)) {
            result.push(rampName);
        }
    }

    return result;
}


/* ============================================================
   ROUTETYPE
   ============================================================ */

function GetRouteTypeClass(RouteTypeV) {
    var route = (RouteTypeV || "").trim().toUpperCase();

    if (route === "CITY FIX") return "route-city-fix";
    if (route.startsWith("CITY")) return "route-city";
    if (route.startsWith("MANIFEST")) return "route-manifest";
    if (route.startsWith("DEPO")) return "route-depo";

    return "route-other";
}


/* ============================================================
   ROUTETYPE SELECT
   ============================================================ */

function SetRouteTypeSelectValue(SelectElV, RouteTypeV) {
    if (!SelectElV) return;

    RouteTypeV = (RouteTypeV || "").trim();

    if (!RouteTypeV) {
        SelectElV.value = "";
        return;
    }

    var exists = false;

    for (var i = 0; i < SelectElV.options.length; i++) {
        if (SelectElV.options[i].value === RouteTypeV) {
            exists = true;
            break;
        }
    }

    if (!exists) {
        var opt = document.createElement("option");
        opt.value = RouteTypeV;
        opt.textContent = RouteTypeV;
        SelectElV.appendChild(opt);
    }

    SelectElV.value = RouteTypeV;
}


/* ============================================================
   CREATE RAMP OPTIONS
   ============================================================ */

function CreateRampOptions() {
    var RampSelect = document.getElementById("modalRampSelect");
    var MoveRampSelect = document.getElementById("modalMoveRampSelect");
    var allRamps = GetSpecialRamps().concat(GetXRamps(), GetDRamps());

    if (RampSelect) {
        var oldRampValue = RampSelect.value;

        RampSelect.innerHTML = '<option value="">-- Válassz --</option>';

        allRamps.forEach(function(rampName) {
            var opt = document.createElement("option");
            opt.value = rampName;
            opt.textContent = GetRampId(rampName) + " – " + rampName;
            RampSelect.appendChild(opt);
        });

        if (allRamps.indexOf(oldRampValue) !== -1) {
            RampSelect.value = oldRampValue;
        }
    }

    if (MoveRampSelect) {
        var oldMoveValue = MoveRampSelect.value;

        MoveRampSelect.innerHTML = '<option value="">-- Válaszd ki a cél rámpát --</option>';

        allRamps.forEach(function(rampName) {
            var opt = document.createElement("option");
            opt.value = rampName;
            opt.textContent = GetRampId(rampName) + " – " + rampName;
            MoveRampSelect.appendChild(opt);
        });

        if (allRamps.indexOf(oldMoveValue) !== -1) {
            MoveRampSelect.value = oldMoveValue;
        }
    }
}


/* ============================================================
   RAMP SELECT -> ROUTETYPE
   ============================================================ */

function SetupModalRampRouteType() {
    var RampSelect = document.getElementById("modalRampSelect");
    var RouteTypeSelect = document.getElementById("modalRouteTypeSelect");

    if (!RampSelect || !RouteTypeSelect) return;

    RampSelect.addEventListener("change", function() {
        var selectedRamp = RampSelect.value;

        if (RouteTypeSelect.value !== "") return;
        if (!selectedRamp) return;

        var locationData = GetLocations()[selectedRamp];
        var routeType = "";

        if (locationData && typeof locationData === "object") {
            routeType = locationData.routeType || "";
        }

        if (routeType) {
            SetRouteTypeSelectValue(RouteTypeSelect, routeType);
        }
    });
}


/* ============================================================
   ÜZENET
   ============================================================ */

function ShowAssignmentMessage(MessageV) {
    var El = document.getElementById("assignmentMessage");
    if (!El) return;

    El.textContent = MessageV;

    setTimeout(function() {
        El.textContent = "";
    }, 3000);
}


/* ============================================================
   BEVITELI ABLAK MEGNYITÁSA
   ============================================================ */

function OpenAssignmentModal(RampV) {
    var modal = document.getElementById("assignmentModal");
    var RampSelect = document.getElementById("modalRampSelect");
    var TruckInput = document.getElementById("modalTruckInput");
    var RouteTypeSelect = document.getElementById("modalRouteTypeSelect");
    var PlateInput = document.getElementById("modalPlateInput");
    var SlotInput = document.getElementById("modalSlotInput");
    var OperationSelect = document.getElementById("modalOperationSelect");
    var CommentInput = document.getElementById("modalCommentInput");
    var MoveRampSelect = document.getElementById("modalMoveRampSelect");
    var Title = document.getElementById("assignmentModalTitle");

    CreateRampOptions();
    RampSelect.value = RampV;

    var AssignmentsV = GetAssignments();
    var ExistingAssignmentV = AssignmentsV.find(function(item) {
        return IsSameRampReference(item, RampV);
    });

    if (ExistingAssignmentV) {
        TruckInput.value = ExistingAssignmentV.truck || "";
        PlateInput.value = ExistingAssignmentV.plate || "";
        SlotInput.value = ExistingAssignmentV.slot || "";
        OperationSelect.value = ExistingAssignmentV.operation || "";
        CommentInput.value = ExistingAssignmentV.comment || "";

        SetRouteTypeSelectValue(RouteTypeSelect, ExistingAssignmentV.routeType || "");
        Title.textContent = RampV + " – beviteli ablak / MOVE";
    } else {
        var locationData = GetLocations()[RampV];
        var routeType = "";

        if (locationData && typeof locationData === "object") {
            routeType = locationData.routeType || "";
        }

        SetRouteTypeSelectValue(RouteTypeSelect, routeType);

        TruckInput.value = "";
        PlateInput.value = "";
        SlotInput.value = "";
        OperationSelect.value = "";
        CommentInput.value = "";

        Title.textContent = RampV + " – beviteli ablak";
    }

    MoveRampSelect.value = "";
    document.getElementById("assignmentMessage").textContent = "";
    modal.style.display = "flex";

    setTimeout(function() {
        TruckInput.focus();
    }, 100);
}

function OpenCityFixCarSetModal() {
    var modal = document.getElementById("assignmentModal");
    var RampSelect = document.getElementById("modalRampSelect");
    var TruckInput = document.getElementById("modalTruckInput");
    var RouteTypeSelect = document.getElementById("modalRouteTypeSelect");
    var PlateInput = document.getElementById("modalPlateInput");
    var SlotInput = document.getElementById("modalSlotInput");
    var OperationSelect = document.getElementById("modalOperationSelect");
    var CommentInput = document.getElementById("modalCommentInput");
    var MoveRampSelect = document.getElementById("modalMoveRampSelect");
    var Title = document.getElementById("assignmentModalTitle");

    CreateRampOptions();

    RampSelect.value = "";
    TruckInput.value = "City Auto";
    RouteTypeSelect.value = "CITY FIX";
    PlateInput.value = "";
    SlotInput.value = "";
    OperationSelect.value = "Felpakolás";
    CommentInput.value = "City Fix Rámpa";
    MoveRampSelect.value = "";
    Title.textContent = "City Fix Car Set";
    document.getElementById("assignmentMessage").textContent = "";
    modal.style.display = "flex";

    setTimeout(function() {
        RampSelect.focus();
    }, 100);
}

/* ============================================================
   CITY FIX CAR SET – KÜLÖN GOMB ESEMÉNY
   ============================================================ */

function SetupCityFixCarSetButton() {
    var CityFixButton = document.getElementById("cityFixCarSetBtn");

    if (!CityFixButton) {
        console.warn("A cityFixCarSetBtn gomb nem található a HTML-ben.");
        return;
    }

    CityFixButton.addEventListener("click", function() {
        OpenCityFixCarSetModal();
    });
}


/* ============================================================
   CITY CAR FIX SET [ALL] – GOMB ÉS MODAL KEZELÉSE
   ============================================================ */
function SetupCityFixCarSetAllButton() {
    var ButtonV = document.getElementById("cityFixCarSetAllBtn");
    var ModalV = document.getElementById("cityFixCarSetAllModal");
    var CloseButtonV = document.getElementById("closeCityFixCarSetAllBtn");

    if (!ButtonV || !ModalV || !CloseButtonV) {
        console.error("City Car Fix Set [ALL]: hiányzó HTML elem.");
        return;
    }

    ButtonV.addEventListener("click", function () {
        ModalV.style.display = "flex";
    });

    CloseButtonV.addEventListener("click", function () {
        ModalV.style.display = "none";
    });
}


/* ============================================================
   CITY CAR FIX SET [ALL] – WRITE
   ============================================================ */

function SetupCityFixCarSetAllWrite() {
    var WriteButtonV = document.getElementById("cityFixCarSetAllWriteBtn");
    var TextareaV = document.getElementById("cityFixCarSetAllTextarea");
    var MessageV = document.getElementById("cityFixCarSetAllMessage");

    if (!WriteButtonV || !TextareaV || !MessageV) {
        console.error("City Car Fix Set [ALL]: hiányzó Write elem.");
        return;
    }

    function ShowMessageV(TextV, IsErrorV) {
        MessageV.textContent = TextV;
        MessageV.style.color = IsErrorV ? "#b91c1c" : "#166534";
    }

    function NormalizeIdV(ValueV) {
        return String(ValueV || "").trim().toLowerCase();
    }

    WriteButtonV.addEventListener("click", async function() {
        var TextV = TextareaV.value.trim();

        if (!TextV) {
            ShowMessageV("A lista üres. Illeszd be a rámpalistát!", true);
            return;
        }

        var LinesV = TextV.split(/\r?\n/).filter(function(LineV) {
            return LineV.trim() !== "";
        });

        if (LinesV.length < 2) {
            ShowMessageV("A fejléc és legalább egy rámpasor szükséges.", true);
            return;
        }

        var HeaderV = LinesV[0].split(";").map(function(ValueV) {
            return ValueV.trim().toLowerCase();
        });

        var IdColumnV = HeaderV.indexOf("id");
        var ActiveColumnV = HeaderV.findIndex(function(ValueV) {
            return ValueV === "active/inactive";
        });

        if (IdColumnV < 0 || ActiveColumnV < 0 || HeaderV.length < 11) {
            ShowMessageV(
                "Hibás fejléc. A szükséges oszlopok: Id, Rámpa, Tárhely, Kamion / útvonal, RouteType, Rendszám, Időkapu, Művelet, Idő, Comment, Active/Inactive.",
                true
            );
            return;
        }

        var RowsV = [];
        var SeenIdsV = {};

        for (var I = 1; I < LinesV.length; I++) {
            var PartsV = LinesV[I].split(";").map(function(ValueV) {
                return ValueV.trim();
            });

            if (PartsV.length < HeaderV.length) {
                ShowMessageV(
                    "Hibás oszlopszám a(z) " + (I + 1) + ". sorban. A mentés nem történt meg.",
                    true
                );
                return;
            }

            var IdV = NormalizeIdV(PartsV[IdColumnV]);
            var ActiveV = String(PartsV[ActiveColumnV] || "").trim().toUpperCase();

            if (!IdV) {
                ShowMessageV("Hiányzó ID a(z) " + (I + 1) + ". sorban.", true);
                return;
            }

            if (SeenIdsV[IdV]) {
                ShowMessageV("Duplikált ID: " + PartsV[IdColumnV], true);
                return;
            }

            if (ActiveV !== "ON" && ActiveV !== "OFF") {
                ShowMessageV(
                    "Az Active/Inactive értéke csak On vagy Off lehet a(z) " +
                    (I + 1) + ". sorban.",
                    true
                );
                return;
            }

            SeenIdsV[IdV] = true;

            RowsV.push({
                id: IdV,
                parts: PartsV,
                active: ActiveV
            });
        }

        var OriginalTextV = WriteButtonV.textContent;
        WriteButtonV.disabled = true;
        WriteButtonV.textContent = "Írás folyamatban...";

        try {
            var ResultsV = await Promise.all([
                db.ref("locations").once("value"),
                db.ref("assignments").once("value"),
                db.ref("history").once("value")
            ]);

            var LocationsV = ResultsV[0].val() || {};
            var AssignmentsV = Array.isArray(ResultsV[1].val())
                ? ResultsV[1].val()
                : [];
            var HistoryV = Array.isArray(ResultsV[2].val())
                ? ResultsV[2].val()
                : [];

            var IdToRampV = {};

            Object.keys(LocationsV).forEach(function(RampNameV) {
                IdToRampV[NormalizeIdV(GetRampId(RampNameV))] = RampNameV;
            });

            var NewAssignmentsV = AssignmentsV.slice();
            var UpdatedCountV = 0;
            var SkippedCountV = 0;
            var NowV = new Date().toLocaleTimeString("hu-HU", {
                hour: "2-digit",
                minute: "2-digit"
            });

            for (var R = 0; R < RowsV.length; R++) {
                var RowV = RowsV[R];
                var P = RowV.parts;
                var RampV = IdToRampV[RowV.id];

                if (!RampV) {
                    SkippedCountV++;
                    continue;
                }

                if (RowV.active === "OFF") {
                    continue;
                }

                var TruckV = P[3] || "City Auto";
                var RouteTypeV = "CITY FIX";
                var PlateV = P[5] || "";
                var SlotV = P[6] || "";
                var OperationV = P[7] || "Felpakolás";
                var CommentV = P[9] || "City Fix Rámpa";

                var ExistingV = NewAssignmentsV.find(function(ItemV) {
                    return IsSameRampReference(ItemV, RampV);
                });

                if (ExistingV) {
                    var ConfirmV = confirm(
                        "A(z) " + RampV + " rámpán már van hozzárendelés (" +
                        (ExistingV.truck || "ismeretlen") +
                        "). Lecseréled City Fix adatokra?"
                    );

                    if (!ConfirmV) {
                        WriteButtonV.disabled = false;
                        WriteButtonV.textContent = OriginalTextV;
                        ShowMessageV("Az írás megszakítva.", true);
                        return;
                    }

                    var OldAssignmentV = Object.assign({}, ExistingV);
                    OldAssignmentV.leftTime = NowV;
                    OldAssignmentV.eventType = "Write";
                    HistoryV.unshift(OldAssignmentV);

                    NewAssignmentsV = NewAssignmentsV.filter(function(ItemV) {
                        return !IsSameRampReference(ItemV, RampV);
                    });
                }

                NewAssignmentsV.push({
                    ramp: RampV,
                    rampId: GetRampId(RampV),
                    truck: TruckV,
                    routeType: RouteTypeV,
                    plate: PlateV,
                    slot: SlotV,
                    operation: OperationV,
                    comment: CommentV,
                    time: NowV
                });

                var LocationItemV = LocationsV[RampV];

                if (!LocationItemV || typeof LocationItemV !== "object") {
                    LocationItemV = {};
                }

                LocationsV[RampV] = Object.assign({}, LocationItemV, {
                    id: GetRampIdNumber(RampV),
                    routeType: RouteTypeV,
                    comment: CommentV,
                    active: "On"
                });

                UpdatedCountV++;
            }

            if (UpdatedCountV === 0) {
                ShowMessageV(
                    "Nincs feldolgozható, létező rámpa-ID a listában.",
                    true
                );
                return;
            }

            await Promise.all([
                db.ref("locations").set(EnsureRampIds(LocationsV)),
                db.ref("assignments").set(NewAssignmentsV),
                db.ref("history").set(HistoryV),
                db.ref("settings/showAssignmentsOnRamps").set(true)
            ]);

            cachedLocations = EnsureRampIds(LocationsV);
            cachedAssignments = NewAssignmentsV;
            cachedHistory = HistoryV;
            showAssignmentsOnRamps = true;
            startupDisplayOnly = false;

            CreateRampOptions();
            RenderRamps();
            WriteLog("CityCarFixSetALL: " + UpdatedCountV);

            ShowMessageV(
                "Sikeres írás: " + UpdatedCountV +
                " rámpa. Kihagyott, nem létező ID: " + SkippedCountV + ".",
                false
            );

			document.getElementById("cityFixCarSetAllModal").style.display = "none";
        } catch (ErrorV) {
            console.error("City Car Fix Set [ALL] Write hiba:", ErrorV);
            ShowMessageV("Hiba történt az írás során. A konzolban látható a részlet.", true);
        } finally {
            WriteButtonV.disabled = false;
            WriteButtonV.textContent = OriginalTextV;
        }
    });
}


/* ============================================================
   BEVITELI ABLAK BEZÁRÁSA
   ============================================================ */

function CloseAssignmentModal() {
    document.getElementById("assignmentModal").style.display = "none";
}


/* ============================================================
   KÖZÖS ADATELLENŐRZÉS
   ============================================================ */

function GetModalAssignmentData() {
    var RampSelectV = document.getElementById("modalRampSelect");
    var TruckInputV = document.getElementById("modalTruckInput");
    var RouteTypeSelectV = document.getElementById("modalRouteTypeSelect");
    var PlateInputV = document.getElementById("modalPlateInput");
    var SlotInputV = document.getElementById("modalSlotInput");
    var OperationSelectV = document.getElementById("modalOperationSelect");
    var CommentInputV = document.getElementById("modalCommentInput");

    var RampV = RampSelectV.value.trim();
    var TruckV = TruckInputV.value.trim();
    var RouteTypeV = RouteTypeSelectV.value;
    var PlateV = PlateInputV.value.trim();
    var SlotV = SlotInputV.value.trim();
    var OperationV = OperationSelectV.value;
    var CommentV = CommentInputV.value.trim();

    if (RampV === "") {
        ShowAssignmentMessage("A rámpa kiválasztása kötelező!");
        return null;
    }

    if (TruckV === "") {
        ShowAssignmentMessage("A kamion / útvonal megadása kötelező!");
        TruckInputV.focus();
        return null;
    }

    if (RouteTypeV === "") {
        ShowAssignmentMessage("A RouteType kiválasztása kötelező!");
        RouteTypeSelectV.focus();
        return null;
    }

    if (OperationV === "") {
        ShowAssignmentMessage("A művelet kiválasztása kötelező!");
        OperationSelectV.focus();
        return null;
    }

    return {
        ramp: RampV,
        rampId: GetRampId(RampV),
        truck: TruckV,
        routeType: RouteTypeV,
        plate: PlateV,
        slot: SlotV,
        operation: OperationV,
        comment: CommentV
    };
}


/* ============================================================
   HOZZÁADÁS
   ============================================================ */

function AssignRampFromModal() {
    var DataV = GetModalAssignmentData();
    if (!DataV) return;

    var AssignmentsV = GetAssignments();
    var ExistingV = AssignmentsV.find(function(item) {
        return IsSameRampReference(item, DataV.ramp);
    });

    if (ExistingV) {
        var confirmReplace = confirm(
            "A(z) " + DataV.ramp + " rámpa jelenleg foglalt (" +
            ExistingV.truck + "). Lecseréled az újra?"
        );

        if (!confirmReplace) return;

        var HistoryV = GetHistory();
        var HistoryItemV = Object.assign({}, ExistingV);

        HistoryItemV.leftTime = new Date().toLocaleTimeString("hu-HU", {
            hour: "2-digit",
            minute: "2-digit"
        });

        HistoryItemV.eventType = "Write";
        HistoryV.unshift(HistoryItemV);
        SaveHistory(HistoryV);

        AssignmentsV = AssignmentsV.filter(function(item) {
            return !IsSameRampReference(item, DataV.ramp);
        });
    }

    var NewAssignmentV = {
        ramp: DataV.ramp,
        rampId: GetRampId(DataV.ramp),
        truck: DataV.truck,
        routeType: DataV.routeType,
        plate: DataV.plate,
        slot: DataV.slot,
        operation: DataV.operation,
        comment: DataV.comment,
        time: new Date().toLocaleTimeString("hu-HU", {
            hour: "2-digit",
            minute: "2-digit"
        })
    };

    AssignmentsV.push(NewAssignmentV);
    SaveAssignments(AssignmentsV);

    showAssignmentsOnRamps = true;
    startupDisplayOnly = false;
    db.ref("settings/showAssignmentsOnRamps").set(true);

    CloseAssignmentModal();
    RenderRamps();
    WriteLog("AssignRamp(Modal)");
}


/* ============================================================
   MOVE
   ============================================================ */

function MoveRampFromModal() {
    var DataV = GetModalAssignmentData();
    if (!DataV) return;

    var MoveRampSelectV = document.getElementById("modalMoveRampSelect");
    var TargetRampV = MoveRampSelectV.value.trim();

    if (TargetRampV === "") {
        ShowAssignmentMessage("A Move cél rámpa kiválasztása kötelező!");
        MoveRampSelectV.focus();
        return;
    }

    if (NormalizeRampKey(TargetRampV) === NormalizeRampKey(DataV.ramp)) {
        ShowAssignmentMessage("A cél rámpa nem lehet ugyanaz, mint a kiinduló rámpa!");
        MoveRampSelectV.focus();
        return;
    }

    var AssignmentsV = GetAssignments();

    var SourceAssignmentV = AssignmentsV.find(function(ItemV) {
        return IsSameRampReference(ItemV, DataV.ramp);
    });

    if (!SourceAssignmentV) {
        ShowAssignmentMessage("A kiinduló rámpán nincs aktív hozzárendelés!");
        return;
    }

    var TargetAssignmentV = AssignmentsV.find(function(ItemV) {
        return IsSameRampReference(ItemV, TargetRampV);
    });

    var HistoryV = GetHistory();

    if (TargetAssignmentV) {
        var ConfirmMoveReplaceV = confirm(
            "A(z) " + TargetRampV + " rámpa jelenleg foglalt (" +
            TargetAssignmentV.truck + ").\n\n" +
            "Biztosan áthelyezed ide a(z) " + DataV.truck + " kamiont?"
        );

        if (!ConfirmMoveReplaceV) return;

        var TargetHistoryV = Object.assign({}, TargetAssignmentV);
        TargetHistoryV.leftTime = new Date().toLocaleTimeString("hu-HU", {
            hour: "2-digit",
            minute: "2-digit"
        });
        TargetHistoryV.eventType = "Move";

        HistoryV.unshift(TargetHistoryV);

        AssignmentsV = AssignmentsV.filter(function(ItemV) {
            return !IsSameRampReference(ItemV, TargetRampV);
        });
    }

    var SourceHistoryV = Object.assign({}, SourceAssignmentV);
    SourceHistoryV.leftTime = new Date().toLocaleTimeString("hu-HU", {
        hour: "2-digit",
        minute: "2-digit"
    });
    SourceHistoryV.eventType = "Move";
    HistoryV.unshift(SourceHistoryV);
    SaveHistory(HistoryV);

    var LocationsV = GetLocations();
    var SourceLocationV = LocationsV[DataV.ramp];

    if (!SourceLocationV || typeof SourceLocationV !== "object") {
        SourceLocationV = {
            location: "",
            routeType: "",
            comment: "",
            active: "On"
        };
    }

    AssignmentsV = AssignmentsV.filter(function(ItemV) {
        return !IsSameRampReference(ItemV, DataV.ramp);
    });

    var MovedAssignmentV = {
        ramp: TargetRampV,
        rampId: GetRampId(TargetRampV),
        truck: DataV.truck,
        routeType: DataV.routeType,
        plate: DataV.plate,
        slot: DataV.slot,
        operation: DataV.operation,
        comment: DataV.comment,
        time: SourceAssignmentV.time || new Date().toLocaleTimeString("hu-HU", {
            hour: "2-digit",
            minute: "2-digit"
        })
    };

    AssignmentsV.push(MovedAssignmentV);

    var TargetLocationV = LocationsV[TargetRampV];

    if (!TargetLocationV || typeof TargetLocationV !== "object") {
        TargetLocationV = {
            location: "",
            routeType: "",
            comment: "",
            active: "Off"
        };
    }

    LocationsV[TargetRampV] = {
        id: GetRampIdNumber(TargetRampV),
        location: SourceLocationV.location || "",
        routeType: DataV.routeType || SourceLocationV.routeType || "",
        comment: DataV.comment || SourceLocationV.comment || "",
        active: "On"
    };

    LocationsV[DataV.ramp] = {
        id: GetRampIdNumber(DataV.ramp),
        location: "",
        routeType: "",
        comment: "",
        active: "Off"
    };

    SaveLocationsMap(LocationsV);
    SaveAssignments(AssignmentsV);

    showAssignmentsOnRamps = true;
    startupDisplayOnly = false;
    db.ref("settings/showAssignmentsOnRamps").set(true);

    CreateRampOptions();
    RenderRamps();
    WriteLog("MoveRamp(" + DataV.ramp + " -> " + TargetRampV + ")");
    CloseAssignmentModal();
}


/* ============================================================
   KAMION-HOZZÁRENDELÉS TÖRLÉSE
   ============================================================ */

function DeleteAssignment(RampV) {
    DeleteModalAssignment(RampV);
}


/* ============================================================
   PIROS X – TÖRLÉS ÉS HISTORY
   ============================================================ */

function DeleteModalAssignment(RampV) {
    var RampKeyV = NormalizeRampKey(RampV);

    if (!RampKeyV) return;

    var AssignmentsV = GetAssignments();

    var DeletedAssignmentV = AssignmentsV.find(function(ItemV) {
        return IsSameRampReference(ItemV, RampV);
    });

    /* Előzmény mentése törlés előtt */
    if (DeletedAssignmentV) {
        var HistoryV = GetHistory();
        var HistoryItemV = Object.assign({}, DeletedAssignmentV);

        HistoryItemV.leftTime = new Date().toLocaleTimeString("hu-HU", {
            hour: "2-digit",
            minute: "2-digit"
        });

        HistoryItemV.eventType = "Write";
        HistoryV.unshift(HistoryItemV);

        SaveHistory(HistoryV);
    }

    /* Aktív hozzárendelés törlése */
    var FilteredAssignmentsV = AssignmentsV.filter(function(ItemV) {
        return !IsSameRampReference(ItemV, RampV);
    });

    /* Rámpaadatok teljes ürítése */
    var LocationsV = GetLocations();

    Object.keys(LocationsV).forEach(function(KeyV) {
        if (NormalizeRampKey(KeyV) !== RampKeyV) return;

        var ExistingV = LocationsV[KeyV];

        if (!ExistingV || typeof ExistingV !== "object") {
            ExistingV = {};
        }

        LocationsV[KeyV] = Object.assign({}, ExistingV, {
            id: GetRampIdNumber(KeyV),
            location: "",
            routeType: "",
            comment: "",
            active: "Off"
        });
    });

    /* Firebase mentések */
    Promise.all([
        SaveAssignments(FilteredAssignmentsV),
        SaveLocationsMap(LocationsV)
    ]).then(function() {
        startupDisplayOnly = false;

        CreateRampOptions();
        RenderRamps();

        WriteLog("DeleteRampReset: " + RampKeyV);
    }).catch(function(ErrorV) {
        console.error("Törlési hiba:", ErrorV);
        alert("A törlés mentése nem sikerült. Ellenőrizd a Firebase-kapcsolatot.");
    });
}


/* ============================================================
   LOCATION INFO
   ============================================================ */

function GetLocationInfo(RampV) {
    var locationData = GetLocations()[RampV];
    var loc = "-";
    var defaultRouteType = "";
    var defaultComment = "-";

    if (locationData && typeof locationData === "object") {
        loc = locationData.location || "-";
        defaultRouteType = locationData.routeType || "";
        defaultComment = locationData.comment || "-";
    } else if (typeof locationData === "string") {
        loc = locationData;
    }

    return {
        location: loc,
        routeType: defaultRouteType,
        comment: defaultComment
    };
}


/* ============================================================
   RAMP SOR KATTINTÁS ÉS TÖRLŐGOMB
   ============================================================ */

function SetupRampRowEvents(RowV, RampV) {
    RowV.addEventListener("click", function(EventV) {
        if (EventV.target.closest("[data-delete-ramp]")) return;
        OpenAssignmentModal(RampV);
    });

    var DeleteBtnV = RowV.querySelector("[data-delete-ramp]");

    if (DeleteBtnV) {
        DeleteBtnV.addEventListener("click", function(EventV) {
            EventV.preventDefault();
            EventV.stopPropagation();
            DeleteModalAssignment(RampV);
        });
    }
}


/* ============================================================
   SPECIAL RAMP RENDER
   ============================================================ */

function RenderSpecialRamps() {
    var table = document.getElementById("specialRampTable");
    if (!table) return;

    table.innerHTML = "";
    var assignments = GetAssignments();

    GetSpecialRamps().forEach(function(rampName) {
        var assignment = showAssignmentsOnRamps && !startupDisplayOnly
            ? assignments.find(function(a) {
                return IsSameRampReference(a, rampName);
            })
            : null;

        var info = GetLocationInfo(rampName);
        var routeType = assignment
            ? (assignment.routeType || info.routeType || "-")
            : (info.routeType || "-");

        var tr = document.createElement("tr");
        tr.className = "ramp-clickable " +
            (assignment ? "occupied " : "free ") +
            GetRouteTypeClass(routeType);

        tr.innerHTML =
            "<td>" + GetRampId(rampName) + "</td>" +
            "<td>" + rampName + "</td>" +
            "<td>" + info.location + "</td>" +
            "<td>" + (assignment ? assignment.truck : "Szabad") + "</td>" +
            "<td>" + routeType + "</td>" +
            "<td>" + (assignment ? (assignment.plate || "-") : "-") + "</td>" +
            "<td>" + (assignment ? (assignment.slot || "-") : "-") + "</td>" +
            "<td>" + (assignment ? (assignment.operation || "-") : "-") + "</td>" +
            "<td>" + (assignment ? (assignment.time || "-") : "-") + "</td>" +
            "<td>" + (assignment ? (assignment.comment || info.comment || "-") : (info.comment || "-")) + "</td>" +
            "<td>" + GetDeleteButtonHtml(rampName) + "</td>";

        SetupRampRowEvents(tr, rampName);
        table.appendChild(tr);
    });
}


/* ============================================================
   X RAMP RENDER
   ============================================================ */

function RenderXRamps() {
    var xTable = document.getElementById("xRampTable");
    if (!xTable) return;

    xTable.innerHTML = "";

    var assignments = GetAssignments();

    GetXRamps().forEach(function(rName) {
        var assignment = showAssignmentsOnRamps && !startupDisplayOnly
            ? assignments.find(function(a) {
                return IsSameRampReference(a, rName);
            })
            : null;

        var info = GetLocationInfo(rName);
        var loc = info.location;
        var defaultRouteType = info.routeType;
        var tr = document.createElement("tr");

        tr.className = "ramp-clickable ";

        if (assignment) {
            var routeType = assignment.routeType || defaultRouteType || "-";

            tr.className += "occupied " + GetRouteTypeClass(routeType);

            tr.innerHTML =
                "<td>" + GetRampId(rName) + "</td>" +
                "<td>" + rName + "</td>" +
                "<td>" + loc + "</td>" +
                "<td>" + (assignment.truck || "-") + "</td>" +
                "<td>" + routeType + "</td>" +
                "<td>" + (assignment.plate || "-") + "</td>" +
                "<td>" + (assignment.slot || "-") + "</td>" +
                "<td>" + (assignment.operation || "-") + "</td>" +
                "<td>" + (assignment.time || "-") + "</td>" +
                "<td>" + (assignment.comment || info.comment || "-") + "</td>" +
                "<td>" + GetDeleteButtonHtml(rName) + "</td>";
        } else {
            tr.className += "free " + GetRouteTypeClass(defaultRouteType);

            tr.innerHTML =
                "<td>" + GetRampId(rName) + "</td>" +
                "<td>" + rName + "</td>" +
                "<td>" + loc + "</td>" +
                "<td>Szabad</td>" +
                "<td>" + (defaultRouteType || "-") + "</td>" +
                "<td>-</td>" +
                "<td>-</td>" +
                "<td>-</td>" +
                "<td>-</td>" +
                "<td>" + (info.comment || "-") + "</td>" +
                "<td>" + GetDeleteButtonHtml(rName) + "</td>";
        }

        SetupRampRowEvents(tr, rName);
        xTable.appendChild(tr);
    });
}


/* ============================================================
   D RAMP RENDER
   ============================================================ */

function RenderDRamps() {
    var dTable = document.getElementById("dRampTable");
    if (!dTable) return;

    dTable.innerHTML = "";

    var assignments = GetAssignments();

    GetDRamps().forEach(function(dName) {
        var assignmentD = showAssignmentsOnRamps && !startupDisplayOnly
            ? assignments.find(function(a) {
                return IsSameRampReference(a, dName);
            })
            : null;

        var info = GetLocationInfo(dName);
        var locD = info.location;
        var defaultRouteTypeD = info.routeType;
        var trD = document.createElement("tr");

        trD.className = "ramp-clickable ";

        if (assignmentD) {
            var routeTypeD = assignmentD.routeType || defaultRouteTypeD || "-";

            trD.className += "occupied " + GetRouteTypeClass(routeTypeD);

            trD.innerHTML =
                "<td>" + GetRampId(dName) + "</td>" +
                "<td>" + dName + "</td>" +
                "<td>" + locD + "</td>" +
                "<td>" + (assignmentD.truck || "-") + "</td>" +
                "<td>" + routeTypeD + "</td>" +
                "<td>" + (assignmentD.plate || "-") + "</td>" +
                "<td>" + (assignmentD.slot || "-") + "</td>" +
                "<td>" + (assignmentD.operation || "-") + "</td>" +
                "<td>" + (assignmentD.time || "-") + "</td>" +
                "<td>" + (assignmentD.comment || info.comment || "-") + "</td>" +
                "<td>" + GetDeleteButtonHtml(dName) + "</td>";
        } else {
            trD.className += "free " + GetRouteTypeClass(defaultRouteTypeD);

            trD.innerHTML =
                "<td>" + GetRampId(dName) + "</td>" +
                "<td>" + dName + "</td>" +
                "<td>" + locD + "</td>" +
                "<td>Szabad</td>" +
                "<td>" + (defaultRouteTypeD || "-") + "</td>" +
                "<td>-</td>" +
                "<td>-</td>" +
                "<td>-</td>" +
                "<td>-</td>" +
                "<td>" + (info.comment || "-") + "</td>" +
                "<td>" + GetDeleteButtonHtml(dName) + "</td>";
        }

        SetupRampRowEvents(trD, dName);
        dTable.appendChild(trD);
    });
}


/* ============================================================
   RENDER RAMPS
   ============================================================ */

function RenderRamps() {
    EnsureDisplayRampList();
    RenderSpecialRamps();
    RenderXRamps();
    RenderDRamps();
}


/* ============================================================
   HISTORY TABLE / TRUCKLIST
   ============================================================ */

function RenderHistoryTable() {
    var historyTableBody = document.getElementById("historyTableBody");
    if (!historyTableBody) return;

    historyTableBody.innerHTML = "";

    GetHistory().forEach(function(item) {
        var info = GetLocationInfo(item.ramp);
        var routeType = item.routeType || info.routeType || "-";
        var tr = document.createElement("tr");

        tr.className = GetRouteTypeClass(routeType);

        tr.innerHTML =
            "<td>" + (item.ramp || "-") + "</td>" +
            "<td>" + info.location + "</td>" +
            "<td>" + (item.truck || "-") + "</td>" +
            "<td>" + routeType + "</td>" +
            "<td>" + (item.plate || "-") + "</td>" +
            "<td>" + (item.slot || "-") + "</td>" +
            "<td>" + (item.operation || "-") + "</td>" +
            "<td>" + (item.comment || "-") + "</td>" +
            "<td>" + (item.time || "-") + "</td>" +
            "<td>" + (item.leftTime || "-") + "</td>" +
            "<td>" + (item.eventType || "-") + "</td>";

        historyTableBody.appendChild(tr);
    });
}


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
