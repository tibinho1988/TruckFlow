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


