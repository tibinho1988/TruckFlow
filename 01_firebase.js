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


