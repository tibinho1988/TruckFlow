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


