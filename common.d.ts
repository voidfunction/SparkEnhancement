declare var spark: SparkInfo;

interface ISparkJobData {
    inputs: Array<Array<string>>;
    outputs: Array<Array<string>>;
}

interface IApplicationMasterLogs {
    stderr: string;
    stdout: string;
    directoryInfo: string;
}

interface SparkInfo {
    data: ISparkJobData;
    appId: string;
    attempId: string;
    applicationName: string;
    clusterName: string;
    localhost:string;
    logs: IApplicationMasterLogs;
}