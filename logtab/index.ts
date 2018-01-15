/// <reference path="../node_modules/@types/knockout/index.d.ts" />
/// <reference path="../node_modules/@types/jquery/index.d.ts" />
/// <reference path="../node_modules/@types/angular/index.d.ts" />
/// <reference path="../common.d.ts" />

setBasicInfo();
commandBinding();

function commandBinding(): void {
    renderYarnLogs();
}

function renderYarnLogs(): void {
    getMessageAsync('/apps/logs', 'yarn', function(s) {
        spark.logs = JSON.parse(s);
        $('#driverErrorTextArea').text(spark.logs.stderr);
        $('#jobOutputTextArea').text(spark.logs.stdout);
        $('#directoryInfoTextArea').text(spark.logs.directoryInfo);
    }, spark.appId);
}