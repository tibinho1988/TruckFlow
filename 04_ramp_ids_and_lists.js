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


