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


