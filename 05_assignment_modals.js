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


