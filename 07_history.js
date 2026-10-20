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


