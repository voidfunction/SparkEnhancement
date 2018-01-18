/// <reference path="common.d.ts"/>

var asyncMessageCounter = 0;

class SparkInfo {
    parentOrigin: string;
    data: ISparkJobData;
    appId: string;
    attempId: string;
    applicationName: string;
    clusterName: string;
    localhost:string;
    logs: IApplicationMasterLogs;
}

var spark: SparkInfo = new SparkInfo();
spark.appId = 'application_1515069779315_0032';
spark.clusterName = 'spark2withblob';

function serializeQuery(queriesMap: object): string {
    var keys = Object.keys(queriesMap);
    if (!keys || keys.length == 0) return '';

    let result:string = keys.reduce(function(sumSoFar: string, key: string) {
        return sumSoFar + `&${key}=${queriesMap[key]}`;
    }, '');

    return result.substring(1);
}

function setBasicInfo(): void {
    spark.localhost = `http://localhost:41968`;
}

function getMessageAsync(url: string, type: string, callback: (param: string) => void, appId: string): void {
    let queries:object = {
        'http-type': type || 'spark',
        'cluster-name': spark.clusterName || '0',
        'appId': appId || '0'
    }

    let queryString = serializeQuery(queries);

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.timeout = 60 * 1000;
    xmlHttp.ontimeout = function() {
        if (--asyncMessageCounter === 0) {
            $('body').css('cursor', 'default');
        }
    };

    ++asyncMessageCounter;
    $('body').css('cursor', 'progress');

    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState === 4) {
            if (--asyncMessageCounter === 0) {
                $('body').css('cursor', 'default');
            }

            if (xmlHttp.status === 200 || xmlHttp.status === 201) {
                var s = xmlHttp.responseText;
                if (s === '') {
                    return;
                }

                if (callback) {
                    callback(s);
                }
            }
        }
    };

    xmlHttp.open('GET', spark.localhost + url + '?' + queryString, true);
    xmlHttp.send(null);
}



