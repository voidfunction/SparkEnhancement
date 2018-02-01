
// import all the related css styles
import '../../resources/css/logtab.css';
import '../../resources/css/darktheme.css';

import {spark, setBasicInfo, getMessageAsync } from '../commons/common';

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